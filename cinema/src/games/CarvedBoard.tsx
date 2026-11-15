import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { oaqStage } from "../../shared/gameStage";
function rounded(
  path: THREE.Path,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  path.closePath();
}
/** Actual beveled cavities; wells and stones sit below the carved wooden rim. */
export default function CarvedBoard({
  layout,
}: {
  layout: ReturnType<typeof oaqStage>;
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    rounded(
      shape,
      -layout.width / 2,
      -layout.depth / 2,
      layout.width,
      layout.depth,
      0.5,
    );
    for (const p of layout.pits) {
      const hole = new THREE.Path();
      rounded(hole, p.x - p.w / 2, -p.z - p.d / 2, p.w, p.d, 0.25);
      shape.holes.push(hole);
    }
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.2,
      bevelEnabled: true,
      bevelSize: 0.045,
      bevelThickness: 0.035,
      bevelSegments: 2,
      curveSegments: 5,
      steps: 1,
    });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [layout]);
  const map = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#b1804d";
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 48; i++) {
      ctx.beginPath();
      ctx.strokeStyle = i % 3 ? "#855b3433" : "#e0b87b44";
      ctx.lineWidth = (i % 4) + 0.5;
      ctx.moveTo(0, i * 5.5);
      ctx.bezierCurveTo(
        160,
        i * 5.5 + Math.sin(i) * 12,
        330,
        i * 5.5 - Math.cos(i) * 10,
        512,
        i * 5.5,
      );
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(0.14, 0.22);
    return t;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => map.dispose(), [map]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial map={map} roughness={0.8} />
    </mesh>
  );
}
