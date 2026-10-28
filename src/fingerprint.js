import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
export async function sourceFingerprint() {
  const directory = new URL(".", import.meta.url),
    hash = createHash("sha256");
  for (const name of (await readdir(directory))
    .filter((n) => n.endsWith(".js"))
    .sort()) {
    hash.update(name);
    hash.update("\0");
    hash.update(await readFile(new URL(name, directory)));
  }
  return hash.digest("hex");
}
