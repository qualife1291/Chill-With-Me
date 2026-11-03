import { test } from "node:test";
import assert from "node:assert/strict";
import { screenMatrix } from "../shared/projection";
test("player corners match tilted 3D screen via perspective homography", () => {
  const points = [
    { x: 100, y: 80 },
    { x: 520, y: 120 },
    { x: 540, y: 400 },
    { x: 75, y: 380 },
  ];
  const m = screenMatrix(points)!;
  for (const [i, [x, y]] of [
    [0, 0],
    [640, 0],
    [640, 360],
    [0, 360],
  ].entries()) {
    const w = m[3] * x + m[7] * y + m[15];
    assert(Math.abs((m[0] * x + m[4] * y + m[12]) / w - points[i].x) < 1e-7);
    assert(Math.abs((m[1] * x + m[5] * y + m[13]) / w - points[i].y) < 1e-7);
  }
});
