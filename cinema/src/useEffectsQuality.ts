import { useEffect, useState } from "react";
import { readDeviceBudget } from "./deviceHints";
import { particleBudget, type EffectsMode } from "../shared/experience";
const key = "cinema-effects-v1";
const compactQuery = "(pointer: coarse)";
type Connection = EventTarget & { saveData?: boolean };
function hints() {
  return {
    compact: readDeviceBudget().economy,
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: !!(navigator as Navigator & { connection?: Connection })
      .connection?.saveData,
  };
}
export function useEffectsQuality() {
  const [mode, setMode] = useState<EffectsMode>(() => {
    try {
      const v = localStorage.getItem(key);
      if (v === "full" || v === "quiet") return v;
    } catch {}
    return "auto";
  });
  const [device, setDevice] = useState(hints);
  useEffect(() => {
    const compact = matchMedia(compactQuery),
      reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: Connection })
      .connection;
    const update = () => {
      const next = hints();
      setDevice((old) =>
        old.compact === next.compact &&
        old.reduced === next.reduced &&
        old.saveData === next.saveData
          ? old
          : next,
      );
    };
    compact.addEventListener("change", update);
    reduced.addEventListener("change", update);
    connection?.addEventListener("change", update);
    return () => {
      compact.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
      connection?.removeEventListener("change", update);
    };
  }, []);
  const change = (next: EffectsMode) => {
    if (!["auto", "full", "quiet"].includes(next)) return;
    setMode(next);
    try {
      localStorage.setItem(key, next);
    } catch {}
  };
  return {
    mode,
    change,
    budget: particleBudget(
      mode,
      device.compact,
      device.saveData,
      device.reduced,
    ),
  };
}
