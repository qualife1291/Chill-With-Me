// Derive a scalp hair mesh from the same pinned CC0 Rogue asset. No runtime download.
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as THREE from "../node_modules/three/build/three.module.js";
import { GLTFLoader } from "../node_modules/three/examples/jsm/loaders/GLTFLoader.js";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/models",
);
if (!process.env.AVATAR_TOOLS)
  throw Error("Set AVATAR_TOOLS to the offline glTF tool installation");
const require = createRequire(
  path.resolve(process.env.AVATAR_TOOLS, "package.json"),
);
const { NodeIO } = require("@gltf-transform/core");
const { KHRMeshQuantization } = require("@gltf-transform/extensions");
const { quantize, dedup, prune } = require("@gltf-transform/functions");
const io = new NodeIO().registerExtensions([KHRMeshQuantization]);
const male = await readFile(path.join(root, "male.glb")),
  female = await readFile(path.join(root, "female.glb"));
const sha = (b) => createHash("sha256").update(b).digest("hex");
const doc = await io.readBinary(male);
if (
  doc
    .getRoot()
    .listNodes()
    .some((n) => n.getName() === "Barbarian_HeadHair")
) {
  console.log("Scalp hair already present");
  process.exit(0);
}
if (
  sha(male) !==
    "3370fa76f65a3cb42ffcc1a33fde6f125f5e6d821a231f2283595e029e771542" ||
  sha(female) !==
    "d5d5f1a869795ca3e74affa31349716d79b320cd9a4d6b81e3bdf900e89bda70"
)
  throw Error("Hair derivation requires pinned optimized source assets");
globalThis.ProgressEvent ??= class {
  constructor(type, init) {
    Object.assign(this, init);
  }
};
const jsonLength = female.readUInt32LE(12),
  j = JSON.parse(female.subarray(20, 20 + jsonLength));
j.materials = [];
j.meshes.forEach((m) => m.primitives.forEach((p) => delete p.material));
j.buffers[0].uri =
  "data:application/octet-stream;base64," +
  female.subarray(28 + jsonLength).toString("base64");
const gltf = await new GLTFLoader().parseAsync(JSON.stringify(j), "");
gltf.scene.updateMatrixWorld(true);
const head = gltf.scene.getObjectByName("Rogue_Head"),
  bone = gltf.scene.getObjectByName("head");
head.skeleton.update();
const uv = head.geometry.getAttribute("uv"),
  indices = head.geometry.index;
const positions = [],
  uvs = [],
  triangles = [],
  lookup = new Map(),
  v = new THREE.Vector3();
const resolve = (i) => {
  head.getVertexPosition(i, v);
  head.localToWorld(v);
  bone.worldToLocal(v);
  v.multiplyScalar(1.06);
  const key = v
    .toArray()
    .map((x) => Math.round(x * 10000))
    .join(",");
  if (!lookup.has(key)) lookup.set(key, lookup.size);
  return { id: lookup.get(key), p: v.toArray(), uv: [uv.getX(i), uv.getY(i)] };
};
for (let i = 0; i < (indices?.count || uv.count); i += 3) {
  const ids = [0, 1, 2].map((k) => (indices ? indices.getX(i + k) : i + k));
  if (
    !ids.every(
      (i) => uv.getX(i) > 0.125 && uv.getX(i) < 0.25 && uv.getY(i) < 0.25,
    )
  )
    continue;
  triangles.push(ids.map(resolve));
}
const parent = Array.from({ length: lookup.size }, (_, i) => i);
const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
for (const tri of triangles)
  for (const v of tri) parent[find(v.id)] = find(tri[0].id);
const groups = new Map();
for (const tri of triangles) {
  const id = find(tri[0].id);
  if (!groups.has(id)) groups.set(id, []);
  groups.get(id).push(tri);
}
// Keep the connected scalp mesh; discard separate eyebrow islands.
const scalp = [...groups.values()].sort((a, b) => b.length - a.length)[0];
if (!scalp || scalp.length < 50) throw Error("Scalp extraction failed");
for (const tri of scalp)
  for (const v of tri) {
    positions.push(...v.p);
    uvs.push(...v.uv);
  }
const g = new THREE.BufferGeometry().setAttribute(
  "position",
  new THREE.Float32BufferAttribute(positions, 3),
);
g.computeVertexNormals();
const buffer = doc.getRoot().listBuffers()[0];
const attribute = (name, array, type) =>
  doc.createAccessor(name, buffer).setArray(array).setType(type);
const material = doc
  .getRoot()
  .listNodes()
  .find((n) => n.getName() === "Barbarian_Head")
  .getMesh()
  .listPrimitives()[0]
  .getMaterial();
const primitive = doc
  .createPrimitive()
  .setAttribute(
    "POSITION",
    attribute("scalp-position", new Float32Array(positions), "VEC3"),
  )
  .setAttribute(
    "NORMAL",
    attribute(
      "scalp-normal",
      new Float32Array(g.getAttribute("normal").array),
      "VEC3",
    ),
  )
  .setAttribute(
    "TEXCOORD_0",
    attribute("scalp-uv", new Float32Array(uvs), "VEC2"),
  )
  .setMaterial(material);
const mesh = doc.createMesh("DerivedScalpHair").addPrimitive(primitive);
const hair = doc.createNode("Barbarian_HeadHair").setMesh(mesh);
doc
  .getRoot()
  .listNodes()
  .find((n) => n.getName() === "head")
  .addChild(hair);
await doc.transform(
  dedup(),
  quantize({ quantizationVolume: "scene" }),
  dedup(),
  prune(),
);
const bytes = await io.writeBinary(doc);
if (bytes.length > 400000)
  throw Error("Male asset exceeded mobile size budget");
await writeFile(path.join(root, "male.glb"), bytes);
const manifest = JSON.parse(
  await readFile(path.join(root, "manifest.json"), "utf8"),
);
const entry = manifest.models.find((m) => m.avatar === "male");
entry.sha256 = sha(bytes);
entry.bytes = bytes.length;
entry.gzipBytes = gzipSync(bytes).length;
entry.derivedHair = {
  source: "Rogue.glb at sourceCommit",
  optimizedSourceSha256: sha(female),
  baseMaleSha256: sha(male),
  triangles: scalp.length,
  scalpClearanceScale: 1.06,
  method:
    "head-bone-local connected scalp geometry; eyebrows excluded; quantized",
};
await writeFile(
  path.join(root, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    bytes: bytes.length,
    sha256: sha(bytes),
    scalpTriangles: scalp.length,
  }),
);
