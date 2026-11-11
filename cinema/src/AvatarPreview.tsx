import SceneVisibility from "./SceneVisibility";
import { useInitialGPUOptions, useSceneQuality } from "./useSceneQuality";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import ModelAvatar from "./ModelAvatar";
import ModelBoundary from "./ModelBoundary";
import type { AvatarStyle, Appearance, Member } from "../shared/model";
function Aim() {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    camera.lookAt(0, 0.9, 0);
    invalidate();
  }, [camera, invalidate]);
  return null;
}
export default function AvatarPreview({
  avatar,
  appearance,
}: {
  avatar: AvatarStyle;
  appearance: Appearance;
}) {
  const gpuOptions = useInitialGPUOptions();
  const { dpr } = useSceneQuality();
  const member = useMemo(
    () =>
      ({
        id: "entry-preview",
        name: "Preview",
        seat: 0,
        seated: false,
        joinedAt: 0,
        avatar,
        appearance,
      }) satisfies Member,
    [avatar, appearance],
  );
  return (
    <Canvas
      frameloop="demand"
      dpr={dpr}
      camera={{ position: [0, 1.05, 4], fov: 32 }}
      gl={{ ...gpuOptions, alpha: false }}
    >
      <SceneVisibility />
      <color attach="background" args={["#21332d"]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[2, 4, 3]} intensity={2} color="#fff1db" />
      <ModelBoundary key={avatar}>
        <Suspense fallback={null}>
          <ModelAvatar
            m={member}
            capacity={2}
            offset={0}
            preview
            look={{ yaw: 0, pitch: 0, bodyYaw: 180 }}
          />
        </Suspense>
      </ModelBoundary>
      <Aim />
    </Canvas>
  );
}
