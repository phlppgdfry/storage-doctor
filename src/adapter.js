import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { directRequest, TransportError } from "./transport.js";
import { localUrl, validateConfig } from "./config.js";

export class CheckFailure extends Error {}
export class BudgetError extends Error {}
export class HarnessError extends Error {}
export class ObservationError extends Error {
  constructor(status, code = "http") {
    super(`HTTP ${status}`);
    this.status = status;
    this.code = code;
  }
}
export function expect(value, message) {
  if (!value) throw new CheckFailure(message);
}

export class Adapter {
  constructor(config) {
    this.config = validateConfig(config);
    config = this.config;
    this.prefix = null;
    this.trace = [];
    this.keys = new Set();
    this.uploads = new Set();
    this.deadline = performance.now() + 120000;
    this.requests = 0;
    this.cleaning = false;
    this.cleanupRemainingMs = 30000;
    this.client = new S3Client({
      endpoint: config.s3Url,
      region: config.region,
      credentials: config.credentials,
      forcePathStyle: true,
      maxAttempts: 1,
      followRegionRedirects: false,
      requestHandler: {
        handle: async (request, { abortSignal } = {}) => {
          const url = new URL(
            `${request.protocol}//${request.hostname.includes(":") && !request.hostname.startsWith("[") ? `[${request.hostname}]` : request.hostname}${request.port ? `:${request.port}` : ""}${request.path}`,
          );
          for (const [key, value] of Object.entries(request.query || {}))
            for (const v of Array.isArray(value) ? value : [value])
              url.searchParams.append(key, v ?? "");
          const response = await directRequest(url.href, {
            method: request.method,
            headers: request.headers,
            body: request.body,
            timeoutMs: this.remainingTimeout(),
            signal: this.cleaning
              ? abortSignal
              : AbortSignal.any([
                  abortSignal || AbortSignal.timeout(this.remainingTimeout()),
                  ...(this.signal ? [this.signal] : []),
                ]),
          });
          return {
            response: {
              statusCode: response.status,
              headers: Object.fromEntries(response.headers),
              body: Readable.from([response.bytes]),
            },
          };
        },
        destroy() {},
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  scope(runId, signal) {
    this.signal = signal;
    if (this.keys.size || this.uploads.size || !/^[0-9a-f-]{36}$/.test(runId))
      throw new HarnessError("Invalid run scope.");
    this.prefix = `doctor/${runId}/`;
  }
  owned(key) {
    if (
      !this.prefix ||
      typeof key !== "string" ||
      !key.startsWith(this.prefix) ||
      key.split("/").some((p) => p === "." || p === "..") ||
      key.length > 1024
    )
      throw new HarnessError("Operation outside owned namespace.");
  }
  remainingTimeout() {
    return Math.max(
      1,
      Math.min(
        this.config.timeoutMs,
        (this.cleaning ? this.cleanupDeadline : this.deadline) -
          performance.now(),
      ),
    );
  }
  budget() {
    if (
      !this.cleaning &&
      (performance.now() > this.deadline ||
        this.requests >= 80 ||
        this.signal?.aborted)
    )
      throw new BudgetError("Exploration budget exhausted.");
    if (this.cleaning && performance.now() > this.cleanupDeadline)
      throw new BudgetError("Cleanup budget exhausted.");
    this.requests++;
  }
  async s3(Command, input) {
    this.budget();
    const start = performance.now();
    try {
      const result = await this.client.send(
        new Command({ ...input, Bucket: this.config.bucket }),
        { abortSignal: AbortSignal.timeout(this.remainingTimeout()) },
      );
      if (result.Body) {
        const chunks = [];
        let total = 0;
        for await (const chunk of result.Body) {
          total += chunk.length;
          if (total > 8 * 1024 * 1024) {
            result.Body.destroy();
            throw new Error("Response limit");
          }
          chunks.push(chunk);
        }
        result.bytes = Buffer.concat(chunks);
      }
      this.trace.push({
        protocol: "s3",
        operation: Command.name,
        status: result.$metadata.httpStatusCode,
        ms: Math.round(performance.now() - start),
      });
      return result;
    } catch (error) {
      const status = error.$metadata?.httpStatusCode;
      this.trace.push({
        protocol: "s3",
        operation: Command.name,
        status: status || null,
        ms: Math.round(performance.now() - start),
      });
      if (error instanceof BudgetError || error instanceof HarnessError)
        throw error;
      throw new ObservationError(
        status || 0,
        error instanceof TransportError ? error.code : "http",
      );
    }
  }
  put(key, bytes, extra = {}) {
    this.owned(key);
    this.keys.add(key);
    return this.s3(PutObjectCommand, { ...extra, Key: key, Body: bytes });
  }
  get(key, extra = {}) {
    this.owned(key);
    return this.s3(GetObjectCommand, { ...extra, Key: key });
  }
  head(key) {
    this.owned(key);
    return this.s3(HeadObjectCommand, { Key: key });
  }
  delete(key) {
    this.owned(key);
    return this.s3(DeleteObjectCommand, { Key: key });
  }
  async http(method, url, headers = {}, body) {
    this.budget();
    localUrl(url);
    const start = performance.now();
    let status = 0;
    try {
      const response = await directRequest(url, {
        method,
        body,
        timeoutMs: this.remainingTimeout(),
        signal: this.cleaning ? undefined : this.signal,
        headers: {
          authorization: `Bearer ${this.config.token}`,
          ...(this.config.apiKey ? { apikey: this.config.apiKey } : {}),
          ...headers,
        },
      });
      status = response.status;
      if (status >= 300 && status < 400)
        throw new ObservationError(status, "redirect");
      return response;
    } catch (error) {
      if (error instanceof ObservationError) throw error;
      throw new ObservationError(
        status,
        error instanceof TransportError ? error.code : "network",
      );
    } finally {
      this.trace.push({
        protocol: url.startsWith(this.config.tusUrl) ? "tus" : "rest",
        operation: method,
        status: status || null,
        ms: Math.round(performance.now() - start),
      });
    }
  }
  ok(result, statuses) {
    if (!statuses.includes(result.status))
      throw new ObservationError(result.status);
    return result;
  }
  objectUrl(key) {
    return `${this.config.restUrl}/object/${this.config.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  }
  async restPut(key, bytes, upsert = false) {
    this.owned(key);
    this.keys.add(key);
    return this.ok(
      await this.http(
        "POST",
        this.objectUrl(key),
        {
          "content-type": "application/octet-stream",
          "x-upsert": String(upsert),
        },
        bytes,
      ),
      [200, 201],
    );
  }
  async restGet(key) {
    this.owned(key);
    return this.http("GET", this.objectUrl(key));
  }
  async tusCreate(key, length) {
    this.owned(key);
    this.keys.add(key);
    const metadata = {
      bucketName: this.config.bucket,
      objectName: key,
      contentType: "application/octet-stream",
      cacheControl: "0",
    };
    const result = this.ok(
      await this.http("POST", this.config.tusUrl, {
        "tus-resumable": "1.0.0",
        "upload-length": String(length),
        "upload-metadata": Object.entries(metadata)
          .map(([k, v]) => `${k} ${Buffer.from(v).toString("base64")}`)
          .join(","),
      }),
      [201],
    );
    const location = result.headers.get("location");
    expect(location, "TUS create must return Location.");
    const url = new URL(location, `${this.config.tusUrl}/`);
    localUrl(url.href);
    expect(
      url.origin === new URL(this.config.tusUrl).origin &&
        url.pathname.startsWith(`${new URL(this.config.tusUrl).pathname}/`),
      "TUS Location must remain inside configured endpoint.",
    );
    this.uploads.add(url.href);
    return url.href;
  }
  async tusPatch(url, offset, bytes) {
    if (!this.uploads.has(url)) throw new HarnessError("Unknown TUS resource.");
    const result = this.ok(
      await this.http(
        "PATCH",
        url,
        {
          "tus-resumable": "1.0.0",
          "upload-offset": String(offset),
          "content-type": "application/offset+octet-stream",
        },
        bytes,
      ),
      [204],
    );
    expect(
      result.headers.get("upload-offset") === String(offset + bytes.length),
      "TUS PATCH offset must equal accepted bytes.",
    );
  }
  async tusHead(url, offset) {
    if (!this.uploads.has(url)) throw new HarnessError("Unknown TUS resource.");
    const result = this.ok(
      await this.http("HEAD", url, { "tus-resumable": "1.0.0" }),
      [200, 204],
    );
    expect(
      result.headers.get("upload-offset") === String(offset),
      "TUS HEAD must preserve offset across requests.",
    );
  }
  async cleanup() {
    this.cleaning = true;
    const cleanupStart = performance.now();
    this.cleanupDeadline = cleanupStart + this.cleanupRemainingMs;
    const warnings = [];
    for (const url of this.uploads) {
      try {
        this.ok(
          await this.http("DELETE", url, { "tus-resumable": "1.0.0" }),
          [204, 404, 410],
        );
        this.uploads.delete(url);
      } catch {
        warnings.push("Could not terminate a run-owned TUS resource.");
      }
    }
    for (const key of this.keys) {
      try {
        await this.delete(key);
        this.keys.delete(key);
      } catch {
        warnings.push(`Could not remove run-owned object: ${key}`);
      }
    }
    this.cleanupRemainingMs = Math.max(
      0,
      this.cleanupRemainingMs - (performance.now() - cleanupStart),
    );
    this.cleaning = false;
    return warnings;
  }
  close() {
    this.client.destroy();
  }
}
