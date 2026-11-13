import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
const files = {};
// Cloudflare consumes this control file; apply the same policy in the optional embedded artifact.
const securityHeaders = Object.fromEntries(
  readFileSync("dist/_headers", "utf8")
    .split("\n")
    .filter((line) => /^\s+[^:]+:/.test(line))
    .map((line) => {
      const colon = line.indexOf(":");
      return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
    }),
);
for (const f of readdirSync("dist", { recursive: true, withFileTypes: true })
  .filter((f) => f.isFile() && f.name !== "_headers")
  .map((f) => {
    const parent = f.parentPath || f.path;
    return (parent + "/" + f.name).replace(/^dist\//, "");
  })) {
  const type = f.endsWith(".wasm")
    ? "application/wasm"
    : /\.(bcmap|pfb|ttf|icc)$/.test(f)
      ? "application/octet-stream"
      : f.includes("LICENSE")
        ? "text/plain; charset=utf-8"
        : f.endsWith(".glb")
          ? "model/gltf-binary"
          : f.endsWith(".json")
            ? "application/json"
            : f.endsWith(".txt")
              ? "text/plain; charset=utf-8"
              : f.endsWith(".html")
                ? "text/html; charset=utf-8"
                : f.endsWith(".css")
                  ? "text/css; charset=utf-8"
                  : "application/javascript; charset=utf-8";
  files["/" + f] = {
    type,
    data: gzipSync(readFileSync("dist/" + f)).toString("base64"),
  };
}
writeFileSync(
  "worker/static.generated.ts",
  `const assets=${JSON.stringify(files)};\nconst bytes=Object.fromEntries(Object.entries(assets).map(([k,v])=>[k,{type:v.type,body:Uint8Array.from(atob(v.data),c=>c.charCodeAt(0))}]));\nexport function serveAsset(req:Request){const path=new URL(req.url).pathname;const asset=bytes[path]||(!path.startsWith('/assets/')&&!path.startsWith('/models/')&&!path.startsWith('/pdf/')?bytes['/index.html']:null);if(!asset)return new Response('Not found',{status:404});return new Response(req.method==='HEAD'?null:asset.body,{encodeBody:'manual',headers:{'Content-Type':asset.type,'Content-Encoding':'gzip','Cache-Control':path.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache',...${JSON.stringify(securityHeaders)}}});}`,
);
const worker = readFileSync("worker/index.ts", "utf8");
writeFileSync(
  "worker/publish.generated.ts",
  `import {serveAsset} from './static.generated';\n` +
    worker.replace("env.ASSETS.fetch(req)", "serveAsset(req)"),
);
await build({
  entryPoints: ["worker/publish.generated.ts"],
  outfile: "release/worker.mjs",
  bundle: true,
  format: "esm",
  minify: true,
  external: ["cloudflare:workers"],
  target: "es2022",
});
console.log(
  JSON.stringify({
    bytes: readFileSync("release/worker.mjs").length,
    assets: Object.keys(files).length,
  }),
);

const embeddedGzipBytes = gzipSync(readFileSync("release/worker.mjs")).length;
if (embeddedGzipBytes > 3 * 1024 * 1024)
  console.warn(
    "Embedded artifact exceeds the 3 MiB free Worker code budget (" +
      embeddedGzipBytes +
      " bytes gzip). Use regular Static Assets with wrangler.jsonc; the embedded config is for local checks only. No billing change is made.",
  );
