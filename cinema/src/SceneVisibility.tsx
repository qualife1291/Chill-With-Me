import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
/** Suspend only GPU work. Keep renderer, native player and room lease mounted. */
export default function SceneVisibility() {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const update = () => {
      setFrameloop(document.hidden ? "never" : "demand");
      if (!document.hidden) invalidate();
    };
    document.addEventListener("visibilitychange", update);
    update();
    return () => document.removeEventListener("visibilitychange", update);
  }, [setFrameloop, invalidate]);
  return null;
}
