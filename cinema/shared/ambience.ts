export type Ambience = "off" | "rain" | "wind";
export type Lighting = "normal" | "dim" | "warm";
export function ambientGain(volume: number, speaking: boolean) {
  const bounded = Number.isFinite(volume)
    ? Math.max(0, Math.min(50, volume))
    : 0;
  return bounded * 0.002 * (speaking ? 0.25 : 1);
}
// Quiet, locally generated textures, never recordings or microphone input.
export function noiseTexture(mode: Exclude<Ambience, "off">, length: number) {
  const data = new Float32Array(length);
  let state = 71,
    previous = 0;
  for (let i = 0; i < length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const white = (state / 0xffffffff) * 2 - 1;
    previous = previous * 0.98 + white * 0.02;
    const edge = Math.min(1, i / 256, (length - 1 - i) / 256);
    data[i] = (mode === "wind" ? previous * 3 : white * 0.35) * edge;
  }
  return data;
}
