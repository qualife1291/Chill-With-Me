// 40 degrees/second across ordinary frame rates. Bound suspended-frame jumps;
// blur/visibility/focus handlers separately clear held keys.
export function heldLookStep(elapsedMs: number) {
  return Number.isFinite(elapsedMs)
    ? Math.min(250, Math.max(0, elapsedMs)) * 0.04
    : 0;
}
