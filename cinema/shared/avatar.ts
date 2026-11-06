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
  const pokeAge = now - (m.pokedAt ?? -Infinity);
  const poked = pokeAge >= 0 && pokeAge < 1000;
  const reaction = poked
    ? Math.sin((pokeAge / 1000) * Math.PI) * Math.sin(pokeAge * 0.025)
    : 0;
  return {
    poked,
    reaction,
    travel,
    sitting,
    walking,
    stride,
    waving,
    wave,
    hand: waving ? Math.sin(waveAge * 0.018) * 0.35 * wave : 0,
    moving:
      walking ||
      (m.seated && elapsed >= 4000 && elapsed < 5000) ||
      waving ||
      poked,
  };
}

export function aisleHeight(capacity: number, z: number) {
  const layout = seats(capacity),
    highest = layout[layout.length - 1].y;
  return Math.min(
    highest,
    Math.max(0, ((z - (layout[0].z - 0.95)) * 0.5) / 2.2),
  );
}

// Approach outside the chairs, cross in front of the row, then back into the seat.
export function avatarPosition(m: Member, capacity: number, now: number) {
  const layout = seats(capacity),
    rear = layout[layout.length - 1];
  const start = { x: 4.15, y: rear.y, z: rear.z + 2.2 + (m.seat % 2) * 0.35 };
  if (!m.seated) return start;
  const s = seats(capacity)[m.seat];
  const t = avatarMotion(m, now).travel;
  const points = [
    start,
    { x: 4.15, y: s.y, z: s.z - 0.95 },
    { x: s.x, y: s.y, z: s.z - 0.95 },
    s,
  ];
  const segment = Math.min(2, Math.floor(t * 3));
  const u = smooth(t * 3 - segment),
    a = points[segment],
    b = points[segment + 1];
  const z = a.z + (b.z - a.z) * u;
  return {
    x: a.x + (b.x - a.x) * u,
    y: segment === 0 ? aisleHeight(capacity, z) : s.y,
    z: a.z + (b.z - a.z) * u,
  };
}

// Time-based visual smoothing; snap at rest so on-demand rendering can go idle.
export function smoothHeadAngle(current: number, target: number, dt: number) {
  const next =
    current + (target - current) * (1 - Math.exp(-Math.max(0, dt) * 14));
  return Math.abs(next - target) < 0.005 ? target : next;
}
