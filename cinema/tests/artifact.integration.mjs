import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { relative, join } from "node:path";
import { fileURLToPath } from "node:url";
const base = process.env.CINEMA_ARTIFACT_BASE_URL || "http://127.0.0.1:8788";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Artifact checks target local runtimes only");
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const paths = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((f) => f.isFile())
  .map((f) => relative(dist, join(f.parentPath, f.name)).replaceAll("\\", "/"));
const assets = [];
for (const path of paths) {
  const r = await fetch(base + "/" + path);
  assert.equal(r.status, 200, path);
  assert.equal(r.headers.get("content-encoding"), "gzip", path);
  if (path.endsWith(".glb"))
    assert.equal(r.headers.get("content-type"), "model/gltf-binary");
  const bytes = Buffer.from(await r.arrayBuffer());
  assert(
    bytes.equals(readFileSync(join(dist, path))),
    path + " must match dist after one decompression",
  );
  assets.push({
    path,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
assert.equal((await fetch(base + "/models/missing.glb")).status, 404);
const rooms = await (await fetch(base + "/api/rooms")).json();
assert.equal(rooms.length, 3);
writeFileSync(
  fileURLToPath(new URL("../evidence/artifact.json", import.meta.url)),
  JSON.stringify(
    {
      target: "local embedded Worker artifact",
      passed: true,
      assets,
      missingModel404: true,
      roomSlots: rooms.length,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `PASS embedded artifact: ${paths.length} gzip assets match dist, GLB MIME, missing model 404 and 3-room API`,
);
