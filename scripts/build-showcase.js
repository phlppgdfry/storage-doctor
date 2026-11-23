// Assemble the actual Pages artifact from tracked assets and canonical evidence.
import { cp, mkdir, mkdtemp, readdir, readFile, stat } from "node:fs/promises";
import { resolve, join, relative, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { verifyBundle } from "../src/report.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const bundles = [
  ["examples/v0.3.0-rc2", "reports/local-supabase"],
  ["examples/showcase/fixture-baseline", "reports/showcase/fixture-baseline"],
  ["examples/showcase/fixture-candidate", "reports/showcase/fixture-candidate"],
];

export async function checkShowcase(directory) {
  const base = resolve(directory);
  let references = 0;
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(html|css)$/.test(entry.name)) {
        const text = await readFile(path, "utf8");
        const links = entry.name.endsWith(".html")
          ? [...text.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)]
          : [...text.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
        for (const [, link] of links) {
          if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(link)) continue;
          const [file, anchor] = link.split("#");
          const target = file
            ? resolve(dirname(path), decodeURIComponent(file.split("?")[0]))
            : path;
          assert.ok(
            !relative(base, target).startsWith(".."),
            `Link outside artifact: ${link}`,
          );
          assert.ok((await stat(target)).isFile(), `Missing asset: ${link}`);
          if (anchor && target.endsWith(".html")) {
            const html = await readFile(target, "utf8");
            assert.ok(
              html.includes(`id="${anchor}"`),
              `Missing anchor: ${link}`,
            );
          }
          references++;
        }
      }
    }
  }
  await walk(base);
  for (const [source, destination] of bundles) {
    await verifyBundle(join(base, destination));
    for (const name of [
      "report.json",
      "report.html",
      "report.md",
      "checksums.json",
    ])
      assert.deepEqual(
        await readFile(join(base, destination, name)),
        await readFile(join(root, source, name)),
        `Published evidence differs from canonical source: ${destination}/${name}`,
      );
  }
  assert.deepEqual(
    await readFile(join(base, "assets/regression.cast")),
    await readFile(join(root, "examples/showcase/regression.cast")),
    "Recording differs from the retained original",
  );
  return { references, verifiedBundles: bundles.length };
}

export async function buildShowcase(directory) {
  let output;
  if (directory) {
    output = resolve(directory);
    assert.ok(
      output !== join(root, "site") &&
        !output.startsWith(join(root, "site") + sep),
      "Output must be outside site/",
    );
    await mkdir(output); // Existing evidence/output is never overwritten.
  } else {
    await mkdir(join(root, "reports"), { recursive: true });
    output = await mkdtemp(join(root, "reports/showcase-site-"));
  }
  await cp(join(root, "site"), output, {
    recursive: true,
    // Local site/reports is ignored by Git and may contain stale copies.
    filter: (source) => source !== join(root, "site/reports"),
  });
  for (const [source, destination] of bundles) {
    await verifyBundle(join(root, source));
    await cp(join(root, source), join(output, destination), {
      recursive: true,
    });
  }
  return { directory: output, ...(await checkShowcase(output)) };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(JSON.stringify(await buildShowcase(process.argv[2])));
