import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import ModelAvatar from "./ModelAvatar";
import ModelBoundary from "./ModelBoundary";
import type { AvatarStyle, Member } from "../shared/model";
import * as THREE from "three";

function LobbyCamera({
  selected,
  reduced,
}: {
  selected: number;
  reduced: boolean;
}) {
  const { camera, invalidate, gl, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  const aim = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    invalidate();
  }, [selected, reduced, size.width, invalidate]);
  useFrame((_, dt) => {
    const narrow = size.width < 700;
    const x = (selected - 2) * 0.65;
    target.set(x, 2.65, narrow ? 14.5 : 9.8);
    aim.set(x * 0.5, 1.65, -3.7);
    if (reduced) camera.position.copy(target);
    else camera.position.lerp(target, 1 - Math.exp(-dt * 4));
    camera.lookAt(aim);
    gl.domElement.dataset.preview = String(selected);
    gl.domElement.dataset.renderFrame = String(gl.info.render.frame);
    gl.domElement.dataset.settled = String(
      camera.position.distanceTo(target) < 0.005,
    );
    if (camera.position.distanceTo(target) > 0.005) invalidate();
  });
  return null;
}
export default function Lobby({
  selected,
  avatar,
  occupied,
  onSelect,
  reduced,
}: {
  selected: number;
  avatar: AvatarStyle;
  occupied: boolean[];
  onSelect: (slot: number) => void;
  reduced: boolean;
}) {
  const member = useMemo(
    () =>
      ({
        id: "preview",
        name: "Preview",
        avatar,
        seat: 0,
        seated: false,
        joinedAt: 0,
      }) satisfies Member,
    [avatar],
  );
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.3]}
      camera={{ position: [0, 3.2, 12], fov: 46 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={["#16151d"]} />
      <fog attach="fog" args={["#16151d", 18, 35]} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#d8d6f0", "#39291f", 1.5]} />
      <directionalLight position={[0, 5, 6]} intensity={2} color="#ffdfb0" />
      <pointLight
        position={[0, 3, -1]}
        intensity={22}
        distance={12}
        color="#ffc986"
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 1]}>
        <planeGeometry args={[18, 20]} />
        <meshStandardMaterial color="#4d3940" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.3, -4.2]}>
        <boxGeometry args={[16, 4.6, 0.25]} />
        <meshStandardMaterial color="#292836" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 1]}>
        <planeGeometry args={[8.6, 12]} />
        <meshStandardMaterial color="#613445" roughness={1} />
      </mesh>
      {[-4.4, 4.4].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 1]}>
          <planeGeometry args={[0.04, 12]} />
          <meshBasicMaterial color="#d9b27b" />
        </mesh>
      ))}
      {[1, 2, 3].map((slot) => {
        const x = (slot - 2) * 3.15,
          active = slot === selected;
        return (
          <group key={slot} position={[x, 0, -3.9]}>
            <mesh position={[0, 1.4, 0]} onClick={() => onSelect(slot)}>
              <boxGeometry args={[2.05, 2.8, 0.2]} />
              <meshStandardMaterial
                color={active ? "#8f6347" : "#513c40"}
                roughness={0.75}
              />
            </mesh>
            {[-1.12, 1.12].map((side) => (
              <mesh key={side} position={[side, 1.45, 0.1]}>
                <boxGeometry args={[0.09, 2.95, 0.13]} />
                <meshStandardMaterial
                  color="#c79760"
                  metalness={0.4}
                  roughness={0.4}
                />
              </mesh>
            ))}
            <mesh position={[0, 2.92, 0.1]}>
              <boxGeometry args={[2.34, 0.1, 0.13]} />
              <meshBasicMaterial color={active ? "#ffdc9c" : "#b48759"} />
            </mesh>
            <mesh position={[0, 3.25, 0.08]}>
              <boxGeometry args={[1.5, 0.37, 0.12]} />
              <meshStandardMaterial color="#171a25" />
            </mesh>
            {Array.from({ length: slot }, (_, i) => (
              <mesh key={i} position={[(i - (slot - 1) / 2) * 0.2, 3.25, 0.16]}>
                <sphereGeometry args={[0.045, 8, 6]} />
                <meshBasicMaterial color="#ffe0a4" />
              </mesh>
            ))}
            <mesh position={[0.7, 1.25, 0.16]}>
              <boxGeometry args={[0.06, 0.22, 0.09]} />
              <meshStandardMaterial
                color="#e5bc7d"
                metalness={0.6}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[-0.73, 2.45, 0.16]}>
              <sphereGeometry args={[0.055, 8, 6]} />
              <meshBasicMaterial
                color={occupied[slot - 1] ? "#edb769" : "#a0dcc0"}
              />
            </mesh>
            <mesh position={[0, 0.02, 0.6]}>
              <boxGeometry args={[2.2, 0.04, 1.3]} />
              <meshStandardMaterial color={active ? "#b88b55" : "#6c4a43"} />
            </mesh>
          </group>
        );
      })}
      {[-6, 6].map((x) => (
        <group key={x} position={[x, 1.9, -3.8]}>
          <mesh>
            <boxGeometry args={[1.45, 2.3, 0.15]} />
            <meshStandardMaterial color="#b58b55" metalness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.09]}>
            <planeGeometry args={[1.26, 2.1]} />
            <meshStandardMaterial color={x < 0 ? "#354a69" : "#5a3557"} />
          </mesh>
          <mesh position={[0, 0.22, 0.11]}>
            <circleGeometry args={[0.38, 24]} />
            <meshBasicMaterial color="#ebc58a" />
          </mesh>
          {[-0.45, -0.65, -0.85].map((y, i) => (
            <mesh key={y} position={[0, y, 0.11]}>
              <planeGeometry args={[0.85 - i * 0.16, 0.025]} />
              <meshBasicMaterial color="#e9cda2" />
            </mesh>
          ))}
        </group>
      ))}
      {[-5, 5].map((x) => (
        <group key={x} position={[x, 0, 1.7]}>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[1.8, 1, 0.8]} />
            <meshStandardMaterial color="#302d39" />
          </mesh>
          <mesh position={[0, 1.04, 0]}>
            <boxGeometry args={[2, 0.08, 0.95]} />
            <meshStandardMaterial color="#c49a69" />
          </mesh>
          <mesh position={[0, 1.45, 0]}>
            <boxGeometry args={[0.16, 0.8, 0.16]} />
            <meshStandardMaterial color="#ac8659" />
          </mesh>
          <mesh position={[0, 1.9, 0]}>
            <sphereGeometry args={[0.23, 12, 8]} />
            <meshBasicMaterial color="#ffe2ad" />
          </mesh>
        </group>
      ))}
      {[-2, 1, 4].map((z) => (
        <group key={z} position={[0, 4.5, z]}>
          <mesh>
            <boxGeometry args={[15, 0.14, 0.28]} />
            <meshStandardMaterial color="#272732" />
          </mesh>
          {[-4.5, 0, 4.5].map((x) => (
            <mesh key={x} position={[x, -0.1, 0]}>
              <boxGeometry args={[1.6, 0.035, 0.12]} />
              <meshBasicMaterial color="#ffdc9f" />
            </mesh>
          ))}
        </group>
      ))}
      <group position={[3.2, 0, -1.2]}>
        <ModelBoundary key={avatar}>
          <Suspense fallback={null}>
            <ModelAvatar
              m={member}
              capacity={2}
              offset={0}
              reducedMotion={reduced}
              look={{ yaw: 0, pitch: 0, bodyYaw: 180 }}
            />
          </Suspense>
        </ModelBoundary>
      </group>
      <LobbyCamera selected={selected} reduced={reduced} />
    </Canvas>
  );
}
