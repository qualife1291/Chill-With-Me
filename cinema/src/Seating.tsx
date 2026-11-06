import { memo, useMemo, useLayoutEffect, useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { seats } from "../shared/model";
type Instance = {
  x: number;
  y: number;
  z: number;
  rx?: number;
  color?: string;
};
function Batch({
  size,
  rounded = false,
  color,
  instances,
}: {
  size: [number, number, number];
  rounded?: boolean;
  color: string;
  instances: Instance[];
}) {
  const mesh = useRef<THREE.InstancedMesh>(null),
    invalidate = useThree((s) => s.invalidate);
  const geometry = useMemo(
    () =>
      rounded
        ? new RoundedBoxGeometry(...size, 2, Math.min(...size) * 0.25)
        : new THREE.BoxGeometry(...size),
    [size[0], size[1], size[2], rounded],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const pose = new THREE.Object3D(),
      tint = new THREE.Color();
    instances.forEach((v, i) => {
      pose.position.set(v.x, v.y, v.z);
      pose.rotation.set(v.rx || 0, 0, 0);
      pose.updateMatrix();
      m.setMatrixAt(i, pose.matrix);
      m.setColorAt(i, tint.set(v.color || color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    invalidate();
  }, [instances, color, invalidate]);
  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, instances.length]}
      name="seating-batch"
    >
      <meshStandardMaterial color="#ffffff" roughness={0.93} />
    </instancedMesh>
  );
}
export default memo(function Seating({
  capacity,
  sofa,
  occupied,
}: {
  capacity: number;
  sofa: boolean;
  occupied: string;
}) {
  const layout = seats(capacity),
    parts = useMemo(() => {
      const taken = new Set(occupied.split(",").map(Number));
      const at = (y: number, z = 0, rx = 0) =>
        layout.map((s) => ({ x: s.x, y: s.y + y, z: s.z + z, rx }));
      const arms: Instance[] = [];
      for (const s of layout)
        for (const side of [-1, 1])
          if (
            !sofa ||
            !layout.some(
              (o) =>
                o.id !== s.id &&
                o.z === s.z &&
                Math.abs(o.x - (s.x + side * 1.25)) < 0.01,
            )
          )
            arms.push({ x: s.x + side * 0.44, y: s.y + 0.65, z: s.z });
      return {
        seat: at(0.42).map((v, i) => ({
          ...v,
          color: taken.has(i) ? "#92755b" : "#526b64",
        })),
        back: at(0.79, 0.28, -0.08),
        foot: at(0.39, -0.53),
        base: at(0.16),
        arms,
      };
    }, [capacity, sofa, occupied]);
  return (
    <group>
      <Batch
        size={[sofa ? 1.25 : 0.86, 0.18, sofa ? 0.8 : 0.72]}
        rounded
        color="#526b64"
        instances={parts.seat}
      />
      <Batch
        size={[sofa ? 1.25 : 0.86, 0.62, 0.18]}
        rounded
        color="#536b63"
        instances={parts.back}
      />
      <Batch
        size={[0.65, 0.1, 0.32]}
        rounded
        color="#41564f"
        instances={parts.foot}
      />
      <Batch size={[0.5, 0.32, 0.4]} color="#191c24" instances={parts.base} />
      <Batch size={[0.12, 0.16, 0.8]} color="#272932" instances={parts.arms} />
    </group>
  );
});
