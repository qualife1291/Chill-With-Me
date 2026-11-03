import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useEffect, type RefObject } from "react";
import * as THREE from "three";
import { seats, type Room, type Member } from "../shared/model";
import { screenMatrix } from "../shared/projection";
function position(m: Member, capacity: number, now: number) {
  const s = seats(capacity)[m.seat];
  if (!m.seated)
    return new THREE.Vector3(
      ((m.seat % 3) - 1) * 0.6,
      0,
      4 + (m.seat % 2) * 0.4,
    );
  const t = Math.min(1, Math.max(0, (now - (m.sitAt || 0)) / 5000));
  if (t < 0.55)
    return new THREE.Vector3(0, s.y * t, 4 + ((s.z - 4) * t) / 0.55);
  return new THREE.Vector3((s.x * (t - 0.55)) / 0.45, s.y, s.z);
}
function Avatar({
  m,
  capacity,
  offset,
  look,
}: {
  look: { yaw: number; pitch: number; bodyYaw: number };
  m: Member;
  capacity: number;
  offset: number;
}) {
  const group = useRef<THREE.Group>(null),
    neck = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [look.yaw, look.pitch, look.bodyYaw, invalidate]);
  const colors = ["#dfaf6b", "#829fbc", "#a99cce", "#77ad9c", "#d0878a"];
  useFrame(() => {
    if (group.current)
      group.current.position.copy(position(m, capacity, Date.now() + offset));
    if (group.current) {
      const desired = (-look.bodyYaw * Math.PI) / 180;
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        desired,
        0.18,
      );
      if (Math.abs(group.current.rotation.y - desired) > 0.001) invalidate();
    }
    if (neck.current) {
      neck.current.rotation.order = "YXZ";
      group.current!.userData.look = { ...look };
      const x = (look.pitch * Math.PI) / 180,
        y = (-look.yaw * Math.PI) / 180;
      neck.current.rotation.x = THREE.MathUtils.lerp(
        neck.current.rotation.x,
        x,
        0.18,
      );
      neck.current.rotation.y = THREE.MathUtils.lerp(
        neck.current.rotation.y,
        y,
        0.18,
      );
      if (
        Math.abs(neck.current.rotation.x - x) +
          Math.abs(neck.current.rotation.y - y) >
        0.001
      )
        invalidate();
    }
    if (m.seated && Date.now() + offset - (m.sitAt || 0) < 5000) invalidate();
  });
  return (
    <group ref={group} name={"avatar-" + m.id}>
      <group
        ref={neck}
        name={"head-" + m.id}
        position={[0, m.seated ? 1.29 : 1.44, 0]}
      >
        <mesh position={[0, 0.21, 0]}>
          <sphereGeometry args={[0.18, 16, 12]} />
          <meshStandardMaterial color="#d3a686" />
        </mesh>
        <mesh position={[0, 0.26, 0.105]} scale={[1, 1, 0.45]}>
          <sphereGeometry args={[0.158, 12, 8]} />
          <meshStandardMaterial color="#382b27" roughness={1} />
        </mesh>
        {[-0.176, 0.176].map((x) => (
          <mesh key={x} position={[x, 0.2, 0]} scale={[0.45, 1, 1]}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshStandardMaterial color="#c59b7a" />
          </mesh>
        ))}
        <mesh position={[0, 0.18, -0.176]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshStandardMaterial color="#bd8d70" />
        </mesh>
        {[-0.065, 0.065].map((x) => (
          <mesh key={x} position={[x, 0.25, -0.154]}>
            <sphereGeometry args={[0.022, 8, 6]} />
            <meshStandardMaterial color="#24232b" />
          </mesh>
        ))}
      </group>
      <mesh position={[0, m.seated ? 1.12 : 1.25, 0]}>
        <capsuleGeometry args={[0.19, 0.33, 4, 8]} />
        <meshStandardMaterial color={colors[m.seat % colors.length]} />
      </mesh>
      {[-0.13, 0.13].map((x) => (
        <group key={x}>
          {m.seated ? (
            <>
              <mesh position={[x, 0.61, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
                <capsuleGeometry args={[0.085, 0.3, 4, 8]} />
                <meshStandardMaterial color="#263244" />
              </mesh>
              <mesh position={[x, 0.3, -0.43]}>
                <capsuleGeometry args={[0.075, 0.34, 4, 8]} />
                <meshStandardMaterial color="#263244" />
              </mesh>
              <mesh position={[x, 0.075, -0.51]}>
                <boxGeometry args={[0.17, 0.12, 0.28]} />
                <meshStandardMaterial color="#171c27" />
              </mesh>
            </>
          ) : (
            <mesh position={[x, 0.63, 0]}>
              <capsuleGeometry args={[0.075, 0.8, 4, 8]} />
              <meshStandardMaterial color="#263244" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
function Chair({
  x,
  y,
  z,
  occupied,
}: {
  x: number;
  y: number;
  z: number;
  occupied: boolean;
}) {
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.76, 0.18, 0.66]} />
        <meshStandardMaterial
          color={occupied ? "#a54151" : "#652838"}
          roughness={0.9}
        />
      </mesh>
      <mesh position={[0, 0.85, 0.28]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[0.76, 0.85, 0.18]} />
        <meshStandardMaterial color="#7d3042" roughness={0.95} />
      </mesh>
      {[-0.44, 0.44].map((x) => (
        <mesh key={x} position={[x, 0.65, 0]}>
          <boxGeometry args={[0.12, 0.16, 0.8]} />
          <meshStandardMaterial color="#272932" />
        </mesh>
      ))}
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.5, 0.32, 0.4]} />
        <meshStandardMaterial color="#191c24" />
      </mesh>
    </group>
  );
}
function Camera({
  room,
  id,
  mode,
  offset,
  yaw,
  pitch,
  bodyYaw,
  controlsOpen,
  surface,
}: {
  yaw: number;
  pitch: number;
  bodyYaw: number;
  controlsOpen: boolean;
  surface: RefObject<HTMLDivElement | null>;
  room: Room;
  id: string;
  mode: string;
  offset: number;
}) {
  const { camera, size, invalidate } = useThree();
  useEffect(() => {
    invalidate();
  }, [yaw, pitch, bodyYaw, mode, controlsOpen, room.revision, invalidate]);
  const highest = Math.max(...seats(room.capacity).map((s) => s.y));
  const rearZ = Math.max(...seats(room.capacity).map((s) => s.z));
  const p = useMemo(() => new THREE.Vector3(), []);
  const smoothYaw = useRef(0),
    smoothPitch = useRef(0);
  useFrame((_, dt) => {
    const m = room.members.find((m) => m.id === id);
    if (!m) return;
    const base = position(m, room.capacity, Date.now() + offset);
    if (mode === "first")
      p.copy(base).add(new THREE.Vector3(0, m.seated ? 1.5 : 1.65, -0.08));
    else p.set(0, highest + 5, rearZ + 5.8);
    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = mode === "first" ? 60 : 30;
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
    camera.position.lerp(p, 1 - Math.exp(-dt * 5));
    smoothPitch.current +=
      (pitch - smoothPitch.current) * (1 - Math.exp(-dt * 6));
    smoothYaw.current +=
      (bodyYaw + yaw - smoothYaw.current) * (1 - Math.exp(-dt * 6));
    const look = new THREE.Vector3(0, 2.3, -5.7)
      .sub(camera.position)
      .applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        -(smoothYaw.current * Math.PI) / 180,
      );
    const right = new THREE.Vector3()
      .crossVectors(look, new THREE.Vector3(0, 1, 0))
      .normalize();
    look.applyAxisAngle(right, (smoothPitch.current * Math.PI) / 180);
    camera.lookAt(camera.position.clone().add(look));
    camera.updateMatrixWorld();
    if (
      camera.position.distanceTo(p) > 0.002 ||
      Math.abs(bodyYaw + yaw - smoothYaw.current) > 0.005 ||
      Math.abs(pitch - smoothPitch.current) > 0.005 ||
      (m.seated && Date.now() + offset - (m.sitAt || 0) < 5000)
    )
      invalidate();
    const el = surface.current;
    if (!el) return;
    el.dataset.camera = mode;
    el.dataset.yaw = smoothYaw.current.toFixed(2);
    el.dataset.pitch = smoothPitch.current.toFixed(2);
    el.dataset.seated = String(m.seated);
    const corners = [
      [-3.35, 4.184, -5.69],
      [3.35, 4.184, -5.69],
      [3.35, 0.416, -5.69],
      [-3.35, 0.416, -5.69],
    ].map((v) =>
      new THREE.Vector3(...(v as [number, number, number])).project(camera),
    );
    const points = corners.map((v) => ({
      x: ((v.x + 1) * size.width) / 2,
      y: ((1 - v.y) * size.height) / 2,
    }));
    const width =
      Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x));
    const height =
      Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));
    // Keep the entire player clear of the toolbar and expanded view controls.
    const short = size.height <= 480;
    const narrow = size.width <= 800;
    const safe = {
      left: 16,
      top: 72,
      right: controlsOpen && short ? 154 : 16,
      bottom: controlsOpen && !short ? (narrow ? 180 : 148) : 64,
    };
    // Tiny split views prioritize the video over generous padding.
    if (size.height - safe.top - safe.bottom < 200) {
      safe.top = 60;
      safe.bottom = 12;
    }
    const fits =
      corners.every((v) => v.z < 1 && v.z > -1) &&
      points.every(
        (p) =>
          p.x >= safe.left &&
          p.x <= size.width - safe.right &&
          p.y >= safe.top &&
          p.y <= size.height - safe.bottom,
      ) &&
      width >= 250 &&
      height >= 200;
    const mat = fits ? screenMatrix(points) : null;
    if (mat) {
      el.style.width = "640px";
      el.style.height = "360px";
      el.style.left = "0";
      el.style.top = "0";
      el.style.transform = "matrix3d(" + mat.join(",") + ")";
      el.dataset.mode = "projected";
    } else {
      const availableWidth = Math.max(1, size.width - safe.left - safe.right);
      const availableHeight = Math.max(1, size.height - safe.top - safe.bottom);
      const w = Math.min(availableWidth, 960, (availableHeight * 16) / 9);
      const h = (w * 9) / 16;
      el.style.width = w + "px";
      el.style.height = h + "px";
      el.style.left = safe.left + (availableWidth - w) / 2 + "px";
      el.style.top = safe.top + (availableHeight - h) / 2 + "px";
      el.style.transform = "none";
      el.dataset.mode = "docked";
    }
  });
  return null;
}
export default function Cinema({
  room,
  id,
  mode,
  offset,
  yaw,
  pitch,
  bodyYaw,
  controlsOpen,
  surface,
}: {
  yaw: number;
  pitch: number;
  bodyYaw: number;
  controlsOpen: boolean;
  surface: RefObject<HTMLDivElement | null>;
  room: Room;
  id: string;
  mode: string;
  offset: number;
}) {
  const layout = useMemo(() => seats(room.capacity), [room.capacity]);
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.3]}
      camera={{ position: [0, 3.3, 7], fov: 60 }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={["#11151f"]} />
      <fog attach="fog" args={["#11151f", 12, 25]} />
      <ambientLight intensity={room.playing ? 0.45 : 0.9} />
      <hemisphereLight args={["#c3d1ea", "#18121d", 1.1]} />
      <pointLight
        position={[0, 3, -4]}
        intensity={18}
        color="#a8bce6"
        distance={14}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
        <planeGeometry args={[12, 16]} />
        <meshStandardMaterial color="#251c28" roughness={1} />
      </mesh>
      <mesh position={[0, 2.3, -6]}>
        <boxGeometry args={[12, 5, 0.2]} />
        <meshStandardMaterial color="#1e2636" />
      </mesh>
      <mesh position={[0, 2.3, -5.8]}>
        <boxGeometry args={[6.7, 3.768, 0.08]} />
        <meshStandardMaterial
          color="#05070b"
          emissive="#000000"
          emissiveIntensity={0}
        />
      </mesh>
      {[-5.5, 5.5].map((x) => (
        <mesh key={x} position={[x, 2, 0]}>
          <boxGeometry args={[0.2, 4, 12]} />
          <meshStandardMaterial color="#29303e" />
        </mesh>
      ))}
      {Array.from(new Set(layout.map((s) => s.y)))
        .filter((y) => y > 0)
        .map((y) => {
          const row = layout.find((s) => s.y === y)!;
          return (
            <group key={"tier" + y}>
              {[-2.9, 2.9].map((x) => (
                <mesh key={x} position={[x, y / 2 - 0.04, row.z]}>
                  <boxGeometry args={[4.6, y, 1.8]} />
                  <meshStandardMaterial color="#302331" roughness={1} />
                </mesh>
              ))}
              {[0, 1, 2].map((i) => (
                <mesh
                  key={i}
                  position={[
                    0,
                    (y - 0.5 + (i + 1) / 6) / 2 - 0.04,
                    row.z - 0.6 + i * 0.6,
                  ]}
                >
                  <boxGeometry args={[1.2, y - 0.5 + (i + 1) / 6, 0.6]} />
                  <meshStandardMaterial color="#302331" />
                </mesh>
              ))}
              <mesh position={[0, y + 0.015, row.z - 0.91]}>
                <boxGeometry args={[10.4, 0.025, 0.035]} />
                <meshBasicMaterial color="#dba45f" />
              </mesh>
            </group>
          );
        })}
      {layout.map((s) => (
        <Chair
          key={s.id}
          {...s}
          occupied={room.members.some((m) => m.seat === s.id)}
        />
      ))}
      {[-0.6, 0.6].map((x) => (
        <mesh
          key={x}
          position={[x, 0.015, 1.2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.035, 7]} />
          <meshBasicMaterial color="#dba45f" />
        </mesh>
      ))}
      {room.members
        .filter((m) => mode !== "first" || m.id !== id)
        .map((m) => (
          <Avatar
            key={m.id}
            m={m}
            capacity={room.capacity}
            offset={offset}
            look={
              m.id === id
                ? { yaw, pitch, bodyYaw }
                : m.look || { yaw: 0, pitch: 0, bodyYaw: 0 }
            }
          />
        ))}
      <Camera
        room={room}
        id={id}
        mode={mode}
        offset={offset}
        yaw={yaw}
        pitch={pitch}
        bodyYaw={bodyYaw}
        controlsOpen={controlsOpen}
        surface={surface}
      />
    </Canvas>
  );
}
