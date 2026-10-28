import http from "node:http";
import https from "node:https";
import { localUrl } from "./config.js";

export class TransportError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

// One direct socket per request. Never global fetch, proxy agents, DNS or redirects.
// Buffer BEFORE giving data to SDK parsers so error responses have the same bound.
export function directRequest(
  value,
  {
    method = "GET",
    headers = {},
    body,
    timeoutMs = 5000,
    signal,
    maxBytes = 8388608,
  } = {},
) {
  if (
    body !== undefined &&
    !(typeof body === "string" || body instanceof Uint8Array)
  )
    throw new TransportError("body-type");
  if (body !== undefined && Buffer.byteLength(body) > 8388608)
    throw new TransportError("request-limit");
  const url = new URL(value);
  const checked = new URL(url);
  checked.search = "";
  localUrl(checked.href);
  return new Promise((resolve, reject) => {
    let done = false,
      request,
      response;
    const finish = (error, result) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (error) {
        response?.destroy();
        request?.destroy();
        reject(error);
      } else resolve(result);
    };
    const abort = () => finish(new TransportError("aborted"));
    const timer = setTimeout(
      () => finish(new TransportError("timeout")),
      timeoutMs,
    );
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    try {
      request = (url.protocol === "https:" ? https : http).request(
        url,
        {
          method,
          headers,
          agent: false,
          rejectUnauthorized: true,
          maxHeaderSize: 16384,
        },
        (res) => {
          response = res;
          let size = 0;
          const chunks = [];
          res.on("data", (chunk) => {
            size += chunk.length;
            if (size > maxBytes) finish(new TransportError("response-limit"));
            else chunks.push(chunk);
          });
          res.on("end", () =>
            finish(null, {
              status: res.statusCode,
              headers: new Headers(
                Object.fromEntries(
                  Object.entries(res.headers).map(([k, v]) => [
                    k,
                    Array.isArray(v) ? v.join(", ") : (v ?? ""),
                  ]),
                ),
              ),
              bytes: Buffer.concat(chunks),
            }),
          );
          res.on("error", () => finish(new TransportError("network")));
          res.on("aborted", () => finish(new TransportError("network")));
        },
      );
      request.on("socket", (socket) => {
        const verify = () => {
          const expected = url.hostname === "[::1]" ? "::1" : "127.0.0.1";
          if (
            socket.remoteAddress !== expected &&
            !(
              expected === "127.0.0.1" &&
              socket.remoteAddress === "::ffff:127.0.0.1"
            )
          )
            finish(new TransportError("destination"));
        };
        socket.once("connect", verify);
      });
      request.on("error", () => finish(new TransportError("network")));
      request.end(body);
    } catch {
      finish(new TransportError("network"));
    }
  });
}
