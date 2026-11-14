import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
/** Suspend only GPU work. Keep renderer, native player and room lease mounted. */
export default function SceneVisibility({
  suspended = false,
}: {
  suspended?: boolean;
}) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const update = () => {
      setFrameloop(document.hidden || suspended ? "never" : "demand");
      if (!document.hidden && !suspended) invalidate();
    };
    document.addEventListener("visibilitychange", update);
    update();
    return () => document.removeEventListener("visibilitychange", update);
  }, [setFrameloop, invalidate, suspended]);
  return null;
}
