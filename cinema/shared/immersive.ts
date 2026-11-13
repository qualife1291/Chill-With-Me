export const MOTION_MODES = ["off", "gentle", "cinema"] as const;
export type MotionMode = (typeof MOTION_MODES)[number];
/** A finite camera pulse, never a video/audio-content detector or a second loop. */
export function cinemaMotion(mode: MotionMode, age: number, reduced: boolean) {
  if (
    reduced ||
    mode === "off" ||
    !Number.isFinite(age) ||
    age < 0 ||
    age >= 2800
  )
    return { x: 0, y: 0, active: false };
  const t = age / 1000;
  const envelope = Math.sin((age / 2800) * Math.PI) ** 2;
  const level = mode === "gentle" ? 0.009 : 0.025;
  return {
    x: Math.sin(t * 13) * level * envelope,
    y: Math.sin(t * 17 + 0.4) * level * 0.6 * envelope,
    active: true,
  };
}
