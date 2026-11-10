import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";

// A lost GPU must not tear down the independent native media element.
export default function SceneRecovery({
  onUnavailable,
}: {
  onUnavailable: () => void;
}) {
  const canvas = useThree((s) => s.gl.domElement);
  const callback = useRef(onUnavailable);
  callback.current = onUnavailable;
  useEffect(() => {
    const lost = (event: Event) => {
      event.preventDefault();
      callback.current();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [canvas]);
  return null;
}
