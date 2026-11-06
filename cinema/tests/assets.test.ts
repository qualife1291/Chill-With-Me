import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const manifest = JSON.parse(
  readFileSync(
    new URL("../public/models/manifest.json", import.meta.url),
    "utf8",
  ),
);
for (const model of manifest.models)
  test(`${model.avatar} GLB integrity, animation clips and mobile size budget`, () => {
    const b = readFileSync(
      new URL("../public/models/" + model.file, import.meta.url),
    );
    assert.equal(b.readUInt32LE(0), 0x46546c67);
    assert.equal(b.readUInt32LE(4), 2);
    assert.equal(b.readUInt32LE(8), b.length);
    assert.equal(createHash("sha256").update(b).digest("hex"), model.sha256);
    assert(b.length < 400_000);
    const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString());
    assert(j.skins.length > 0);
    assert.equal(j.meshes.length, model.avatar === "male" ? 7 : 6);
    assert.equal(j.skins.length, 1);
    if (model.avatar === "male")
      assert(
        j.nodes.some((n: { name: string }) => n.name === "Barbarian_HeadHair"),
      );
    for (const name of [
      "Idle",
      "Walking_A",
      "Sit_Chair_Down",
      "Sit_Chair_Idle",
    ])
      assert(j.animations.some((a: { name: string }) => a.name === name));
    assert.equal(manifest.license, "CC0-1.0");
  });
