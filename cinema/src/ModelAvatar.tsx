import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  avatarMotion,
  avatarPosition,
  smoothHeadAngle,
} from "../shared/avatar";
import type { Member } from "../shared/model";
export default function ModelAvatar({
  m,
  capacity,
  offset,
  look,
  reducedMotion = false,
  preview = false,
}: {
  m: Member;
  capacity: number;
  offset: number;
  look: { yaw: number; pitch: number; bodyYaw: number };
  reducedMotion?: boolean;
  preview?: boolean;
}) {
  const style = m.avatar || "male";
  const gltf = useLoader(GLTFLoader, `/models/${style}.glb`);
  const { invalidate, gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const initialized = useRef(false);
  const gaze = useRef({ yaw: look.yaw, pitch: look.pitch });
  const rig = useMemo(() => {
    const scene = cloneSkeleton(gltf.scene);
    // SkeletonUtils clones one skeleton per skinned part. Equal inverse binds
    // now share a single per-avatar skeleton/texture after scene quantization.
    const skeletons: THREE.Skeleton[] = [];
    scene.traverse((node) => {
      if (!(node as THREE.SkinnedMesh).isSkinnedMesh) return;
      const mesh = node as THREE.SkinnedMesh,
        s = mesh.skeleton;
      const shared = skeletons.find(
        (v) =>
          v.bones.length === s.bones.length &&
          v.bones.every(
            (b, i) =>
              b === s.bones[i] && v.boneInverses[i].equals(s.boneInverses[i]),
          ),
      );
      if (shared) mesh.skeleton = shared;
      else skeletons.push(s);
    });
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(scene);
    const scale = 1.7 / Math.max(bounds.max.y - bounds.min.y, 0.001);
    const mixer = new THREE.AnimationMixer(scene);
    const actions = Object.fromEntries(
      gltf.animations.map((clip) => {
        const action = mixer.clipAction(clip);
        action.play();
        action.paused = true;
        action.setEffectiveWeight(0);
        return [clip.name, { action, duration: clip.duration }];
      }),
    );
    const materials: THREE.MeshStandardMaterial[] = [];
    const colors = {
      clothing: { value: new THREE.Color() },
      hair: { value: new THREE.Color() },
      enabled: { value: 0 },
    };
    const variants = new Map<string, THREE.MeshStandardMaterial>();
    scene.traverse((node) => {
      if (!(node as THREE.Mesh).isMesh) return;
      const mesh = node as THREE.Mesh;
      const original = mesh.material as THREE.MeshStandardMaterial;
      const head = node.name.toLowerCase().includes("head");
      const key = original.uuid + String(head);
      let material = variants.get(key);
      if (!material) {
        material = original.clone();
        material.roughness = 0.88;
        material.onBeforeCompile = (shader) => {
          shader.uniforms.customClothing = colors.clothing;
          shader.uniforms.customHair = colors.hair;
          shader.uniforms.customEnabled = colors.enabled;
          shader.fragmentShader =
            "uniform vec3 customClothing; uniform vec3 customHair; uniform float customEnabled;\n" +
            shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <map_fragment>",
            `#include <map_fragment>
            #ifdef USE_MAP
            if(customEnabled > 0.5) {
              vec2 uv = vMapUv;
              bool hairCell = uv.x > 0.125 && uv.x < 0.25 && uv.y < 0.25;
              bool clothCell = (uv.x < 0.25 && uv.y > 0.25 && uv.y < 0.5) || ${style === "male" ? "(uv.x > 0.25 && uv.x < 0.375 && uv.y > 0.5 && uv.y < 0.75)" : "(uv.x > 0.125 && uv.x < 0.375 && uv.y > 0.5 && uv.y < 0.75) || (uv.x < 0.125 && uv.y > 0.75)"};
              if(${head ? "hairCell" : "clothCell"}) {
                float shade = clamp(max(max(diffuseColor.r,diffuseColor.g),diffuseColor.b) * 1.6, 0.22, 1.0);
                diffuseColor.rgb = ${head ? "customHair" : "customClothing"} * shade;
              }
            }
            #endif`,
          );
        };
        material.customProgramCacheKey = () =>
          "avatar-palette-" + style + "-" + head;
        variants.set(key, material);
        materials.push(material);
      }
      mesh.material = material;
    });
    const bones = new Map<string, THREE.Bone>();
    scene.traverse((node) => {
      if ((node as THREE.Bone).isBone)
        bones.set(
          node.name.replace(/[_.]/g, "").toLowerCase(),
          node as THREE.Bone,
        );
    });
    return {
      scene,
      scale,
      floor: -bounds.min.y,
      mixer,
      actions,
      bones,
      materials,
      colors,
    };
  }, [gltf]);
  useEffect(() => {
    const custom = m.appearance;
    rig.colors.enabled.value = custom ? 1 : 0;
    if (custom) {
      rig.colors.clothing.value.set(custom.clothing);
      rig.colors.hair.value.set(custom.hair);
    }
    gl.domElement.dataset[style + "Appearance"] = JSON.stringify(
      custom || null,
    );
    invalidate();
  }, [rig, m.appearance?.clothing, m.appearance?.hair, gl, style, invalidate]);
  const overlays = useMemo(() => {
    const entries = new Map<THREE.Bone, THREE.Quaternion>();
    for (const name of ["head", "upperarmr", "lowerarmr"]) {
      const bone = rig.bones.get(name);
      if (bone) entries.set(bone, bone.quaternion.clone());
    }
    return entries;
  }, [rig]);
  const actionEntries = useMemo(() => Object.values(rig.actions), [rig]);
  useEffect(() => {
    gl.domElement.dataset[style + "Model"] = "ready";
    invalidate();
    return () => {
      rig.materials.forEach((material) => material.dispose());
      rig.mixer.stopAllAction();
      rig.mixer.uncacheRoot(rig.scene);
      const skeletons = new Set<THREE.Skeleton>();
      rig.scene.traverse((node) => {
        if ((node as THREE.SkinnedMesh).isSkinnedMesh)
          skeletons.add((node as THREE.SkinnedMesh).skeleton);
      });
      skeletons.forEach((skeleton) => skeleton.dispose());
    };
  }, [rig, gl, style, invalidate]);
  useEffect(() => {
    invalidate();
  }, [
    m.sitAt,
    m.waveAt,
    m.pokedAt,
    m.seated,
    look.yaw,
    look.pitch,
    look.bodyYaw,
    reducedMotion,
    invalidate,
  ]);
  const math = useMemo(
    () => ({
      world: new THREE.Quaternion(),
      parent: new THREE.Quaternion(),
      base: new THREE.Quaternion(),
      delta: new THREE.Quaternion(),
      axis: new THREE.Vector3(),
      x: new THREE.Vector3(1, 0, 0),
      y: new THREE.Vector3(0, 1, 0),
      z: new THREE.Vector3(0, 0, 1),
    }),
    [],
  );
  const rotate = (
    bone: THREE.Bone | undefined,
    axis: THREE.Vector3,
    angle: number,
  ) => {
    if (!bone || !angle) return;
    rig.scene.getWorldQuaternion(math.base);
    math.axis.copy(axis).applyQuaternion(math.base);
    math.delta.setFromAxisAngle(math.axis, angle);
    bone.getWorldQuaternion(math.world).premultiply(math.delta);
    if (bone.parent) {
      bone.parent.getWorldQuaternion(math.parent).invert();
      bone.quaternion.copy(math.parent.multiply(math.world));
    }
  };
  useFrame((_, dt) => {
    const root = group.current;
    if (!root) return;
    const now = Date.now() + offset,
      pose = avatarMotion(m, now),
      p = preview ? { x: 0, y: 0, z: 0 } : avatarPosition(m, capacity, now),
      next = preview ? p : avatarPosition(m, capacity, now + 20);
    root.position.set(
      p.x,
      p.y + pose.sitting * 0.22 + Math.abs(pose.reaction) * 0.05,
      p.z - pose.sitting * 0.5,
    );
    const dx = next.x - p.x,
      dz = next.z - p.z;
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
    if (!initialized.current) {
      root.rotation.y = desired;
      initialized.current = true;
    } else root.rotation.y += delta * (1 - Math.exp(-dt * 10));
    for (const { action } of actionEntries) action.setEffectiveWeight(0);
    const play = (name: string, time: number, weight = 1) => {
      const entry = rig.actions[name];
      if (entry) {
        entry.action.time = Math.min(
          entry.duration - 0.0001,
          Math.max(0, time),
        );
        entry.action.setEffectiveWeight(weight);
      }
    };
    gaze.current.yaw = reducedMotion
      ? look.yaw
      : smoothHeadAngle(gaze.current.yaw, look.yaw, dt);
    gaze.current.pitch = reducedMotion
      ? look.pitch
      : smoothHeadAngle(gaze.current.pitch, look.pitch, dt);
    const gazeMoving =
      gaze.current.yaw !== look.yaw || gaze.current.pitch !== look.pitch;
    gl.domElement.dataset[style + "GazeSettled"] = String(!gazeMoving);
    const elapsed = now - (m.sitAt || 0);
    if (pose.walking) {
      const entry = rig.actions.Walking_A;
      const fade = Math.min(1, Math.max(0, (4000 - elapsed) / 250));
      play("Walking_A", (elapsed / 1000) % (entry?.duration || 1), fade);
      play("Idle", 0, 1 - fade);
    } else if (m.seated && elapsed >= 4000 && elapsed < 5000) {
      const t = (elapsed - 4000) / 1000;
      play(
        "Sit_Chair_Down",
        t * (rig.actions.Sit_Chair_Down?.duration || 0.8),
        Math.min(1, t * 5),
      );
      play("Idle", 0, 1 - Math.min(1, t * 5));
    } else play(m.seated ? "Sit_Chair_Idle" : "Idle", 0);
    // AnimationMixer may skip identical values; undo last frame's procedural
    // offsets first so head/hand rotations never accumulate on an idle clip.
    overlays.forEach((q, bone) => bone.quaternion.copy(q));
    rig.mixer.update(0);
    overlays.forEach((q, bone) => q.copy(bone.quaternion));
    // Apply pitch then yaw, matching the camera and fallback rig's YXZ basis.
    rotate(
      rig.bones.get("head"),
      math.x,
      (-gaze.current.pitch * Math.PI) / 180,
    );
    rotate(rig.bones.get("head"), math.y, (-gaze.current.yaw * Math.PI) / 180);
    if (pose.waving) {
      rotate(rig.bones.get("upperarmr"), math.z, -pose.wave * 2.3);
      rotate(rig.bones.get("lowerarmr"), math.z, pose.hand);
    }
    const head = rig.bones.get("head");
    if (head)
      gl.domElement.dataset[style + "Gaze"] = head.quaternion
        .toArray()
        .map((v) => v.toFixed(5))
        .join(",");
    root.userData.action = pose.waving
      ? "wave"
      : pose.walking
        ? "walk"
        : m.seated
          ? "sit"
          : "stand";
    if (pose.moving || gazeMoving || Math.abs(delta) > 0.001) invalidate();
  });
  return (
    <group ref={group} name={"avatar-" + m.id}>
      <group rotation={[0, Math.PI, 0]} scale={rig.scale}>
        <primitive object={rig.scene} position={[0, rig.floor, 0]} />
      </group>
    </group>
  );
}
