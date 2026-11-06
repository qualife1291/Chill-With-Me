import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import ModelAvatar from "./ModelAvatar";
import Cushion from "./RoundedGeometry";
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
      <color attach="background" args={["#182326"]} />
      <fog attach="fog" args={["#182326", 18, 35]} />
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
        <meshStandardMaterial color="#333b3a" roughness={0.48} />
      </mesh>
      <mesh position={[0, 2.3, -4.2]}>
        <boxGeometry args={[16, 4.6, 0.25]} />
        <meshStandardMaterial color="#223735" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 1]}>
        <planeGeometry args={[8.6, 12]} />
        <meshStandardMaterial color="#51605a" roughness={1} />
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
              <Cushion width={2.05} height={2.8} depth={0.2} />
              <meshStandardMaterial
                color={active ? "#8a7359" : "#3e514b"}
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
      {/* Lounge islands: soft upholstery, timber, brass and foliage. */}
      {[-5.6, 5.6].map((x) => (
        <group key={x} position={[x, 0, 0.7]}>
          <mesh position={[0, 0.26, 0]}>
            <boxGeometry args={[2.3, 0.13, 1.05]} />
            <meshStandardMaterial color="#b2936a" roughness={0.55} />
          </mesh>
          {[-0.58, 0.58].map((dx) => (
            <mesh key={dx} position={[dx, 0.43, 0]} scale={[1.04, 0.22, 0.87]}>
              <sphereGeometry args={[0.65, 20, 12]} />
              <meshStandardMaterial color="#819487" roughness={0.95} />
            </mesh>
          ))}
          {[-0.9, 0.9].map((dx) => (
            <mesh key={dx} position={[dx, 0.13, 0]}>
              <cylinderGeometry args={[0.04, 0.05, 0.26, 8]} />
              <meshStandardMaterial
                color="#cba671"
                metalness={0.55}
                roughness={0.4}
              />
            </mesh>
          ))}
          <mesh position={[0, 0.71, -0.34]}>
            <Cushion width={2.2} height={0.48} depth={0.18} />
            <meshStandardMaterial color="#6e887a" roughness={0.95} />
          </mesh>
          <group position={[0, 0, -1.6]}>
            <mesh position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.3, 0.23, 0.5, 20]} />
              <meshStandardMaterial color="#c5b29b" roughness={0.85} />
            </mesh>
            {Array.from({ length: 7 }, (_, i) => (
              <group key={i} rotation={[0, (i * Math.PI * 2) / 7, 0]}>
                <mesh
                  position={[0, 0.85, 0.18]}
                  rotation={[0.3, 0, 0]}
                  scale={[0.16, 0.64, 0.07]}
                >
                  <sphereGeometry args={[1, 12, 10]} />
                  <meshStandardMaterial
                    color={i % 2 ? "#537d65" : "#779b76"}
                    roughness={0.85}
                  />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      ))}
      {/* Narrow timber fluting catches soft light without texture downloads. */}
      {Array.from({ length: 43 }, (_, i) =>
        i % 9 < 3 ? null : (
          <mesh key={i} position={[-7.4 + i * 0.35, 2.3, -4.03]}>
            <boxGeometry args={[0.065, 4.6, 0.07]} />
            <meshStandardMaterial color="#65746a" roughness={0.75} />
          </mesh>
        ),
      )}
      {[-3.15, 0, 3.15].map((x) => (
        <group key={x} position={[x, 3.8, -1]}>
          <mesh>
            <cylinderGeometry args={[0.025, 0.025, 2.1, 8]} />
            <meshStandardMaterial color="#bca079" metalness={0.6} />
          </mesh>
          <mesh position={[0, -0.62, 0]}>
            <sphereGeometry args={[0.2, 20, 12]} />
            <meshBasicMaterial color="#ffe6bc" />
          </mesh>
          <mesh position={[0, -0.52, 0]}>
            <cylinderGeometry args={[0.34, 0.38, 0.12, 24]} />
            <meshStandardMaterial
              color="#b99b6e"
              metalness={0.6}
              roughness={0.35}
            />
          </mesh>
        </group>
      ))}
      {[-2, 1, 4].map((z) => (
        <group key={z} position={[0, 5.35, z]}>
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
              preview
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
