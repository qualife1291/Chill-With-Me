import { test } from "node:test";
import assert from "node:assert/strict";
import { cameraView } from "../shared/camera";
import { seats, type Member } from "../shared/model";
test("camera presets remain finite for all room sizes, seats and arrival states", () => {
  for (let n = 2; n <= 10; n++)
    for (const seat of seats(n))
      for (const time of [0, 2200, 4500, 6000])
        for (const mode of ["first", "third", "shoulder", "side"]) {
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
test("overview and social camera are stable while eye/shoulder track the member", () => {
  const m = { seat: 0, seated: true, sitAt: 0 } as Member;
  const other = { ...m, seat: 5 };
  assert.deepEqual(
    cameraView(6, m, "third", 6000),
    cameraView(6, other, "third", 6000),
  );
  assert.deepEqual(
    cameraView(6, m, "side", 6000),
    cameraView(6, other, "side", 6000),
  );
  assert.notDeepEqual(
    cameraView(6, m, "shoulder", 6000).position,
    cameraView(6, other, "shoulder", 6000).position,
  );
  const eye = cameraView(6, m, "first", 6000),
    shoulder = cameraView(6, m, "shoulder", 6000);
  assert(shoulder.position[2] > eye.position[2]);
});
