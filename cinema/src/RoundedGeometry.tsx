import { useMemo, useEffect } from "react";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
export default function Cushion({
  width,
  height,
  depth,
}: {
  width: number;
  height: number;
  depth: number;
}) {
  const geometry = useMemo(
    () =>
      new RoundedBoxGeometry(
        width,
        height,
        depth,
        2,
        Math.min(height, width, depth) * 0.25,
      ),
    [width, height, depth],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}
