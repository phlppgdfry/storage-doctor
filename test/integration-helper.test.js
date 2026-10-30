import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  cp,
  writeFile,
  readFile,
  symlink,
  rm,
  realpath,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execute = promisify(execFile);

test("integration helper passes decoded checkout paths with spaces to Supabase CLI", async () => {
  const checkout = await realpath(
    await mkdtemp(join(tmpdir(), "sd checkout with spaces ")),
  );
  try {
    await mkdir(join(checkout, "scripts"));
    await mkdir(join(checkout, "bin"));
    await cp(
      "scripts/integration.js",
      join(checkout, "scripts/integration.js"),
    );
    await cp("src", join(checkout, "src"), { recursive: true });
    await cp("package.json", join(checkout, "package.json"));
    await symlink(resolve("node_modules"), join(checkout, "node_modules"));
    const captured = join(checkout, "arguments.json");
    // The stub captures arguments then fails before any API or bucket request.
    await writeFile(
      join(checkout, "bin/supabase"),
      `#!${process.execPath}\nimport {writeFileSync} from 'node:fs';\nwriteFileSync(process.env.SD_HELPER_ARGUMENTS_FILE,JSON.stringify(process.argv.slice(2)));\nprocess.exit(1);\n`,
      { mode: 0o700 },
    );
    const result = await execute(
      process.execPath,
      [join(checkout, "scripts/integration.js")],
      {
        cwd: checkout,
        env: {
          ...process.env,
          PATH: `${join(checkout, "bin")}:${process.env.PATH}`,
          SD_HELPER_ARGUMENTS_FILE: captured,
        },
      },
    ).catch((error) => error);
    assert.equal(result.code, 2);
    const args = JSON.parse(await readFile(captured, "utf8"));
    assert.equal(args[0], "status");
    assert.equal(args[args.indexOf("--workdir") + 1], `${checkout}/`);
  } finally {
    await rm(checkout, { recursive: true, force: true });
  }
});
