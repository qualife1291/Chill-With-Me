import Seating from "./Seating";
import Walkways from "./Walkways";
import SceneRecovery from "./SceneRecovery";
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
import { type Room, type Member } from "../shared/model";
import { cameraView, orbitView } from "../shared/camera";
import { SCREEN, screenCorners, screenClipMatrix } from "../shared/projection";
import { avatarMotion, avatarPosition, aisleHeight } from "../shared/avatar";
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
    m.pokedAt,
    m.seated,
    invalidate,
  ]);
  const shirt = m.appearance?.clothing || "#6f9fc3";
  useFrame((_, dt) => {
    const now = Date.now() + offset,
      pose = avatarMotion(m, now);
    const root = group.current,
      body = torso.current;
    if (!root || !body || !neck.current) return;
    root.position.copy(position(m, capacity, now));
    root.position.y += Math.abs(pose.reaction) * 0.08;
    // Face the direction of travel, then turn towards the screen before sitting.
    const next = avatarPosition(m, capacity, now + 20);
    const dx = next.x - root.position.x,
      dz = next.z - root.position.z;
    const desired =
      pose.walking && Math.hypot(dx, dz) > 0.00001
        ? Math.atan2(-dx, -dz)
        : m.seated
          ? 0
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
            <meshStandardMaterial
              color={m.appearance?.hair || "#382b27"}
              roughness={1}
            />
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
function Camera({
  room,
  id,
  mode,
  offset,
  yaw,
  pitch,
  bodyYaw,
  controlsOpen,
  zoom,
  reducedMotion,
  surface,
}: {
  yaw: number;
  pitch: number;
  bodyYaw: number;
  controlsOpen: boolean;
  zoom: number;
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
    zoom,
    controlsOpen,
    reducedMotion,
    room.revision,
    invalidate,
  ]);
  const aim = useMemo(() => new THREE.Vector3(0, 1.25, -5.7), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const math = useMemo(
    () => ({
      target: new THREE.Vector3(),
      look: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      vp: new THREE.Matrix4(),
      point: new THREE.Vector4(),
      corners: screenCorners(),
      points: Array.from({ length: 4 }, () => ({ x: 0, y: 0 })),
    }),
    [],
  );
  const lastProjection = useRef("");
  const smoothYaw = useRef(0),
    smoothPitch = useRef(0);
  useFrame((_, dt) => {
    gl.domElement.dataset.renderFrame = String(gl.info.render.frame);
    gl.domElement.dataset.renderStats = JSON.stringify({
      calls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      geometries: gl.info.memory.geometries,
      textures: gl.info.memory.textures,
    });
    const m = room.members.find((m) => m.id === id);
    if (!m) return;
    const now = Date.now() + offset;
    const view = cameraView(
      room.capacity,
      m,
      mode,
      reducedMotion && m.seated ? Math.max(now, (m.sitAt || 0) + 5000) : now,
    );
    const desiredAim = math.target;
    const headBlend = reducedMotion ? 1 : 1 - Math.exp(-dt * 6);
    smoothPitch.current += (pitch - smoothPitch.current) * headBlend;
    smoothYaw.current += (bodyYaw + yaw - smoothYaw.current) * headBlend;
    const selected =
      mode === "first"
        ? view
        : orbitView(
            room.capacity,
            smoothYaw.current,
            smoothPitch.current,
            zoom,
            size.width / size.height,
          );
    p.set(selected.position[0], selected.position[1], selected.position[2]);
    desiredAim.set(selected.target[0], selected.target[1], selected.target[2]);
    const blend = reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
    camera.position.lerp(p, blend);
    aim.lerp(desiredAim, blend);
    const fov = THREE.MathUtils.clamp(
      selected.fov + (mode === "first" ? zoom : 0),
      32,
      80,
    );
    let lensMoving = false;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = reducedMotion
        ? fov
        : THREE.MathUtils.damp(camera.fov, fov, 5, dt);
      lensMoving = Math.abs(camera.fov - fov) > 0.01;
      camera.updateProjectionMatrix();
    }
    const look = math.look.copy(aim).sub(camera.position);
    if (mode === "first") {
      look.applyAxisAngle(math.up, (-smoothYaw.current * Math.PI) / 180);
      math.right.crossVectors(look, math.up).normalize();
      look.applyAxisAngle(math.right, (smoothPitch.current * Math.PI) / 180);
    }
    camera.lookAt(math.target.copy(camera.position).add(look));
    desiredAim.set(selected.target[0], selected.target[1], selected.target[2]);
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
    el.dataset.fov =
      camera instanceof THREE.PerspectiveCamera ? camera.fov.toFixed(2) : "0";
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
    math.vp.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    let front = 0;
    for (let i = 0; i < 4; i++) {
      const v = math.corners[i],
        c = math.point.set(v[0], v[1], v[2], 1).applyMatrix4(math.vp);
      if (c.w > 0) front++;
      math.points[i].x = ((c.x / c.w + 1) * size.width) / 2;
      math.points[i].y = ((1 - c.y / c.w) * size.height) / 2;
    }
    const matrix = screenClipMatrix(math.vp.elements, size.width, size.height);
    const transform =
      "matrix3d(" + matrix.map((n) => n.toFixed(8)).join(",") + ")";
    if (lastProjection.current !== transform) {
      el.style.width = "640px";
      el.style.height = "360px";
      el.style.left = "0";
      el.style.top = "0";
      el.style.transform = transform;
      lastProjection.current = transform;
      el.dataset.corners = JSON.stringify(math.points);
      el.dataset.viewProjection = JSON.stringify(math.vp.elements);
      el.dataset.clipW = JSON.stringify(
        math.corners.map(
          (v) => math.point.set(v[0], v[1], v[2], 1).applyMatrix4(math.vp).w,
        ),
      );
    }
    el.style.visibility = front ? "visible" : "hidden";
    el.style.pointerEvents = front ? "auto" : "none";
    el.dataset.mode = front ? "projected" : "offscreen";
  });
  return null;
}
const TheatreInterior = React.memo(function TheatreInterior({
  capacity,
}: {
  capacity: number;
}) {
  return (
    <group>
      <directionalLight position={[0, 5, 6]} intensity={1.5} color="#ede5d6" />
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
                <meshStandardMaterial color="#263b38" roughness={0.95} />
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
        </group>
      ))}
      {[-3, 0, 3, 6].map((z) => (
        <group key={z} position={[0, 6.45, z]}>
          <mesh>
            <boxGeometry args={[11.2, 0.14, 0.28]} />
            <meshStandardMaterial color="#21302c" />
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
});
export default function Cinema({
  room,
  id,
  mode,
  offset,
  yaw,
  pitch,
  bodyYaw,
  controlsOpen,
  zoom,
  reducedMotion,
  surface,
  dpr,
  onUnavailable,
}: {
  dpr: number;
  onUnavailable: () => void;
  yaw: number;
  pitch: number;
  bodyYaw: number;
  controlsOpen: boolean;
  zoom: number;
  reducedMotion: boolean;
  surface: RefObject<HTMLDivElement | null>;
  room: Room;
  id: string;
  mode: string;
  offset: number;
}) {
  const occupied = room.members
    .map((m) => m.seat)
    .sort((a, b) => a - b)
    .join(",");
  return (
    <Canvas
      frameloop="demand"
      dpr={dpr}
      camera={{ position: [0, 3.3, 7], fov: 60, near: 0.15, far: 80 }}
      gl={{ antialias: true, alpha: true }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
      }}
    >
      <SceneRecovery onUnavailable={onUnavailable} />
      <TheatreInterior capacity={room.capacity} />
      <color attach="background" args={["#101b19"]} />
      <fog attach="fog" args={["#101b19", 18, 38]} />
      <ambientLight intensity={0.8} />
      <hemisphereLight args={["#c3d1ea", "#18121d", 1.1]} />
      <pointLight
        position={[0, 3, -4]}
        intensity={12}
        color="#a8bce6"
        distance={14}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <planeGeometry args={[12, 16]} />
        <meshStandardMaterial color="#202b29" roughness={1} />
      </mesh>
      <mesh position={[0, 3.2, -6]}>
        <boxGeometry args={[12, 6.4, 0.2]} />
        <meshStandardMaterial color="#152422" />
      </mesh>
      {/* Native media lives below WebGL. This transparent depth-writing plane
          opens the screen only where foreground avatars/chairs do not occlude it. */}
      <mesh position={[0, SCREEN.y, SCREEN.z]}>
        <planeGeometry args={[SCREEN.width, SCREEN.height]} />
        <meshBasicMaterial
          color="#000000"
          opacity={0}
          transparent
          blending={THREE.NoBlending}
          depthWrite
          depthTest
          toneMapped={false}
          fog={false}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[
              side * (SCREEN.width / 2 + 0.12),
              SCREEN.y,
              SCREEN.z - 0.05,
            ]}
          >
            <boxGeometry args={[0.16, SCREEN.height + 0.35, 0.18]} />
            <meshStandardMaterial
              color="#9b7750"
              metalness={0.45}
              roughness={0.42}
            />
          </mesh>
          <mesh position={[side * 5.1, 3.1, -5.82]}>
            <boxGeometry args={[1.1, 6.2, 0.18]} />
            <meshStandardMaterial color="#263b38" roughness={1} />
          </mesh>
          <mesh
            position={[
              side * (SCREEN.width / 2 + 0.03),
              SCREEN.y,
              SCREEN.z + 0.01,
            ]}
          >
            <boxGeometry args={[0.025, SCREEN.height + 0.06, 0.025]} />
            <meshBasicMaterial color="#e9d0a7" />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            0,
            SCREEN.y + side * (SCREEN.height / 2 + 0.12),
            SCREEN.z - 0.05,
          ]}
        >
          <boxGeometry args={[SCREEN.width + 0.4, 0.16, 0.18]} />
          <meshStandardMaterial
            color="#9b7750"
            metalness={0.45}
            roughness={0.42}
          />
        </mesh>
      ))}
      {[-5.32, 5.32].map((x) => (
        <group key={"cove" + x}>
          <mesh position={[x, 3.8, 0]}>
            <boxGeometry args={[0.04, 0.035, 10]} />
            <meshBasicMaterial color="#b29b80" />
          </mesh>
          {[-2, 0, 2, 4].map((z) => (
            <mesh
              key={z}
              position={[x, aisleHeight(room.capacity, z) + 0.12, z]}
            >
              <boxGeometry args={[0.045, 0.06, 0.32]} />
              <meshBasicMaterial color="#cda875" />
            </mesh>
          ))}
        </group>
      ))}
      {[-5.5, 5.5].map((x) => (
        <mesh key={x} position={[x, 3.1, 0]}>
          <boxGeometry args={[0.2, 6.2, 12]} />
          <meshStandardMaterial color="#29303e" />
        </mesh>
      ))}
      <Walkways capacity={room.capacity} />
      <Seating
        capacity={room.capacity}
        sofa={room.seating === "sofa"}
        occupied={occupied}
      />
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
                ? {
                    yaw: THREE.MathUtils.clamp(yaw, -75, 75),
                    pitch: THREE.MathUtils.clamp(pitch, -45, 35),
                    bodyYaw,
                  }
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
        zoom={zoom}
        reducedMotion={reducedMotion}
        surface={surface}
      />
    </Canvas>
  );
}
