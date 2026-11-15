import type { Game } from "./games";
export type GameCue =
  | "game-select"
  | "game-start"
  | "game-sow"
  | "game-capture"
  | "game-draw"
  | "game-win";
export function gameCue(
  previous: Game | undefined,
  next: Game | undefined,
): GameCue | undefined {
  if (
    !previous ||
    !next ||
    previous.id !== next.id ||
    previous.revision === next.revision
  )
    return;
  if (
    next.phase === "finished" &&
    previous.phase !== "finished" &&
    next.winners?.length
  )
    return "game-win";
  if (next.phase !== "playing") return;
  if (previous.phase === "lobby") return "game-start";
  if (
    next.kind === "loto" &&
    (next.drawn?.length || 0) > (previous.drawn?.length || 0)
  )
    return "game-draw";
  if (next.oaq && previous.oaq && next.oaq.turns > previous.oaq.turns)
    return next.oaq.last?.captured ? "game-capture" : "game-sow";
}
export const MUSIC_MODES = ["off", "garden", "festival"] as const;
export type GameMusicMode = (typeof MUSIC_MODES)[number];
export const MUSIC_RATE = 24000,
  MUSIC_SECONDS = 12;
/** Original plucked phrases; one bounded mono buffer, no per-beat timers or recordings. */
export function gameMusicSamples(mode: Exclude<GameMusicMode, "off">) {
  const data = new Float32Array(MUSIC_RATE * MUSIC_SECONDS);
  const notes =
    mode === "garden"
      ? [0, 4, 7, 4, 2, 5, 9, 5, 0, 4, 7, 11, 9, 7, 4, 2]
      : [0, 7, 9, 7, 4, 2, 4, 7, 12, 9, 7, 4, 2, 4, 7, 2];
  const add = (note: number, at: number, duration: number, level: number) => {
    const frequency = 261.63 * 2 ** (note / 12),
      count = Math.floor(duration * MUSIC_RATE),
      start = Math.floor(at * MUSIC_RATE);
    for (let i = 0; i < count && start + i < data.length; i++) {
      const t = i / MUSIC_RATE,
        envelope =
          Math.min(1, t / 0.008) *
          Math.exp(-t * 8) *
          Math.min(1, (count - 1 - i) / 192),
        phase = 2 * Math.PI * frequency * t;
      data[start + i] +=
        level *
        envelope *
        (Math.sin(phase) +
          0.18 * Math.sin(phase * 2) +
          0.07 * Math.sin(phase * 3));
    }
  };
  notes.forEach((n, i) => {
    add(n, i * 0.75, 0.58, 0.28);
    if (i % 2 === 0)
      add([0, -5, -3, -5][Math.floor(i / 4) % 4] - 12, i * 0.75, 1.05, 0.2);
  });
  return data;
}
export function gameMusicGain(volume: number, speaking: boolean) {
  return (
    Math.max(0, Math.min(50, Number.isFinite(volume) ? volume : 0)) *
    0.02 *
    (speaking ? 0.25 : 1)
  );
}
