export class ConfigurationError extends Error {}
export function localUrl(value) {
  if (
    typeof value !== "string" ||
    !/^https?:\/\/(?:127\.0\.0\.1|\[::1\])(?::[0-9]+)?(?:\/|$)/.test(value)
  )
    throw new ConfigurationError(
      "Endpoints require a literal 127.0.0.1 or [::1] address.",
    );
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
    throw new ConfigurationError(
      "Endpoints must use literal loopback addresses without credentials, query or fragment.",
    );
  }
  return url.href.replace(/\/$/, "");
}

export function loadConfig(env = process.env) {
  const profile = env.SD_PROFILE || "supabase";
  if (!["supabase", "s3"].includes(profile))
    throw new ConfigurationError("SD_PROFILE must be supabase or s3.");
  const bucket = env.SD_BUCKET || "storage-doctor-test";
  if (!/^(storage-doctor-|sd-)[a-z0-9-]+$/.test(bucket) || bucket.length > 63) {
    throw new ConfigurationError(
      "Use a dedicated bucket named storage-doctor-* or sd-*.",
    );
  }
  const base = localUrl(env.SD_REST_URL || "http://127.0.0.1:54321/storage/v1");
  const timeoutMs = Number(env.SD_TIMEOUT_MS || 5000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000)
    throw new ConfigurationError("SD_TIMEOUT_MS must be 100..30000.");
  const accessKeyId = env.SD_ACCESS_KEY_ID;
  const secretAccessKey = env.SD_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey)
    throw new ConfigurationError(
      "Set SD_ACCESS_KEY_ID and SD_SECRET_ACCESS_KEY.",
    );
  if (profile === "supabase" && !env.SD_TOKEN)
    throw new ConfigurationError("Set SD_TOKEN for REST/TUS authentication.");
  const seed = env.SD_SEED || "storage-doctor-v1";
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(seed))
    throw new ConfigurationError(
      "SD_SEED must be 1..64 alphanumeric, dash or underscore characters.",
    );
  const targetVersion = env.SD_TARGET_VERSION || "unrecorded";
  if (!/^[a-zA-Z0-9._:@/-]{1,160}$/.test(targetVersion))
    throw new ConfigurationError(
      "SD_TARGET_VERSION must be a version, image digest or commit.",
    );
  const authContext = env.SD_AUTH_CONTEXT || "unrecorded";
  if (
    !/^[a-zA-Z0-9_-]{1,64}$/.test(authContext) ||
    /(?:sb_secret_|AKIA[A-Z0-9]{12,})/i.test(authContext)
  )
    throw new ConfigurationError(
      "SD_AUTH_CONTEXT must be a non-secret 1..64 character capability/policy label (letters, digits, dash, underscore).",
    );
  return {
    authContext,
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
      "authContext",
      "profile",
      "bucket",
      "seed",
      "targetVersion",
      "timeoutMs",
      "region",
      "restUrl",
      "s3Url",
      "tusUrl",
    ].map((k) => [k, c[k]]),
  );
}

export function validateConfig(c) {
  return loadConfig({
    SD_AUTH_CONTEXT: c.authContext,
    SD_PROFILE: c.profile,
    SD_BUCKET: c.bucket,
    SD_REST_URL: c.restUrl,
    SD_S3_URL: c.s3Url,
    SD_TUS_URL: c.tusUrl,
    SD_TIMEOUT_MS: String(c.timeoutMs),
    SD_ACCESS_KEY_ID: c.credentials?.accessKeyId,
    SD_SECRET_ACCESS_KEY: c.credentials?.secretAccessKey,
    SD_SESSION_TOKEN: c.credentials?.sessionToken,
    SD_TOKEN: c.token,
    SD_API_KEY: c.apiKey,
    SD_REGION: c.region,
    SD_SEED: c.seed,
    SD_TARGET_VERSION: c.targetVersion,
  });
}
