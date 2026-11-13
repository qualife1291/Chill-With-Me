export const AUDIO_PRIORITIES = ["balanced", "video", "interaction"] as const;
export type AudioPriority = (typeof AUDIO_PRIORITIES)[number];
export function audioMix(
  priority: AudioPriority,
  playing: boolean,
  speech: boolean,
  effect: boolean,
  ambience: boolean,
) {
  return {
    duckMedia:
      priority !== "video" &&
      (speech || (priority === "interaction" && (effect || ambience))),
    sideGain: priority === "video" && playing ? 0.25 : 1,
  };
}
export function boundedVolume(value: number, max = 50) {
  return Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
}
