import { seats, type Member } from "./model";
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => v * v * (3 - 2 * v);

export function avatarMotion(m: Member, now: number) {
  const elapsed = now - (m.sitAt ?? 0);
  const travel = m.seated ? clamp(elapsed / 4000) : 0;
  const sitting = m.seated ? smooth(clamp((elapsed - 4000) / 1000)) : 0;
  const walking = m.seated && elapsed >= 0 && elapsed < 4000;
  const stride = walking
    ? Math.sin(elapsed * 0.012) * 0.45 * Math.min(1, (4000 - elapsed) / 250)
    : 0;
  const waveAge = now - (m.waveAt ?? -Infinity);
  const waving = waveAge >= 0 && waveAge < 2400;
  const wave = waving ? Math.sin(Math.PI * clamp(waveAge / 2400)) : 0;
  return {
    travel,
    sitting,
    walking,
    stride,
    waving,
    wave,
    hand: waving ? Math.sin(waveAge * 0.018) * 0.35 * wave : 0,
    moving:
      walking || (m.seated && elapsed >= 4000 && elapsed < 5000) || waving,
  };
}

// Aisle -> row -> sit. Preserve the lobby starting point when admission seats a member.
export function avatarPosition(m: Member, capacity: number, now: number) {
  const start = {
    x: ((m.seat % 3) - 1) * 0.6,
    y: 0,
    z: 4 + (m.seat % 2) * 0.4,
  };
  if (!m.seated) return start;
  const s = seats(capacity)[m.seat];
  const t = avatarMotion(m, now).travel;
  if (t < 0.55) {
    const along = smooth(t / 0.55);
    return {
      x: start.x * (1 - along),
      y: s.y * along,
      z: start.z + (s.z - start.z) * along,
    };
  }
  return { x: s.x * smooth((t - 0.55) / 0.45), y: s.y, z: s.z };
}

// Time-based visual smoothing; snap at rest so on-demand rendering can go idle.
export function smoothHeadAngle(current: number, target: number, dt: number) {
  const next =
    current + (target - current) * (1 - Math.exp(-Math.max(0, dt) * 14));
  return Math.abs(next - target) < 0.005 ? target : next;
}
