export function oaqStage(portrait: boolean) {
  const pits = Array.from({ length: 12 }, (_, p) => {
    if (portrait) {
      if (p === 0 || p === 6)
        return { x: 0, z: p === 0 ? -3.9 : 3.9, w: 4.2, d: 1 };
      return {
        x: p < 6 ? -1.1 : 1.1,
        z: -2.6 + (p < 6 ? p - 1 : 11 - p) * 1.3,
        w: 1.9,
        d: 1.1,
      };
    }
    if (p === 0 || p === 6)
      return { x: p === 0 ? -4.5 : 4.5, z: 0, w: 1.5, d: 3.2 };
    return {
      x: -2.8 + (p < 6 ? p - 1 : 11 - p) * 1.4,
      z: p < 6 ? 0.9 : -0.9,
      w: 1.2,
      d: 1.45,
    };
  });
  return { width: portrait ? 4.9 : 11, depth: portrait ? 9.2 : 4.2, pits };
}
/** Fit every rotated corner in perspective, including the nearer lower edge. */
export function gameCameraDistance(
  width: number,
  depth: number,
  minY: number,
  maxY: number,
  aspect: number,
  angle: number,
) {
  const elevationLength = Math.hypot(0.88, 0.48),
    up = 0.88 / elevationLength,
    front = 0.48 / elevationLength,
    tangent = Math.tan((38 * Math.PI) / 360) * 0.91,
    radians = (angle * Math.PI) / 180;
  let distance = 1;
  for (const x of [-width / 2, width / 2])
    for (const z of [-depth / 2, depth / 2])
      for (const y of [minY, maxY]) {
        const rx = x * Math.cos(radians) + z * Math.sin(radians),
          rz = -x * Math.sin(radians) + z * Math.cos(radians),
          height = y - 0.4;
        const offset = up * height + front * rz;
        distance = Math.max(
          distance,
          offset +
            Math.max(
              Math.abs(rx) / (tangent * Math.max(0.1, aspect)),
              Math.abs(front * height - up * rz) / tangent,
            ),
        );
      }
  return distance / elevationLength;
}
