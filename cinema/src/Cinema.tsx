import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, {
  Suspense,
  useMemo,
  useRef,
  useEffect,
  type RefObject,
} from "react";
import ModelAvatar from "./ModelAvatar";
import ModelBoundary from "./ModelBoundary";
import * as THREE from "three";
import { seats, type Room, type Member } from "../shared/model";
import { cameraView } from "../shared/camera";
import { screenMatrix } from "../shared/projection";
import { avatarMotion, avatarPosition } from "../shared/avatar";
function position(m: Member, capacity: number, now: number) {
  const p = avatarPosition(m, capacity, now);
  return new THREE.Vector3(p.x, p.y, p.z);
}
function ProceduralAvatar({
  m,
  capacity,
  offset,
  look,
}: {
  m: Member;
  capacity: number;
  offset: number;
  look: { yaw: number; pitch: number; bodyYaw: number };
}) {
  const group = useRef<THREE.Group>(null),
    torso = useRef<THREE.Group>(null),
    neck = useRef<THREE.Group>(null);
  const limbs = useRef<(THREE.Group | null)[]>([]);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [
    look.yaw,
    look.pitch,
    look.bodyYaw,
    m.sitAt,
    m.waveAt,
    m.seated,
    invalidate,
  ]);
  const shirt = ["#d9a558", "#6f9fc3", "#a797d0", "#68b39b", "#d88791"][
    m.seat % 5
  ];
  useFrame((_, dt) => {
    const now = Date.now() + offset,
      pose = avatarMotion(m, now);
    const root = group.current,
      body = torso.current;
    if (!root || !body || !neck.current) return;
    root.position.copy(position(m, capacity, now));
    // Face the direction of travel, then turn towards the screen before sitting.
    const next = avatarPosition(m, capacity, now + 20);
    const dx = next.x - root.position.x,
      dz = next.z - root.position.z;
    const desired =
      pose.walking && Math.hypot(dx, dz) > 0.00001
        ? Math.atan2(-dx, -dz)
        : (-look.bodyYaw * Math.PI) / 180;
    const delta = Math.atan2(
      Math.sin(desired - root.rotation.y),
      Math.cos(desired - root.rotation.y),
    );
    root.rotation.y += delta * (1 - Math.exp(-dt * 10));
    body.position.y =
      0.94 -
      pose.sitting * 0.38 +
      (pose.walking ? Math.abs(pose.stride) * 0.035 : 0);
    neck.current.rotation.order = "YXZ";
    const x = (look.pitch * Math.PI) / 180,
      y = (-look.yaw * Math.PI) / 180;
    neck.current.rotation.x = THREE.MathUtils.damp(
      neck.current.rotation.x,
      x,
      10,
      dt,
    );
    neck.current.rotation.y = THREE.MathUtils.damp(
      neck.current.rotation.y,
      y,
      10,
      dt,
    );
    root.userData.look = { ...look };
    root.userData.action = pose.waving
      ? "wave"
      : pose.walking
        ? "walk"
        : pose.sitting === 1
          ? "sit"
          : "stand";
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1;
      const hip = limbs.current[side],
        knee = limbs.current[side + 2],
        arm = limbs.current[side + 4],
        elbow = limbs.current[side + 6];
      if (hip)
        hip.rotation.x = (pose.sitting * Math.PI) / 2 + pose.stride * sign;
      if (knee)
        knee.rotation.x =
          (-pose.sitting * Math.PI) / 2 -
          Math.max(0, -pose.stride * sign) * 0.65;
      if (arm) {
        arm.rotation.x = -pose.stride * sign * 0.7 + pose.sitting * 0.25;
        arm.rotation.z = sign * (0.12 + (side === 1 ? pose.wave * 2.35 : 0));
      }
      if (elbow) elbow.rotation.z = side === 1 ? pose.hand : 0;
    }
    if (
      pose.moving ||
      Math.abs(delta) > 0.001 ||
      Math.abs(neck.current.rotation.x - x) +
        Math.abs(neck.current.rotation.y - y) >
        0.001
    )
      invalidate();
  });
  return (
    <group ref={group} name={"avatar-" + m.id}>
      <group ref={torso} position={[0, 0.94, 0]}>
        <mesh position={[0, 0.25, 0]} scale={[1, 1, 0.7]}>
          <capsuleGeometry args={[0.21, 0.23, 4, 10]} />
          <meshStandardMaterial color={shirt} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.34, 0.14, 0.25]} />
          <meshStandardMaterial color="#263244" />
        </mesh>
        <group ref={neck} position={[0, 0.53, 0]} name={"head-" + m.id}>
          <mesh position={[0, 0.17, 0]} scale={[0.95, 1.06, 0.95]}>
            <sphereGeometry args={[0.185, 16, 12]} />
            <meshStandardMaterial color="#d3a686" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.26, 0.045]} scale={[1, 0.7, 0.9]}>
            <sphereGeometry args={[0.18, 12, 8]} />
            <meshStandardMaterial color="#382b27" roughness={1} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side}>
              <mesh position={[side * 0.18, 0.17, 0]} scale={[0.45, 1, 1]}>
                <sphereGeometry args={[0.045, 8, 6]} />
                <meshStandardMaterial color="#c59b7a" />
              </mesh>
              <mesh position={[side * 0.064, 0.19, -0.16]}>
                <sphereGeometry args={[0.024, 8, 6]} />
                <meshStandardMaterial color="#24232b" />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.14, -0.18]}>
            <sphereGeometry args={[0.032, 8, 6]} />
            <meshStandardMaterial color="#bd8d70" />
          </mesh>
        </group>
        {[-1, 1].map((side, i) => (
          <group key={side}>
            <group
              position={[side * 0.11, 0, 0]}
              ref={(el) => {
                limbs.current[i] = el;
              }}
            >
              <mesh position={[0, -0.21, 0]}>
                <capsuleGeometry args={[0.078, 0.28, 4, 8]} />
                <meshStandardMaterial color="#263244" />
              </mesh>
              <group
                position={[0, -0.42, 0]}
                ref={(el) => {
                  limbs.current[i + 2] = el;
                }}
              >
                <mesh position={[0, -0.18, 0]}>
                  <capsuleGeometry args={[0.065, 0.26, 4, 8]} />
                  <meshStandardMaterial color="#354359" />
                </mesh>
                <mesh position={[0, -0.44, -0.065]}>
                  <boxGeometry args={[0.16, 0.12, 0.28]} />
                  <meshStandardMaterial color="#161e2b" />
                </mesh>
              </group>
            </group>
            <group
              position={[side * 0.25, 0.4, 0]}
              ref={(el) => {
                limbs.current[i + 4] = el;
              }}
            >
              <mesh position={[0, -0.14, 0]}>
                <capsuleGeometry args={[0.065, 0.18, 4, 8]} />
                <meshStandardMaterial color={shirt} />
              </mesh>
              <group
                position={[0, -0.28, 0]}
                ref={(el) => {
                  limbs.current[i + 6] = el;
                }}
              >
                <mesh position={[0, -0.12, 0]}>
                  <capsuleGeometry args={[0.05, 0.15, 4, 8]} />
                  <meshStandardMaterial color="#d3a686" />
                </mesh>
                <mesh position={[0, -0.26, 0]}>
                  <sphereGeometry args={[0.062, 8, 6]} />
                  <meshStandardMaterial color="#d3a686" />
                </mesh>
              </group>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}
function Avatar(props: React.ComponentProps<typeof ModelAvatar>) {
  const fallback = <ProceduralAvatar {...props} />;
  return (
    <ModelBoundary key={props.m.avatar || "male"} fallback={fallback}>
      <Suspense fallback={fallback}>
        <ModelAvatar {...props} />
      </Suspense>
    </ModelBoundary>
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
      <mesh position={[0, 0.79, 0.28]} rotation={[-0.08, 0, 0]}>
        <boxGeometry args={[0.76, 0.62, 0.18]} />
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
  reducedMotion,
  surface,
}: {
  yaw: number;
  pitch: number;
  bodyYaw: number;
  controlsOpen: boolean;
  reducedMotion: boolean;
  surface: RefObject<HTMLDivElement | null>;
  room: Room;
  id: string;
  mode: string;
  offset: number;
}) {
  const { camera, size, invalidate, gl } = useThree();
  useEffect(() => {
    invalidate();
  }, [
    yaw,
    pitch,
    bodyYaw,
    mode,
    controlsOpen,
    reducedMotion,
    room.revision,
    invalidate,
  ]);
  const aim = useMemo(() => new THREE.Vector3(0, 1.25, -5.7), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const smoothYaw = useRef(0),
    smoothPitch = useRef(0);
  useFrame((_, dt) => {
    gl.domElement.dataset.renderFrame = String(gl.info.render.frame);
    const m = room.members.find((m) => m.id === id);
    if (!m) return;
    const now = Date.now() + offset;
    const view = cameraView(
      room.capacity,
      m,
      mode,
      reducedMotion && m.seated ? Math.max(now, (m.sitAt || 0) + 5000) : now,
    );
    p.set(view.position[0], view.position[1], view.position[2]);
    const desiredAim = new THREE.Vector3(
      view.target[0],
      view.target[1],
      view.target[2],
    );
    const blend = reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
    camera.position.lerp(p, blend);
    aim.lerp(desiredAim, blend);
    let lensMoving = false;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = reducedMotion
        ? view.fov
        : THREE.MathUtils.damp(camera.fov, view.fov, 5, dt);
      lensMoving = Math.abs(camera.fov - view.fov) > 0.01;
      camera.updateProjectionMatrix();
    }
    const headBlend = reducedMotion ? 1 : 1 - Math.exp(-dt * 6);
    smoothPitch.current += (pitch - smoothPitch.current) * headBlend;
    smoothYaw.current += (bodyYaw + yaw - smoothYaw.current) * headBlend;
    const look = aim
      .clone()
      .sub(camera.position)
      .applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        (-smoothYaw.current * Math.PI) / 180,
      );
    const right = new THREE.Vector3()
      .crossVectors(look, new THREE.Vector3(0, 1, 0))
      .normalize();
    look.applyAxisAngle(right, (smoothPitch.current * Math.PI) / 180);
    camera.lookAt(camera.position.clone().add(look));
    camera.updateMatrixWorld();
    if (
      camera.position.distanceTo(p) > 0.002 ||
      aim.distanceTo(desiredAim) > 0.002 ||
      lensMoving ||
      Math.abs(bodyYaw + yaw - smoothYaw.current) > 0.005 ||
      Math.abs(pitch - smoothPitch.current) > 0.005 ||
      (m.seated && Date.now() + offset - (m.sitAt || 0) < 5000)
    )
      invalidate();
    const el = surface.current;
    if (!el) return;
    el.dataset.camera = mode;
    el.dataset.avatar = m.avatar || "male";
    el.dataset.transitioning = String(
      camera.position.distanceTo(p) > 0.002 ||
        aim.distanceTo(desiredAim) > 0.002 ||
        lensMoving,
    );
    el.dataset.yaw = smoothYaw.current.toFixed(2);
    el.dataset.pitch = smoothPitch.current.toFixed(2);
    el.dataset.seated = String(m.seated);
    const pose = avatarMotion(m, Date.now() + offset);
    el.dataset.action = pose.waving
      ? "wave"
      : pose.walking
        ? "walk"
        : pose.sitting === 1
          ? "sit"
          : "stand";
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
      bottom: controlsOpen && !short ? (narrow ? 210 : 180) : 64,
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
    const mat =
      fits && mode !== "side" && mode !== "shoulder"
        ? screenMatrix(points)
        : null;
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
      const social = mode === "side" || mode === "shoulder";
      const w = Math.min(
        availableWidth,
        social && !narrow ? 600 : 960,
        (availableHeight * (social && !narrow ? 0.4 : 1) * 16) / 9,
      );
      const h = (w * 9) / 16;
      el.style.width = w + "px";
      el.style.height = h + "px";
      el.style.left = safe.left + (availableWidth - w) / 2 + "px";
      el.style.top = safe.top + (social ? 0 : (availableHeight - h) / 2) + "px";
      el.style.transform = "none";
      el.dataset.mode = "docked";
    }
  });
  return null;
}
function TheatreInterior() {
  return (
    <group>
      <directionalLight position={[0, 5, 6]} intensity={1.5} color="#a7c5e9" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <pointLight
            position={[side * 4.4, 3.1, 1.5]}
            intensity={12}
            distance={12}
            color="#ffcb8a"
          />
          {[-3.5, 0, 3.5].map((z) => (
            <group key={z} position={[side * 5.32, 2.3, z]}>
              <mesh>
                <boxGeometry args={[0.08, 3.4, 2.6]} />
                <meshStandardMaterial color="#343248" roughness={0.95} />
              </mesh>
              <mesh position={[-side * 0.065, 0.2, 0]}>
                <boxGeometry args={[0.05, 0.7, 0.07]} />
                <meshBasicMaterial color="#f7c281" />
              </mesh>
              <mesh position={[-side * 0.08, -1.58, 0]}>
                <boxGeometry args={[0.06, 0.035, 2.6]} />
                <meshBasicMaterial color="#bf8553" />
              </mesh>
            </group>
          ))}
          <mesh position={[side * 3.55, 2.3, -5.62]}>
            <boxGeometry args={[0.16, 4.25, 0.16]} />
            <meshStandardMaterial
              color="#c38d52"
              metalness={0.6}
              roughness={0.35}
            />
          </mesh>
          <mesh position={[side * 4.55, 2.4, -5.5]}>
            <boxGeometry args={[1.45, 4.8, 0.25]} />
            <meshStandardMaterial color="#552b45" roughness={1} />
          </mesh>
        </group>
      ))}
      {[0.28, 4.32].map((y) => (
        <mesh key={y} position={[0, y, -5.62]}>
          <boxGeometry args={[7.25, 0.12, 0.14]} />
          <meshStandardMaterial
            color="#b88b58"
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
      ))}
      {[-3, 0, 3, 6].map((z) => (
        <group key={z} position={[0, 5.35, z]}>
          <mesh>
            <boxGeometry args={[11.2, 0.14, 0.28]} />
            <meshStandardMaterial color="#302d40" />
          </mesh>
          {[-3.5, 3.5].map((x) => (
            <mesh key={x} position={[x, -0.09, 0]}>
              <boxGeometry args={[1.5, 0.035, 0.12]} />
              <meshBasicMaterial color="#f8d3a1" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
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
  reducedMotion,
  surface,
}: {
  yaw: number;
  pitch: number;
  bodyYaw: number;
  controlsOpen: boolean;
  reducedMotion: boolean;
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
      <TheatreInterior />
      <color attach="background" args={["#11151f"]} />
      <fog attach="fog" args={["#11151f", 18, 38]} />
      <ambientLight intensity={room.playing ? 0.65 : 1.0} />
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
            reducedMotion={reducedMotion}
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
        reducedMotion={reducedMotion}
        surface={surface}
      />
    </Canvas>
  );
}
