// Run each TypeScript test directly, matching the full local verifier on Node 22/24.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
let cases = 0;
for (const file of readdirSync("tests")
  .filter((f) => f.endsWith(".test.ts"))
  .sort()) {
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "tests/" + file],
    { encoding: "utf8" },
  );
  if (result.error) process.stderr.write(result.error.message + "\n");
  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  const count = Number(result.stdout?.match(/tests\s+(\d+)/)?.[1] || 0);
  if (result.status !== 0 || !count) {
    process.exitCode = 1;
    break;
  }
  cases += count;
}
if (!process.exitCode) console.log(`PASS ${cases} individual logic cases`);
