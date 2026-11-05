import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
const files = {};
for (const f of readdirSync("dist", { recursive: true, withFileTypes: true })
  .filter((f) => f.isFile())
  .map((f) => {
    const parent = f.parentPath || f.path;
    return (parent + "/" + f.name).replace(/^dist\//, "");
  })) {
  const type = f.endsWith(".glb")
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
  `const assets=${JSON.stringify(files)};\nconst bytes=Object.fromEntries(Object.entries(assets).map(([k,v])=>[k,{type:v.type,body:Uint8Array.from(atob(v.data),c=>c.charCodeAt(0))}]));\nexport function serveAsset(req:Request){const path=new URL(req.url).pathname;const asset=bytes[path]||(!path.startsWith('/assets/')&&!path.startsWith('/models/')?bytes['/index.html']:null);if(!asset)return new Response('Not found',{status:404});return new Response(req.method==='HEAD'?null:asset.body,{encodeBody:'manual',headers:{'Content-Type':asset.type,'Content-Encoding':'gzip','Cache-Control':path.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()'}});}`,
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
