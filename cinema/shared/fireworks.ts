// One three-second room reaction; visual and audio share the same fuse times.
export const FIREWORKS = [
  { launch: 0, x: 36, y: 43, color: "#ffd16e" },
  { launch: 650, x: 64, y: 41, color: "#ff8fc4" },
  { launch: 1300, x: 50, y: 54, color: "#85ebdc" },
] as const;
export const FIREWORK_FUSE_MS = 280;
export const SPARKS_PER_BURST = 30;
