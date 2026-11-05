import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const root = new URL("../", import.meta.url);
const config = JSON.parse(
  readFileSync(new URL("wrangler.jsonc", root), "utf8"),
);
config.main = fileURLToPath(new URL("worker/publish.generated.ts", root));
delete config.assets;
delete config.$schema;
mkdirSync(new URL(".wrangler/", root), { recursive: true });
writeFileSync(
  new URL(".wrangler/embedded-check.json", root),
  JSON.stringify(config, null, 2) + "\n",
);
console.log(
  "Local config: .wrangler/embedded-check.json (always use wrangler dev --local, never deploy this test config)",
);
