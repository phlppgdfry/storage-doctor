import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { localUrl } from "./config.js";

export class CheckFailure extends Error {}
export class ObservationError extends Error {
  constructor(status) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}
export function expect(value, message) {
  if (!value) throw new CheckFailure(message);
}

export class Adapter {
  constructor(config) {
    this.config = config;
    this.trace = [];
    this.keys = new Set();
    this.uploads = new Set();
    this.deadline = performance.now() + 120000;
    this.requests = 0;
    this.cleaning = false;
    this.client = new S3Client({
      endpoint: config.s3Url,
      region: config.region,
      credentials: config.credentials,
      forcePathStyle: true,
      maxAttempts: 1,
      followRegionRedirects: false,
      requestHandler: new NodeHttpHandler({
        connectionTimeout: config.timeoutMs,
        requestTimeout: config.timeoutMs,
        throwOnRequestTimeout: true,
      }),
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  budget() {
    if (
      !this.cleaning &&
      (performance.now() > this.deadline || this.requests >= 80)
    )
      throw new ObservationError(0);
    this.requests++;
  }
  async s3(Command, input) {
    this.budget();
    const start = performance.now();
    try {
      const result = await this.client.send(
        new Command({ Bucket: this.config.bucket, ...input }),
        { abortSignal: AbortSignal.timeout(this.config.timeoutMs) },
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
      throw new ObservationError(status || 0);
    }
  }
  put(key, bytes, extra = {}) {
    this.keys.add(key);
    return this.s3(PutObjectCommand, { Key: key, Body: bytes, ...extra });
  }
  get(key, extra = {}) {
    return this.s3(GetObjectCommand, { Key: key, ...extra });
  }
  head(key) {
    return this.s3(HeadObjectCommand, { Key: key });
  }
  delete(key) {
    return this.s3(DeleteObjectCommand, { Key: key });
  }
  async http(method, url, headers = {}, body) {
    this.budget();
    localUrl(url);
    const start = performance.now();
    let status = 0;
    try {
      const response = await fetch(url, {
        method,
        body,
        redirect: "error",
        signal: AbortSignal.timeout(this.config.timeoutMs),
        headers: {
          authorization: `Bearer ${this.config.token}`,
          ...(this.config.apiKey ? { apikey: this.config.apiKey } : {}),
          ...headers,
        },
      });
      status = response.status;
      // Bound response memory, including misconfigured local targets.
      const chunks = [];
      let total = 0;
      for await (const chunk of response.body || []) {
        total += chunk.length;
        if (total > 8 * 1024 * 1024) throw new Error("Response limit");
        chunks.push(chunk);
      }
      return {
        status,
        headers: response.headers,
        bytes: Buffer.concat(chunks),
      };
    } catch {
      throw new ObservationError(status);
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
    return this.http("GET", this.objectUrl(key));
  }
  async tusCreate(key, length) {
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
    const warnings = [];
    for (const url of this.uploads) {
      try {
        this.ok(
          await this.http("DELETE", url, { "tus-resumable": "1.0.0" }),
          [204, 404, 410],
        );
      } catch {
        warnings.push("Could not terminate a run-owned TUS resource.");
      }
    }
    for (const key of this.keys) {
      try {
        await this.delete(key);
      } catch {
        warnings.push(`Could not remove run-owned object: ${key}`);
      }
    }
    this.client.destroy();
    return warnings;
  }
}
