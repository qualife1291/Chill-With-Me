import { heldLookStep } from "../shared/lookInput";
import { test } from "node:test";
import assert from "node:assert/strict";
import { cameraView, orbitView } from "../shared/camera";
import { seats, type Member } from "../shared/model";
test("camera presets remain finite for all room sizes, seats and arrival states", () => {
  for (let n = 2; n <= 10; n++)
    for (const seat of seats(n))
      for (const time of [0, 2200, 4500, 6000])
        for (const mode of ["first", "orbit"]) {
          const m = { seat: seat.id, seated: true, sitAt: 0 } as Member;
          const view = cameraView(n, m, mode, time);
          assert(
            [...view.position, ...view.target, view.fov].every(Number.isFinite),
          );
          assert(view.fov >= 40 && view.fov <= 65);
          assert(
            Math.hypot(...view.position.map((v, i) => v - view.target[i])) > 1,
          );
        }
});
test("unified orbit stays inside side/front walls, clears heads and accepts a full rotation", () => {
  for (let n = 2; n <= 10; n++)
    for (const yaw of [-180, -90, 0, 90, 180, 360])
      for (const pitch of [-45, 0, 35])
        for (const zoom of [-24, 24]) {
          const v = orbitView(n, yaw, pitch, zoom, 0.46),
            highest = seats(n).at(-1)!.y;
          assert([...v.position, ...v.target, v.fov].every(Number.isFinite));
          assert(Math.abs(v.position[0]) <= 4.8);
          assert(v.position[2] >= -3.8);
          assert(v.position[1] >= highest + 1.8);
        }
  assert.notDeepEqual(
    orbitView(6, 0, 0, -24, 1.7).position,
    orbitView(6, 0, 0, 24, 1.7).position,
  );
});

test("held look speed stays time-based from 4 to 60 frames per second", () => {
  for (const fps of [4, 10, 30, 60]) {
    const total = Array.from({ length: fps }, () =>
      heldLookStep(1000 / fps),
    ).reduce((a, b) => a + b, 0);
    assert(
      Math.abs(total - 40) < 1e-9,
      `speed changed at ${fps} fps: ${total}`,
    );
  }
});
test("stale or invalid look-frame intervals cannot cause an unbounded jump", () => {
  assert(heldLookStep(60000) <= 10);
  assert.equal(heldLookStep(-100), 0);
  assert.equal(heldLookStep(Number.NaN), 0);
  assert.equal(heldLookStep(Infinity), 0);
});
