import { memo, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Game } from "../../shared/games";
import { ownPits } from "../../shared/games/oaq";
import { oaqStage, gameCameraDistance } from "../../shared/gameStage";
import CarvedBoard from "./CarvedBoard";
import { sceneDiagnostics } from "../diagnostics";

type Point = [number, number, number];
function Label({
  text,
  position,
  scale = [1, 0.65, 1],
  color = "#fff4d3",
}: {
  text: string;
  position: Point;
  scale?: Point;
  color?: string;
}) {
  const map = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 52px system-ui, sans-serif";
    ctx.fillStyle = color === "#263b31" ? "#f3ddb1ee" : "#173127ee";
    ctx.beginPath();
    ctx.roundRect(6, 14, 244, 100, 24);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.shadowColor = "#16201b";
    ctx.shadowBlur = 4;
    ctx.fillText(text, 128, 64, 246);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [text, color]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <sprite position={position} scale={scale} raycast={() => {}}>
      <spriteMaterial
        map={map}
        transparent
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </sprite>
  );
}
function Box({
  geometry,
  position,
  scale,
  color,
  onClick,
}: {
  geometry: THREE.BufferGeometry;
  position: Point;
  scale: Point;
  color: string;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <mesh
      geometry={geometry}
      position={position}
      scale={scale}
      onClick={onClick}
    >
      <meshStandardMaterial color={color} roughness={0.65} metalness={0.08} />
    </mesh>
  );
}
function Ticket({ game }: { game: Game }) {
  const text = JSON.stringify([game.ticket, game.drawn]);
  const map = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 384;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ead9ae";
    ctx.fillRect(0, 0, c.width, c.height);
    const called = new Set(game.drawn || []);
    if (game.ticket)
      for (const [r, row] of game.ticket.entries())
        for (const [col, n] of row.entries()) {
          const x = col * 112 + 8,
            y = r * 120 + 10;
          ctx.fillStyle = n && called.has(n) ? "#265d4b" : "#f8e9c4";
          ctx.fillRect(x, y, 110, 116);
          ctx.strokeStyle = "#8e6c3c";
          ctx.strokeRect(x, y, 110, 116);
          if (n) {
            ctx.fillStyle = called.has(n) ? "#fff5d8" : "#263d32";
            ctx.font = "bold 62px system-ui";
            ctx.textAlign = "center";
            ctx.fillText(String(n), x + 55, y + 80);
          }
        }
    else {
      ctx.fillStyle = "#265d4b";
      ctx.font = "bold 80px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Cùng vui lô tô", 512, 220);
    }
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
    // Only the local DTO's ticket and called numbers enter this texture.
  }, [text]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh position={[0, 0.32, 2.35]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[5.7, 2.1]} />
      <meshStandardMaterial map={map} roughness={0.95} />
    </mesh>
  );
}
export default memo(function GameStage({
  game,
  id,
  selectedPit,
  onSelectPit,
  angle,
  reducedMotion,
}: {
  game: Game;
  id: string;
  selectedPit: number | null;
  onSelectPit: (pit: number | null) => void;
  angle: number;
  reducedMotion: boolean;
}) {
  const { camera, size, invalidate, gl, get } = useThree();
  const portrait = size.width < 600 && size.height > size.width / 1.4;
  const layout = useMemo(() => oaqStage(portrait), [portrait]);
  const geometry = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 2, 0.14), []);
  const stones = useRef<THREE.InstancedMesh>(null),
    root = useRef<THREE.Group>(null),
    cage = useRef<THREE.Group>(null),
    ball = useRef<THREE.Group>(null);
  const started = useRef(-Infinity),
    previousDraw = useRef(game.lastDrawAt);
  const player = game.players.indexOf(id);
  const width = game.kind === "oaq" ? layout.width : 8.7,
    depth = game.kind === "oaq" ? layout.depth : 7.1;
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    if (
      game.kind === "loto" &&
      game.phase === "playing" &&
      game.lastDrawAt !== previousDraw.current
    )
      started.current = performance.now();
    if (game.phase !== "playing") started.current = -Infinity;
    previousDraw.current = game.lastDrawAt;
    invalidate();
  }, [
    game.kind,
    game.phase,
    game.lastDrawAt,
    selectedPit,
    angle,
    reducedMotion,
    invalidate,
  ]);
  useEffect(() => {
    if (!stones.current || !game.oaq) return;
    const temp = new THREE.Object3D();
    let i = 0;
    for (const [p, tokens] of game.oaq.pits.entries()) {
      const pit = layout.pits[p];
      for (let n = 0; n < Math.min(6, tokens.dan); n++) {
        temp.position.set(
          pit.x + ((n % 3) - 1) * pit.w * 0.22,
          0.12 + (n % 2) * 0.004,
          pit.z + (Math.floor(n / 3) - 0.5) * pit.d * 0.35,
        );
        temp.rotation.set(0.1 * n, n * 0.8, 0.1);
        temp.scale.set(1.1, 0.7, 0.9);
        temp.updateMatrix();
        stones.current.setMatrixAt(i++, temp.matrix);
      }
    }
    stones.current.count = i;
    stones.current.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [game.oaq, layout, invalidate]);
  useEffect(() => {
    gl.domElement.dataset.gameKind = game.kind;
    return () => {
      delete gl.domElement.dataset.gameKind;
      delete gl.domElement.dataset.gamePitTargets;
      delete gl.domElement.dataset.gameFrame;
      delete gl.domElement.dataset.gameResources;
    };
  }, [gl, game.kind]);
  useFrame(() => {
    const elapsed = performance.now() - started.current,
      progress =
        reducedMotion || game.kind !== "loto" || game.phase !== "playing"
          ? 1
          : Math.min(1, elapsed / 850);
    const aspect = size.width / Math.max(1, size.height),
      fov = 38;
    const distance = gameCameraDistance(
      width,
      depth,
      -0.65,
      game.kind === "oaq" ? 1.05 : 4.6,
      aspect,
      angle,
    );
    camera.position.set(0, 0.4 + distance * 0.88, distance * 0.48);
    camera.lookAt(0, 0.4, 0);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
    if (root.current) root.current.rotation.y = THREE.MathUtils.degToRad(angle);
    if (cage.current) cage.current.rotation.z = progress * Math.PI * 2;
    if (ball.current)
      ball.current.position.y = 1.05 + Math.sin(progress * Math.PI) * 0.75;
    if (progress < 1) invalidate();
    if (sceneDiagnostics) {
      gl.domElement.dataset.gameLoop = get().frameloop;
      gl.domElement.dataset.gameFrame = String(gl.info.render.frame);
      gl.domElement.dataset.gameResources = JSON.stringify({
        ...gl.info.memory,
        calls: gl.info.render.calls,
      });
      if (game.kind === "oaq" && root.current) {
        root.current.updateMatrixWorld(true);
        gl.domElement.dataset.gamePitTargets = JSON.stringify(
          layout.pits.map((p, index) => {
            const v = root
              .current!.localToWorld(new THREE.Vector3(p.x, 0.3, p.z))
              .project(camera);
            return {
              pit: index,
              x: ((v.x + 1) * size.width) / 2,
              y: ((1 - v.y) * size.height) / 2,
            };
          }),
        );
      }
    }
  });
  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight
        position={[-3, 8, 4]}
        intensity={1.65}
        color="#ffe4b4"
      />
      <directionalLight position={[4, 3, -3]} intensity={0.8} color="#c8e0ec" />
      <group ref={root} name={`game-${game.kind}`}>
        {game.kind === "oaq" && game.oaq ? (
          <>
            <Box
              geometry={geometry}
              position={[0, -0.28, 0]}
              scale={[layout.width, 0.5, layout.depth]}
              color="#6c492d"
            />
            <CarvedBoard layout={layout} />
            {layout.pits.map((p, index) => {
              const tokens = game.oaq!.pits[index],
                quan = index === 0 || index === 6,
                own = ownPits(player).includes(index),
                can =
                  game.phase === "playing" &&
                  player === game.oaq!.turn &&
                  own &&
                  tokens.dan > 0;
              return (
                <group key={index}>
                  <Box
                    geometry={geometry}
                    position={[p.x, -0.03, p.z]}
                    scale={[p.w, 0.06, p.d]}
                    color={
                      selectedPit === index
                        ? "#f8d379"
                        : own
                          ? "#355b48"
                          : "#354839"
                    }
                    onClick={
                      can
                        ? (e) => {
                            e.stopPropagation();
                            onSelectPit(selectedPit === index ? null : index);
                          }
                        : undefined
                    }
                  />
                  <Label
                    text={`${quan ? "Quan" : index < 6 ? "A" + index : "B" + (index - 6)} · ${tokens.dan}`}
                    position={[p.x, 0.65, p.z]}
                    scale={[quan ? 1.25 : 1.1, 0.5, 1]}
                  />
                  {tokens.quan > 0 && (
                    <mesh position={[p.x + p.w * 0.27, 0.31, p.z - p.d * 0.23]}>
                      <octahedronGeometry args={[0.3]} />
                      <meshStandardMaterial
                        color="#f5c56d"
                        roughness={0.32}
                        metalness={0.5}
                      />
                    </mesh>
                  )}
                </group>
              );
            })}
            <instancedMesh
              ref={stones}
              args={[undefined, undefined, 72]}
              frustumCulled={false}
            >
              <dodecahedronGeometry args={[0.17, 0]} />
              <meshStandardMaterial color="#e9dfbd" roughness={0.85} />
            </instancedMesh>
          </>
        ) : (
          <>
            <Box
              geometry={geometry}
              position={[0, -0.1, 0]}
              scale={[8.6, 0.42, 6.8]}
              color="#6c492d"
            />
            <Box
              geometry={geometry}
              position={[0, 0.13, 0]}
              scale={[8.4, 0.12, 6.6]}
              color="#28554a"
            />
            <Box
              geometry={geometry}
              position={[0, 0.45, -1.35]}
              scale={[3.5, 0.5, 2.6]}
              color="#a6723b"
            />
            {[-1, 1].map((side) => (
              <Box
                key={side}
                geometry={geometry}
                position={[side * 1.43, 1.3, -1.35]}
                scale={[0.16, 1.3, 0.22]}
                color="#b68e4b"
              />
            ))}
            <group position={[0, 2.05, -1.35]}>
              <group ref={cage}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <mesh key={i} rotation={[Math.PI / 2, (i * Math.PI) / 6, 0]}>
                    <torusGeometry args={[1.25, 0.035, 6, 36]} />
                    <meshStandardMaterial
                      color="#d1b67f"
                      metalness={0.6}
                      roughness={0.4}
                    />
                  </mesh>
                ))}
                {Array.from({ length: 12 }, (_, i) => (
                  <mesh
                    key={i}
                    position={[
                      Math.sin(i * 2.4) * 0.7,
                      Math.cos(i * 1.8) * 0.65,
                      Math.sin(i * 3.7) * 0.6,
                    ]}
                  >
                    <sphereGeometry args={[0.18, 10, 8]} />
                    <meshStandardMaterial
                      color={["#e9c26b", "#b54848", "#70b49a"][i % 3]}
                      roughness={0.4}
                    />
                  </mesh>
                ))}
              </group>
            </group>
            <group ref={ball} position={[0, 1.05, 0.8]}>
              <mesh>
                <sphereGeometry args={[0.7, 24, 16]} />
                <meshStandardMaterial
                  color="#f3ddb1"
                  roughness={0.25}
                  metalness={0.12}
                />
              </mesh>
              <Label
                text={String(game.drawn?.at(-1) ?? "?")}
                position={[0, 0.3, 0.52]}
                scale={[1.2, 0.7, 1]}
                color="#263b31"
              />
            </group>
            <Ticket game={game} />
            {[-1, 1].map((side) => (
              <group key={side} position={[side * 3.35, 0.7, -1.3]}>
                <Box
                  geometry={geometry}
                  position={[0, 0, 0]}
                  scale={[0.7, 1.1, 0.65]}
                  color="#26352e"
                />
                <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.34]}>
                  <torusGeometry args={[0.2, 0.05, 6, 16]} />
                  <meshStandardMaterial color="#b39565" />
                </mesh>
              </group>
            ))}
            <Label
              text="Lô tô · Cùng Xem"
              position={[0, 3.8, -2.5]}
              scale={[4.8, 1.25, 1]}
            />
          </>
        )}
      </group>
    </>
  );
});
