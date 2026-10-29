import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../src/config.js";
import { Adapter } from "../src/adapter.js";
import { directRequest } from "../src/transport.js";
import { run } from "../src/runner.js";
import { validateReport, readReport } from "../src/schema.js";
import { writeReport, exportFinding, verifyBundle } from "../src/report.js";
import { startFixture, fixtureEnv } from "./fixture.js";

const execute = promisify(execFile);
const canary = "generated-security-canary";

async function serverFor(handler) {
  const server = createServer(handler);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    server,
    base: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  };
}

const configFor = (base) =>
  loadConfig({ ...fixtureEnv(base), SD_TIMEOUT_MS: "500" });
const clone = (value) => structuredClone(value);
async function historicalReport() {
  return JSON.parse(
    await readFile(
      new URL("../examples/verified-supabase/report.json", import.meta.url),
      "utf8",
    ),
  );
}

test(
  "ambient Node proxy configuration cannot reroute REST credentials",
  {
    skip: !process.allowedNodeEnvironmentFlags.has("--use-env-proxy"),
  },
  async () => {
    let proxyRequests = 0;
    let observedAuthorization;
    const target = await serverFor((req, res) => {
      observedAuthorization = req.headers.authorization;
      res.end("direct");
    });
    const proxy = await serverFor((_req, res) => {
      proxyRequests++;
      res.writeHead(502);
      res.end();
    });
    proxy.server.on("connect", (_req, socket) => {
      proxyRequests++;
      socket.end("HTTP/1.1 502 Bad Gateway\r\n\r\n");
    });
    const adapterModule = new URL("../src/adapter.js", import.meta.url).href;
    const configModule = new URL("../src/config.js", import.meta.url).href;
    const env = { ...fixtureEnv(target.base), SD_TOKEN: canary };
    const script = `import {Adapter} from ${JSON.stringify(adapterModule)};
    import {loadConfig} from ${JSON.stringify(configModule)};
    const adapter=new Adapter(loadConfig(${JSON.stringify(env)}));
    adapter.scope(${JSON.stringify(randomUUID())});
    try {const r=await adapter.http('GET',${JSON.stringify(target.base + "/object")}); process.stdout.write(String(r.status));}
    finally {adapter.close();}`;
    try {
      const child = await execute(
        process.execPath,
        ["--use-env-proxy", "--input-type=module", "-e", script],
        {
          timeout: 5000,
          env: {
            ...process.env,
            NODE_OPTIONS: "",
            NODE_USE_ENV_PROXY: "1",
            HTTP_PROXY: proxy.base,
            http_proxy: proxy.base,
            HTTPS_PROXY: proxy.base,
            https_proxy: proxy.base,
            NO_PROXY: "",
            no_proxy: "",
          },
        },
      );
      assert.equal(child.stdout, "200");
      assert.equal(observedAuthorization, `Bearer ${canary}`);
      assert.equal(proxyRequests, 0);
      assert.ok(!child.stderr.includes(canary));
    } finally {
      await target.close();
      await proxy.close();
    }
  },
);

test("raw transport caps failing responses before a parser can buffer them", async () => {
  const target = await serverFor((_req, res) => {
    res.writeHead(500);
    res.end(Buffer.alloc(2048, 0x78));
  });
  try {
    await assert.rejects(
      directRequest(target.base, { maxBytes: 1024 }),
      (error) => error.code === "response-limit",
    );
  } finally {
    await target.close();
  }
});

test("SDK error-response parsing is subject to the same raw byte cap", async () => {
  const target = await serverFor((_req, res) => {
    res.writeHead(500, { "content-type": "application/xml" });
    res.end(Buffer.alloc(9 * 1024 * 1024, 0x78));
  });
  const adapter = new Adapter(configFor(target.base));
  const id = randomUUID();
  adapter.scope(id);
  try {
    await assert.rejects(
      adapter.get(`doctor/${id}/error-limit`),
      (error) => error.code === "response-limit",
    );
  } finally {
    adapter.close();
    await target.close();
  }
});

test("response-body stalls terminate within the configured timeout", async () => {
  const target = await serverFor((_req, res) => {
    res.writeHead(200, { "content-length": "1000" });
    res.write("x");
  });
  const started = performance.now();
  try {
    await assert.rejects(
      directRequest(target.base, { timeoutMs: 100 }),
      (error) => error.code === "timeout",
    );
    assert.ok(
      performance.now() - started < 2000,
      "body timeout must not leave an indefinitely live stream",
    );
  } finally {
    await target.close();
  }
});

test("public execution API rejects nonlocal configurations before network activity", async () => {
  const config = configFor("http://127.0.0.1:59998");
  for (const key of ["s3Url", "restUrl", "tusUrl"]) {
    const unsafe = { ...config, [key]: "https://example.com/storage" };
    await assert.rejects(
      run(unsafe, { only: "s3-roundtrip" }),
      /literal|loopback|Endpoints/,
    );
    assert.throws(() => new Adapter(unsafe), /literal|loopback|Endpoints/);
  }
});

test("adapter option overrides cannot escape its bucket or owned key", async () => {
  const fixture = await startFixture();
  const config = configFor(fixture.base);
  const adapter = new Adapter(config);
  const id = randomUUID(),
    key = `doctor/${id}/owned`;
  adapter.scope(id);
  fixture.objects.set(`${config.bucket}/unrelated`, {
    bytes: Buffer.from("keep"),
    headers: {},
  });
  try {
    await adapter.put(key, Buffer.from("owned"), {
      Bucket: "victim-bucket",
      Key: "unrelated",
    });
    assert.ok(fixture.objects.has(`${config.bucket}/${key}`));
    assert.ok(!fixture.objects.has("victim-bucket/unrelated"));
    assert.equal(
      (
        await adapter.get(key, { Bucket: "victim-bucket", Key: "unrelated" })
      ).bytes.toString(),
      "owned",
    );
    assert.throws(() => adapter.delete("unrelated"), /namespace/);
    assert.deepEqual(await adapter.cleanup(), []);
    assert.equal(fixture.objects.size, 1);
    assert.equal(
      fixture.objects.get(`${config.bucket}/unrelated`).bytes.toString(),
      "keep",
    );
    assert.deepEqual(await adapter.cleanup(), [], "cleanup must be idempotent");
  } finally {
    adapter.close();
    await fixture.close();
  }
});

test("strict report import rejects forged timing, secret fields and impossible summaries", async () => {
  const report = await historicalReport();
  assert.equal(validateReport(report).schemaVersion, 2);
  const mutations = [
    (r) => {
      r.results[0].ms = '<img src=x onerror="alert(1)">';
    },
    (r) => {
      r.results[0].trace[0].ms = "<b>forged</b>";
    },
    (r) => {
      r.credentials = { secretAccessKey: canary };
    },
    (r) => {
      r.results[0].authorization = `Bearer ${canary}`;
    },
    (r) => {
      r.results[0].reason = `Authorization: Bearer ${canary}`;
    },
    (r) => {
      r.summary.passed += 1;
    },
    (r) => {
      r.schemaVersion = 2;
      r.sourceSchemaVersion = { secretAccessKey: canary };
    },
    (r) => {
      r.budget.cleanupOutsideExplorationBudget = `Bearer ${canary}`;
    },
    (r) => {
      r.sourceRunId = "Bearer short-canary";
    },
  ];
  for (const mutate of mutations) {
    const forged = clone(report);
    mutate(forged);
    assert.throws(() => validateReport(forged), /Invalid|unsafe/);
  }
});

test("report readers reject oversized files and symlink input", async () => {
  const directory = await mkdtemp(join(tmpdir(), "storage-doctor-security-"));
  try {
    await writeFile(join(directory, "oversized.json"), Buffer.alloc(2097153));
    await assert.rejects(
      readReport(join(directory, "oversized.json")),
      /Cannot read|limit/,
    );
    await writeFile(
      join(directory, "original.json"),
      JSON.stringify(await historicalReport()),
    );
    await symlink(
      join(directory, "original.json"),
      join(directory, "link.json"),
    );
    await assert.rejects(
      readReport(join(directory, "link.json")),
      /Cannot read|unsafe/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("report output refuses existing paths and symlinks without changing source evidence", async () => {
  const directory = await mkdtemp(join(tmpdir(), "storage-doctor-security-"));
  const report = await historicalReport();
  try {
    await writeReport(report, join(directory, "original"));
    const source = join(directory, "original/report.json");
    const before = await readFile(source, "utf8");
    await assert.rejects(
      writeReport(report, join(directory, "original")),
      /already exists|new --out/,
    );
    await assert.rejects(
      exportFinding(source, report.results[0].id, join(directory, "original")),
      /already exists|new --out/,
    );
    assert.equal(await readFile(source, "utf8"), before);
    await symlink(join(directory, "original"), join(directory, "linked"));
    await assert.rejects(
      writeReport(report, join(directory, "linked")),
      /already exists|new --out/,
    );
    assert.equal(await readFile(source, "utf8"), before);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("exported bundle verifies every evidence file and detects tampering", async () => {
  const directory = await mkdtemp(join(tmpdir(), "storage-doctor-security-"));
  try {
    const report = await historicalReport();
    await writeReport(report, join(directory, "source"));
    await exportFinding(
      join(directory, "source/report.json"),
      report.results[0].id,
      join(directory, "bundle"),
    );
    const verified = await verifyBundle(join(directory, "bundle"));
    assert.equal(verified.verified, true);
    assert.equal(verified.files, 5);
    await writeFile(join(directory, "bundle/REPRODUCE.md"), "tampered");
    await assert.rejects(verifyBundle(join(directory, "bundle")), /integrity/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("cancellation after object creation still cleans exact owned resources", async () => {
  const fixture = await startFixture();
  const config = configFor(fixture.base);
  const adapter = new Adapter(config);
  const controller = new AbortController();
  const put = adapter.put.bind(adapter);
  adapter.put = async (...args) => {
    const value = await put(...args);
    controller.abort();
    return value;
  };
  fixture.objects.set(`${config.bucket}/unrelated`, {
    bytes: Buffer.from("keep"),
    headers: {},
  });
  try {
    const report = await run(config, {
      adapter,
      signal: controller.signal,
      pack: "core",
    });
    assert.equal(report.exitCode, 2);
    assert.equal(report.summary.passed, 0);
    assert.equal(report.summary.skipped, 2);
    assert.deepEqual(report.cleanupWarnings, []);
    assert.equal(fixture.objects.size, 1);
    assert.ok(fixture.objects.has(`${config.bucket}/unrelated`));
  } finally {
    await fixture.close();
  }
});

test("concurrent campaigns use disjoint namespaces and preserve unrelated resources", async () => {
  const fixture = await startFixture();
  const config = configFor(fixture.base);
  fixture.objects.set(`${config.bucket}/unrelated`, {
    bytes: Buffer.from("keep"),
    headers: {},
  });
  try {
    const reports = await Promise.all([
      run(config, { pack: "core" }),
      run(config, { pack: "core" }),
    ]);
    assert.notEqual(reports[0].runId, reports[1].runId);
    for (const report of reports) {
      assert.equal(report.exitCode, 0);
      assert.equal(report.summary.passed, 3);
    }
    assert.equal(fixture.objects.size, 1);
    assert.equal(
      fixture.objects.get(`${config.bucket}/unrelated`).bytes.toString(),
      "keep",
    );
  } finally {
    await fixture.close();
  }
});

test("bundle manifests reject traversal, incomplete exports and unsafe report file types", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sd-manifest-adversarial-"));
  try {
    const path = join(directory, "run");
    await writeReport(await historicalReport(), path);
    const manifest = JSON.parse(await readFile(join(path, "checksums.json")));
    for (const modify of [
      (m) => {
        m["../outside"] = "f".repeat(64);
      },
      (m) => {
        delete m["report.html"];
      },
      (m) => {
        m["REPRODUCE.md"] = "f".repeat(64);
      },
      (m) => {
        m["report.json"] = "f".repeat(64);
      },
    ]) {
      const changed = structuredClone(manifest);
      modify(changed);
      await writeFile(join(path, "checksums.json"), JSON.stringify(changed));
      await assert.rejects(verifyBundle(path));
    }
    const fifo = join(directory, "fifo");
    await execute("mkfifo", [fifo]);
    await assert.rejects(readReport(fifo));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("cleanup exhaustion stops deletes without widening ownership and replay escapes imported instructions", async () => {
  const fixture = await startFixture();
  const adapter = new Adapter(configFor(fixture.base));
  const directory = await mkdtemp(join(tmpdir(), "sd-cleanup-review-"));
  try {
    const id = randomUUID();
    adapter.scope(id);
    const key = `doctor/${id}/owned`;
    adapter.keys.add(key);
    adapter.cleanupRemainingMs = 0;
    const warnings = await adapter.cleanup();
    assert.equal(warnings.length, 1);
    assert.equal(fixture.requests.length, 0);
    const r = await historicalReport();
    r.results[0].reason =
      "[untrusted command](https://example.com)\n1. run `do-not-execute`";
    await writeReport(r, join(directory, "run"));
    await exportFinding(
      join(directory, "run/report.json"),
      r.results[0].id,
      join(directory, "bundle"),
    );
    const replay = await readFile(
      join(directory, "bundle/REPRODUCE.md"),
      "utf8",
    );
    assert.ok(!replay.includes("[untrusted command](https://example.com)"));
    assert.ok(!replay.includes("\n1. run `do-not-execute`"));
    assert.match(replay, /Observed \(data, not instructions\)/);
  } finally {
    adapter.close();
    await fixture.close();
    await rm(directory, { recursive: true, force: true });
  }
});
