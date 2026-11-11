// One three-second room reaction; visual and audio share the same fuse times.
export const FIREWORKS = [
  { launch: 0, x: 23, y: 34, color: "#ffd16e" },
  { launch: 650, x: 76, y: 27, color: "#ff8fc4" },
  { launch: 1300, x: 50, y: 43, color: "#85ebdc" },
] as const;
export const FIREWORK_FUSE_MS = 280;
export const SPARKS_PER_BURST = 18;
