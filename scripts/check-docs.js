import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
const files = [];
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "reports"].includes(item.name)) continue;
    const path = `${dir}/${item.name}`;
    if (item.isDirectory()) await walk(path);
    else if (item.name.endsWith(".md")) files.push(path);
  }
}
await walk(".");
let checked = 0;
for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const [, target] of source.matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(https?:|#|mailto:)/.test(target)) continue;
    const path = target.split("#")[0];
    if (!path) continue;
    await stat(resolve(dirname(file), path));
    checked++;
  }
}
console.log(
  `Documentation file links passed: ${checked} links in ${files.length} Markdown files. External links are not inferred healthy.`,
);
