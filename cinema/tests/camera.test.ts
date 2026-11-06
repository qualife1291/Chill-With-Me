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
