import { readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
for (const dir of ["src", "scripts", "test"])
  for (const name of await readdir(dir))
    if (name.endsWith(".js"))
      execFileSync(process.execPath, ["--check", `${dir}/${name}`], {
        stdio: "inherit",
      });
console.log("Source syntax checks passed.");
