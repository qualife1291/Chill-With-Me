import { useEffect, useState } from "react";
import { readDeviceBudget, type DeviceConnection } from "./deviceHints";

export type SceneQuality = "auto" | "economy" | "detail";
const key = "cinema-scene-quality-v1";
const compactTouch = "(pointer: coarse)";
function preference(): SceneQuality {
  try {
    const value = localStorage.getItem(key);
    if (value === "economy" || value === "detail") return value;
  } catch {
    /* Storage can be unavailable in private/restricted browsers. */
  }
  return "auto";
}
type Connection = DeviceConnection;
const hints = readDeviceBudget;
export function useInitialGPUOptions() {
  return useState(() => {
    const budget = readDeviceBudget();
    return {
      antialias: !budget.economy,
      powerPreference: budget.economy
        ? ("low-power" as const)
        : ("default" as const),
    };
  })[0];
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
