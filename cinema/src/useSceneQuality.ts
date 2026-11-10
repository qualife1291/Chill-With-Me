import { useEffect, useState } from "react";

export type SceneQuality = "auto" | "economy" | "detail";
const key = "cinema-scene-quality-v1";
const compactTouch =
  "(pointer: coarse) and (max-width: 800px), (pointer: coarse) and (max-height: 500px)";
function preference(): SceneQuality {
  try {
    const value = localStorage.getItem(key);
    if (value === "economy" || value === "detail") return value;
  } catch {
    /* Storage can be unavailable in private/restricted browsers. */
  }
  return "auto";
}
type Connection = EventTarget & { saveData?: boolean };
function hints() {
  const connection = (navigator as Navigator & { connection?: Connection })
    .connection;
  return {
    economy: !!connection?.saveData || matchMedia(compactTouch).matches,
    ratio: Math.min(1.3, Math.max(0.5, window.devicePixelRatio || 1)),
  };
}
export function useSceneQuality() {
  const [quality, setQuality] = useState<SceneQuality>(preference);
  const [device, setDevice] = useState(hints);
  useEffect(() => {
    const media = matchMedia(compactTouch);
    const connection = (navigator as Navigator & { connection?: Connection })
      .connection;
    const update = () => {
      const next = hints();
      setDevice((previous) =>
        previous.economy === next.economy && previous.ratio === next.ratio
          ? previous
          : next,
      );
    };
    media.addEventListener("change", update);
    window.addEventListener("resize", update);
    connection?.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("resize", update);
      connection?.removeEventListener("change", update);
    };
  }, []);
  const change = (next: SceneQuality) => {
    if (!["auto", "economy", "detail"].includes(next)) return;
    setQuality(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      /* Keep the in-memory choice. */
    }
  };
  const economy =
    quality === "economy" || (quality === "auto" && device.economy);
  return {
    quality,
    change,
    dpr: economy ? Math.min(0.75, device.ratio) : device.ratio,
  };
}
