import { test } from "node:test";
import assert from "node:assert/strict";
import { ambientGain, noiseTexture } from "../shared/ambience";
test("ambient bus stays bounded, silent for invalid gain and ducks during speech", () => {
  for (const v of [-10, 0, 15, 50, 100, Infinity, NaN]) {
    const gain = ambientGain(v, false);
    assert(Number.isFinite(gain) && gain >= 0 && gain <= 0.1);
    assert.equal(ambientGain(v, true), gain * 0.25);
  }
  assert.equal(ambientGain(NaN, false), 0);
});
test("generated textures have finite quiet samples, nonzero energy and seamless quiet edges", () => {
  for (const mode of ["rain", "wind"] as const) {
    const data = noiseTexture(mode, 96000);
    assert(Math.abs(data[0]) === 0);
    assert(Math.abs(data.at(-1)!) === 0);
    let energy = 0;
    for (const sample of data) {
      assert(Number.isFinite(sample) && Math.abs(sample) <= 1);
      energy += sample * sample;
    }
    const rms = Math.sqrt(energy / data.length);
    assert(rms > 0.02 && rms < 0.25, `${mode} RMS ${rms}`);
  }
});
