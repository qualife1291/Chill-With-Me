// Single world-space contract for the frame, depth mask, camera and DOM projection.
export const SCREEN = { width: 8.8, height: 4.95, y: 3.35, z: -5.69 } as const;
export function screenCorners(): [number, number, number][] {
  const { width: w, height: h, y, z } = SCREEN;
  return [
    [-w / 2, y + h / 2, z],
    [w / 2, y + h / 2, z],
    [w / 2, y - h / 2, z],
    [-w / 2, y - h / 2, z],
  ];
}
// Homography mapping a 640x360 DOM player onto the projected cinema screen.
export function screenMatrix(
  points: { x: number; y: number }[],
  w = 640,
  h = 360,
) {
  if (
    points.length !== 4 ||
    !points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  )
    return null;
  const source = [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ],
    a: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = source[i],
      { x: u, y: v } = points[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let c = 0; c < 8; c++) {
    let pivot = c;
    for (let i = c + 1; i < 8; i++)
      if (Math.abs(a[i][c]) > Math.abs(a[pivot][c])) pivot = i;
    [a[c], a[pivot]] = [a[pivot], a[c]];
    if (Math.abs(a[c][c]) < 1e-10) return null;
    const scale = a[c][c];
    for (let j = c; j <= 8; j++) a[c][j] /= scale;
    for (let i = 0; i < 8; i++) {
      if (i === c) continue;
      const k = a[i][c];
      for (let j = c; j <= 8; j++) a[i][j] -= k * a[c][j];
    }
  }
  const t = a.map((r) => r[8]);
  return [
    t[0],
    t[3],
    0,
    t[6],
    t[1],
    t[4],
    0,
    t[7],
    0,
    0,
    1,
    0,
    t[2],
    t[5],
    0,
    1,
  ];
}

// Compose clip-space directly instead of solving a homography from divided
// corners. Signed W is preserved so the browser clips a partially-behind plane.
export function screenClipMatrix(
  vp: ArrayLike<number>,
  width: number,
  height: number,
) {
  const { width: w, height: h, y, z } = SCREEN;
  const result: number[] = [];
  for (let col = 0; col < 4; col++) {
    const c = Array.from({ length: 4 }, (_, r) =>
      col === 0
        ? (vp[r] * w) / 640
        : col === 1
          ? (-vp[4 + r] * h) / 360
          : col === 2
            ? vp[8 + r]
            : (-vp[r] * w) / 2 +
              vp[4 + r] * (y + h / 2) +
              vp[8 + r] * z +
              vp[12 + r],
    );
    result.push(
      ((c[0] + c[3]) * width) / 2,
      ((-c[1] + c[3]) * height) / 2,
      c[2],
      c[3],
    );
  }
  return result;
}
