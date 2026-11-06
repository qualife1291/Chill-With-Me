// Optional offline asset toolchain, deliberately separate from app dependencies.
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const input = process.argv[2];
if (!input || !process.env.AVATAR_TOOLS)
  throw Error(
    "Usage: AVATAR_TOOLS=/path/to/tool-install node tools/prepare-avatars.mjs /path/to/original-glbs",
  );
const require = createRequire(
  resolve(process.env.AVATAR_TOOLS, "package.json"),
);
const { NodeIO } = require("@gltf-transform/core");
const {
  dedup,
  prune,
  resample,
  weld,
  quantize,
} = require("@gltf-transform/functions");
const { KHRMeshQuantization } = require("@gltf-transform/extensions");
const io = new NodeIO().registerExtensions([KHRMeshQuantization]);
const output = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../public/models",
);
await mkdir(output, { recursive: true });
const sources = {
  Barbarian: "cefc311a0e10c7858b6141f5ada7e33268727564fb8ac1347aab97d000669cc6",
  Rogue: "e825437cd4d2ee9c1960b517a74a69101e33eb409ae7fa8cedc7134a998fbb7d",
};
for (const [name, expected] of Object.entries(sources)) {
  const bytes = await readFile(resolve(input, name + ".glb"));
  if (createHash("sha256").update(bytes).digest("hex") !== expected)
    throw Error("Unexpected upstream checksum: " + name);
  const doc = await io.readBinary(bytes);
  for (const a of doc.getRoot().listAnimations())
    if (
      ![
        "Idle",
        "Walking_A",
        "Sit_Chair_Down",
        "Sit_Chair_Idle",
      ].includes(a.getName())
    ) {
      const samplers = a.listSamplers();
      for (const c of a.listChannels()) c.dispose();
      for (const sampler of samplers) sampler.dispose();
      a.dispose();
    }
  for (const n of doc.getRoot().listNodes())
    if (
      n.getMesh() &&
      !new RegExp(
        `^${name}_(ArmLeft|ArmRight|Body|Head|LegLeft|LegRight)$`,
      ).test(n.getName())
    )
      n.setMesh(null);
  await doc.transform(
    resample(),
    dedup(),
    weld(),
    quantize({ quantizationVolume: "scene" }),
    dedup(),
    prune(),
  );
  const optimized = await io.writeBinary(doc);
  const filename = name === "Barbarian" ? "male.glb" : "female.glb";
  await writeFile(resolve(output, filename), optimized);
  console.log(
    JSON.stringify({
      file: filename,
      sourceBytes: bytes.length,
      bytes: optimized.length,
      sha256: createHash("sha256").update(optimized).digest("hex"),
    }),
  );
}

await import("./add-male-hair.mjs");
