import { memo, useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SCREEN } from "../shared/projection";
import { aisleHeight } from "../shared/avatar";
import type { Space } from "../shared/spaces";

type Box = {
  at: [number, number, number];
  size: [number, number, number];
  color: string;
};
type Boxes = { solid: Box[]; metal: Box[]; glow: Box[] };
function decoration(space: Space, capacity: number): Boxes {
  const solid: Box[] = [],
    metal: Box[] = [],
    glow: Box[] = [];
  const box = (list: Box[], at: Box["at"], size: Box["size"], color: string) =>
    list.push({ at, size, color });
  const lounge = space === "lounge",
    roof = space === "rooftop";
  box(
    solid,
    [0, -0.051, 0],
    [12, 0.1, 16],
    lounge ? "#443b34" : roof ? "#263140" : "#202b29",
  );
  if (!roof) {
    box(solid, [0, 3.2, -6], [12, 6.4, 0.2], lounge ? "#685643" : "#152422");
    for (const side of [-1, 1]) {
      box(
        solid,
        [side * 5.5, 3.1, 0],
        [0.2, 6.2, 12],
        lounge ? "#706251" : "#29303e",
      );
      for (const z of [-3.5, 0, 3.5]) {
        box(
          solid,
          [side * 5.32, 2.3, z],
          [0.08, 3.4, 2.6],
          lounge ? "#85735b" : "#263b38",
        );
        box(
          glow,
          [side * 5.32 - side * 0.065, 2.5, z],
          [0.05, 0.7, 0.07],
          "#f7c281",
        );
        box(
          glow,
          [side * 5.32 - side * 0.08, 0.72, z],
          [0.06, 0.035, 2.6],
          "#bf8553",
        );
      }
    }
    for (const z of [-3, 0, 3, 6]) {
      box(
        solid,
        [0, 6.45, z],
        [11.2, 0.14, 0.28],
        lounge ? "#514b3d" : "#21302c",
      );
      for (const x of [-3.5, 3.5])
        box(glow, [x, 6.36, z], [1.5, 0.035, 0.12], "#f8d3a1");
    }
  }
  const frame = roof ? "#879db6" : lounge ? "#c9ad83" : "#9b7750";
  for (const side of [-1, 1]) {
    box(
      metal,
      [side * (SCREEN.width / 2 + 0.12), SCREEN.y, SCREEN.z - 0.05],
      [0.16, SCREEN.height + 0.35, 0.18],
      frame,
    );
    box(
      metal,
      [0, SCREEN.y + side * (SCREEN.height / 2 + 0.12), SCREEN.z - 0.05],
      [SCREEN.width + 0.4, 0.16, 0.18],
      frame,
    );
    box(
      glow,
      [side * (SCREEN.width / 2 + 0.03), SCREEN.y, SCREEN.z + 0.01],
      [0.025, SCREEN.height + 0.06, 0.025],
      roof ? "#b7d5ef" : "#e9d0a7",
    );
    if (!roof)
      box(
        solid,
        [side * 5.1, 3.1, -5.82],
        [1.1, 6.2, 0.18],
        lounge ? "#7a674b" : "#263b38",
      );
    box(
      glow,
      [side * (roof ? 5.65 : 5.32), roof ? 1.35 : 3.8, 0],
      [0.04, 0.035, 10],
      roof ? "#9bb5d7" : "#b29b80",
    );
    for (const z of [-2, 0, 2, 4])
      box(
        glow,
        [side * 5.32, aisleHeight(capacity, z) + 0.12, z],
        [0.045, 0.06, 0.32],
        "#cda875",
      );
  }
  if (lounge) {
    // Low-cost bookcases, woven carpet and plants; no textures or animated lights.
    box(solid, [0, 0.002, -3.1], [7, 0.01, 2.8], "#6c7865");
    for (const side of [-1, 1]) {
      for (const y of [0.65, 1.35, 2.05, 2.75]) {
        box(solid, [side * 5.12, y, 0], [0.42, 0.07, 2.5], "#493b2e");
        for (let i = 0; i < 7; i++)
          box(
            solid,
            [side * 5.12, y + 0.23, -0.95 + i * 0.3],
            [0.25, 0.36 + (i % 3) * 0.06, 0.18],
            ["#bd9478", "#788e76", "#d1bd8c", "#6f8294"][i % 4],
          );
      }
      box(solid, [side * 4.8, 0.32, -4.5], [0.55, 0.64, 0.55], "#b09271");
      for (let i = 0; i < 5; i++)
        box(
          solid,
          [
            side * 4.8 + (i % 2) * 0.12,
            1 + i * 0.12,
            -4.5 + ((i % 3) - 1) * 0.16,
          ],
          [0.4, 0.5, 0.35],
          i % 2 ? "#759164" : "#4d7051",
        );
    }
  }
  if (roof) {
    // City ground sits below the roof; towers extend to it rather than floating.
    box(solid, [0, -12.1, 0], [90, 0.2, 90], "#0b1321");
    for (const side of [-1, 1]) {
      box(metal, [side * 5.65, 1.3, 0], [0.08, 0.08, 15], "#6d819a");
      for (const z of [-7, -4, -1, 2, 5, 7])
        box(metal, [side * 5.65, 0.65, z], [0.06, 1.3, 0.06], "#53687e");
      box(metal, [0, 1.3, side * 7.4], [11.3, 0.08, 0.08], "#6d819a");
      box(
        solid,
        [side * 4.6, SCREEN.y / 2, SCREEN.z - 0.12],
        [0.12, SCREEN.y, 0.18],
        "#293d55",
      );
    }
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2,
        x = Math.sin(angle) * 22,
        z = Math.cos(angle) * 22;
      const h = 3.4 + ((i * 7) % 11) * 0.5;
      box(
        solid,
        [x, (h - 12) / 2, z],
        [2.2 + (i % 3) * 0.4, h + 12, 2.3],
        ["#172638", "#20344a", "#1c2e40"][i % 3],
      );
      for (let row = 0; row < 3; row++)
        for (const dx of [-0.5, 0.5])
          box(
            glow,
            Math.abs(z) >= Math.abs(x)
              ? [x + dx, 1 + row * 0.9, z - Math.sign(z) * 1.16]
              : [
                  x - Math.sign(x) * ((2.2 + (i % 3) * 0.4) / 2 + 0.01),
                  1 + row * 0.9,
                  z + dx,
                ],
            Math.abs(z) >= Math.abs(x)
              ? [0.14, 0.3, 0.025]
              : [0.025, 0.3, 0.14],
            (i + row) % 3 ? "#d5b884" : "#a1bed7",
          );
    }
  }
  return { solid, metal, glow };
}
function Batch({ boxes, kind }: { boxes: Box[]; kind: keyof Boxes }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const pose = new THREE.Object3D(),
      color = new THREE.Color();
    boxes.forEach((b, i) => {
      pose.position.set(...b.at);
      pose.scale.set(...b.size);
      pose.updateMatrix();
      mesh.current!.setMatrixAt(i, pose.matrix);
      mesh.current!.setColorAt(i, color.set(b.color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor)
      mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
    invalidate();
  }, [boxes, invalidate]);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, boxes.length]}
      name={"environment-" + kind}
    >
      <boxGeometry args={[1, 1, 1]} />
      {kind === "glow" ? (
        <meshBasicMaterial color="white" />
      ) : (
        <meshStandardMaterial
          color="white"
          roughness={kind === "metal" ? 0.42 : 0.95}
          metalness={kind === "metal" ? 0.45 : 0}
        />
      )}
    </instancedMesh>
  );
}
const Stars = memo(function Stars() {
  const points = useMemo(() => {
    const data = new Float32Array(96 * 3);
    for (let i = 0; i < 96; i++) {
      const a = i * 2.399963;
      data.set(
        [Math.sin(a) * 30, 8 + ((i * 13) % 19), Math.cos(a) * 30],
        i * 3,
      );
    }
    return data;
  }, []);
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#dce9ff"
        size={0.09}
        fog={false}
        depthWrite={false}
      />
    </points>
  );
});
export default memo(function SceneEnvironment({
  space,
  capacity,
}: {
  space: Space;
  capacity: number;
}) {
  const boxes = useMemo(() => decoration(space, capacity), [space, capacity]);
  const roof = space === "rooftop";
  return (
    <>
      <color
        attach="background"
        args={[roof ? "#101b30" : space === "lounge" ? "#342f28" : "#101b19"]}
      />
      <fog
        attach="fog"
        args={[
          roof ? "#101b30" : space === "lounge" ? "#342f28" : "#101b19",
          roof ? 24 : 18,
          roof ? 65 : 38,
        ]}
      />
      <group name={"space-" + space}>
        <ambientLight intensity={roof ? 0.6 : 0.8} />
        <hemisphereLight
          args={[roof ? "#bac9f1" : "#c3d1ea", "#18121d", 1.1]}
        />
        <directionalLight
          position={[0, 5, 6]}
          intensity={1.5}
          color={roof ? "#bdcff7" : "#ede5d6"}
        />
        <pointLight
          position={[0, 3, -4]}
          intensity={12}
          color="#a8bce6"
          distance={14}
        />
        {!roof &&
          [-1, 1].map((side) => (
            <pointLight
              key={side}
              position={[side * 4.4, 3.1, 1.5]}
              intensity={12}
              distance={12}
              color="#ffcb8a"
            />
          ))}
        <Batch boxes={boxes.solid} kind="solid" />
        <Batch boxes={boxes.metal} kind="metal" />
        <Batch boxes={boxes.glow} kind="glow" />
        {roof && <Stars />}
      </group>
    </>
  );
});
