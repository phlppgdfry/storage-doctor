import { createHash } from "node:crypto";
import { expect } from "./adapter.js";

export function payload(seed) {
  return Buffer.concat([
    Buffer.from([0, 255, 128]),
    createHash("sha256").update(seed).digest(),
    Buffer.from("storage doctor\n"),
  ]);
}
const same = (actual, expected) =>
  expect(
    actual.equals(expected),
    "Downloaded bytes must exactly match uploaded bytes.",
  );
export const scenarios = [
  {
    id: "s3-roundtrip",
    title: "S3 byte-exact roundtrip",
    protocols: ["s3"],
    async run(a, k, b) {
      await a.put(k, b);
      same((await a.get(k)).bytes, b);
    },
  },
  {
    id: "s3-empty",
    title: "Zero-byte object",
    protocols: ["s3"],
    async run(a, k) {
      await a.put(k, Buffer.alloc(0));
      same((await a.get(k)).bytes, Buffer.alloc(0));
    },
  },
  {
    id: "s3-path",
    title: "Allowed spaces and URL-sensitive characters in keys",
    protocols: ["s3"],
    async run(a, k, b) {
      k += "/encoding + ? & =.bin";
      await a.put(k, b);
      same((await a.get(k)).bytes, b);
    },
  },
  {
    id: "s3-range",
    title: "S3 partial read",
    protocols: ["s3"],
    async run(a, k, b) {
      await a.put(k, b);
      const r = await a.get(k, { Range: "bytes=2-9" });
      expect(
        r.$metadata.httpStatusCode === 206,
        "A range response must be 206.",
      );
      expect(
        r.ContentRange === `bytes 2-9/${b.length}`,
        "Content-Range must match requested slice.",
      );
      same(r.bytes, b.subarray(2, 10));
    },
  },
  {
    id: "s3-metadata",
    title: "Content type and user metadata roundtrip",
    protocols: ["s3"],
    async run(a, k, b) {
      await a.put(k, b, {
        ContentType: "application/octet-stream",
        Metadata: { doctor: "verified" },
      });
      const r = await a.head(k);
      expect(
        r.ContentType === "application/octet-stream",
        "Content type must roundtrip.",
      );
      expect(
        r.Metadata?.doctor === "verified",
        "User metadata must roundtrip.",
      );
      expect(r.ContentLength === b.length, "HEAD size must match bytes.");
    },
  },
  {
    id: "rest-to-s3",
    title: "REST upload visible through S3",
    protocols: ["rest", "s3"],
    async run(a, k, b) {
      await a.restPut(k, b);
      same((await a.get(k)).bytes, b);
    },
  },
  {
    id: "s3-to-rest",
    title: "S3 upload visible through REST",
    protocols: ["s3", "rest"],
    async run(a, k, b) {
      await a.put(k, b);
      same(a.ok(await a.restGet(k), [200]).bytes, b);
    },
  },
  {
    id: "rest-overwrite-s3",
    title: "REST overwrite visible through S3",
    protocols: ["rest", "s3"],
    async run(a, k, b) {
      await a.put(k, b);
      const next = Buffer.concat([b, Buffer.from("replacement")]);
      await a.restPut(k, next, true);
      same((await a.get(k)).bytes, next);
    },
  },
  {
    id: "s3-delete-rest",
    title: "S3 deletion visible through REST",
    protocols: ["s3", "rest"],
    async run(a, k, b) {
      await a.put(k, b);
      a.ok(await a.restGet(k), [200]);
      await a.delete(k);
      const r = await a.restGet(k);
      expect(
        [400, 404].includes(r.status),
        "Deleted object must be absent through REST.",
      );
      if (r.status === 400) {
        let body;
        try {
          body = JSON.parse(r.bytes);
        } catch {}
        expect(
          String(body?.statusCode) === "404",
          "A REST 400 must explicitly describe storage status 404.",
        );
      }
    },
  },
  {
    id: "tus-resume-cross",
    title: "TUS offset resume then REST/S3 byte verification",
    protocols: ["tus", "rest", "s3"],
    async run(a, k, b) {
      // Supabase requires 6 MiB chunks except the final chunk.
      const first = Buffer.alloc(6 * 1024 * 1024, 0x61),
        full = Buffer.concat([first, b]);
      const url = await a.tusCreate(k, full.length);
      await a.tusHead(url, 0);
      await a.tusPatch(url, 0, first);
      await a.tusHead(url, first.length);
      await a.tusPatch(url, first.length, b);
      a.uploads.delete(url); // Completed upload is cleaned as an object, not an active upload.
      same((await a.get(k)).bytes, full);
      same(a.ok(await a.restGet(k), [200]).bytes, full);
    },
  },
];
