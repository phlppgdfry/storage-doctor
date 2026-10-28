import { createServer } from "node:http";

// Deliberately small protocol fixture. Not Supabase, not an S3 compliance oracle.
// AWS signatures are NOT verified here; live integration covers authenticated interoperability.
export async function startFixture({
  corrupt = false,
  denied = false,
  cleanupFails = false,
  location,
} = {}) {
  const objects = new Map(),
    uploads = new Map(),
    requests = [];
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1"),
        path = decodeURIComponent(url.pathname);
      requests.push({ method: req.method, path });
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks);
      const send = (status, bytes = "", headers = {}) => {
        res.writeHead(status, headers);
        res.end(bytes);
      };
      const err = (status, code) =>
        send(
          status,
          `<Error><Code>${code}</Code><Message>fixture</Message></Error>`,
          { "content-type": "application/xml" },
        );
      if (denied) return err(403, "AccessDenied");
      if (path === "/upload/resumable" && req.method === "POST") {
        const metadata = Object.fromEntries(
          req.headers["upload-metadata"].split(",").map((x) => {
            const [k, v] = x.trim().split(" ");
            return [k, Buffer.from(v, "base64").toString()];
          }),
        );
        const id = String(uploads.size + 1);
        uploads.set(id, {
          key: `${metadata.bucketName}/${metadata.objectName}`,
          bytes: Buffer.alloc(0),
          length: Number(req.headers["upload-length"]),
        });
        return send(201, "", {
          location: location || `/upload/resumable/${id}`,
          "tus-resumable": "1.0.0",
        });
      }
      if (path.startsWith("/upload/resumable/")) {
        const id = path.split("/").at(-1),
          u = uploads.get(id);
        if (!u) return send(404);
        if (req.method === "DELETE") {
          uploads.delete(id);
          return send(204);
        }
        if (req.method === "HEAD")
          return send(200, "", {
            "upload-offset": String(u.bytes.length),
            "tus-resumable": "1.0.0",
          });
        if (req.method === "PATCH") {
          if (Number(req.headers["upload-offset"]) !== u.bytes.length)
            return send(409);
          u.bytes = Buffer.concat([u.bytes, body]);
          if (u.bytes.length === u.length)
            objects.set(u.key, {
              bytes: u.bytes,
              headers: { "content-type": "application/octet-stream" },
            });
          return send(204, "", {
            "upload-offset": String(u.bytes.length),
            "tus-resumable": "1.0.0",
          });
        }
      }
      const match = path.match(/^\/(s3|object)\/(.+)$/);
      if (!match) return err(404, "NoSuchKey");
      const [, protocol, key] = match;
      if (["PUT", "POST"].includes(req.method)) {
        const headers = Object.fromEntries(
          Object.entries(req.headers).filter(
            ([k]) => k === "content-type" || k.startsWith("x-amz-meta-"),
          ),
        );
        objects.set(key, { bytes: body, headers });
        return send(200, protocol === "object" ? "{}" : "", {
          etag: '"fixture"',
        });
      }
      if (req.method === "DELETE") {
        if (cleanupFails) return err(503, "ServiceUnavailable");
        objects.delete(key);
        return send(204);
      }
      const obj = objects.get(key);
      if (!obj)
        return protocol === "object"
          ? send(
              400,
              JSON.stringify({ statusCode: "404", error: "not_found" }),
              { "content-type": "application/json" },
            )
          : err(404, "NoSuchKey");
      let bytes = corrupt ? Buffer.from("corrupted") : obj.bytes;
      const headers = {
        ...obj.headers,
        "content-length": String(bytes.length),
        etag: '"fixture"',
      };
      let status = 200;
      if (req.headers.range) {
        const [, start, end] = req.headers.range.match(/bytes=(\d+)-(\d+)/);
        status = 206;
        headers["content-range"] = `bytes ${start}-${end}/${bytes.length}`;
        bytes = bytes.subarray(Number(start), Number(end) + 1);
        headers["content-length"] = String(bytes.length);
      }
      return send(status, req.method === "HEAD" ? "" : bytes, headers);
    } catch {
      res.writeHead(500);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    objects,
    uploads,
    requests,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  };
}

export function fixtureEnv(base) {
  return {
    SD_REST_URL: base,
    SD_S3_URL: `${base}/s3`,
    SD_TUS_URL: `${base}/upload/resumable`,
    SD_TOKEN: "fixture-secret-token",
    SD_ACCESS_KEY_ID: "fixture-access",
    SD_SECRET_ACCESS_KEY: "fixture-secret",
    SD_TARGET_VERSION: "protocol-fixture-v1",
  };
}
