export function localUrl(value) {
  const url = new URL(value);
  // Literal addresses avoid DNS rebinding. No remote mode in this release.
  if (
    !["127.0.0.1", "[::1]"].includes(url.hostname) ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Endpoints must use literal loopback addresses without credentials, query or fragment.",
    );
  }
  return url.href.replace(/\/$/, "");
}

export function loadConfig(env = process.env) {
  const profile = env.SD_PROFILE || "supabase";
  if (!["supabase", "s3"].includes(profile))
    throw new Error("SD_PROFILE must be supabase or s3.");
  const bucket = env.SD_BUCKET || "storage-doctor-test";
  if (!/^(storage-doctor-|sd-)[a-z0-9-]+$/.test(bucket) || bucket.length > 63) {
    throw new Error("Use a dedicated bucket named storage-doctor-* or sd-*.");
  }
  const base = localUrl(env.SD_REST_URL || "http://127.0.0.1:54321/storage/v1");
  const timeoutMs = Number(env.SD_TIMEOUT_MS || 5000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000)
    throw new Error("SD_TIMEOUT_MS must be 100..30000.");
  const accessKeyId = env.SD_ACCESS_KEY_ID;
  const secretAccessKey = env.SD_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey)
    throw new Error("Set SD_ACCESS_KEY_ID and SD_SECRET_ACCESS_KEY.");
  if (profile === "supabase" && !env.SD_TOKEN)
    throw new Error("Set SD_TOKEN for REST/TUS authentication.");
  const seed = env.SD_SEED || "storage-doctor-v1";
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(seed))
    throw new Error(
      "SD_SEED must be 1..64 alphanumeric, dash or underscore characters.",
    );
  const targetVersion = env.SD_TARGET_VERSION || "unrecorded";
  if (!/^[a-zA-Z0-9._:@/-]{1,160}$/.test(targetVersion))
    throw new Error(
      "SD_TARGET_VERSION must be a version, image digest or commit.",
    );
  return {
    profile,
    bucket,
    seed,
    targetVersion,
    timeoutMs,
    restUrl: base,
    s3Url: localUrl(env.SD_S3_URL || `${base}/s3`),
    tusUrl: localUrl(env.SD_TUS_URL || `${base}/upload/resumable`),
    region: env.SD_REGION || "us-east-1",
    token: env.SD_TOKEN,
    apiKey: env.SD_API_KEY,
    credentials: {
      accessKeyId,
      secretAccessKey,
      ...(env.SD_SESSION_TOKEN ? { sessionToken: env.SD_SESSION_TOKEN } : {}),
    },
  };
}

export function publicConfig(c) {
  // Allowlist only. Never serialize tokens, access keys, raw environment or error bodies.
  return Object.fromEntries(
    [
      "profile",
      "bucket",
      "seed",
      "targetVersion",
      "timeoutMs",
      "restUrl",
      "s3Url",
      "tusUrl",
    ].map((k) => [k, c[k]]),
  );
}
