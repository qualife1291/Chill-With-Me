import { SPARKS_PER_BURST } from "./fireworks";
export type EffectsMode = "auto" | "full" | "quiet";
export function particleBudget(
  mode: EffectsMode,
  compact: boolean,
  saveData: boolean,
  reduced: boolean,
) {
  if (reduced || mode === "quiet") return 0;
  return mode === "auto" && (compact || saveData) ? 12 : SPARKS_PER_BURST;
}
export const CAMERA_PRESETS = {
  screen: { label: "Chính diện", mode: "orbit", zoom: 0 },
  wide: { label: "Toàn rạp", mode: "orbit", zoom: 12 },
  seat: { label: "Từ ghế", mode: "first", zoom: 0 },
} as const;
export type CameraPreset = keyof typeof CAMERA_PRESETS;
