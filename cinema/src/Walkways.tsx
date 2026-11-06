import { memo } from "react";
import { seats } from "../shared/model";
export default memo(function Walkways({ capacity }: { capacity: number }) {
  const layout = seats(capacity),
    rear = layout[layout.length - 1],
    front = layout[0].z - 0.95,
    end = rear.z - 0.95,
    length = end - front,
    high = rear.y;
  return (
    <group>
      {layout
        .filter((s, i) => s.y > 0 && (i === 0 || layout[i - 1].y !== s.y))
        .map((row) => (
          <group key={row.y}>
            <mesh position={[0, row.y / 2, row.z]}>
              <boxGeometry args={[6.3, row.y, 2.2]} />
              <meshStandardMaterial color="#293833" roughness={1} />
            </mesh>
            <mesh position={[0, row.y + 0.02, row.z - 0.91]}>
              <boxGeometry args={[6.3, 0.02, 0.035]} />
              <meshBasicMaterial color="#dba45f" />
            </mesh>
          </group>
        ))}
      {high > 0 && (
        <group>
          {[-4.05, 4.05].map((x) => (
            <group key={x}>
              <mesh
                position={[x, high / 2, (front + end) / 2]}
                rotation={[-Math.PI / 2 - Math.atan2(high, length), 0, 0]}
              >
                <planeGeometry args={[1.8, Math.hypot(length, high)]} />
                <meshStandardMaterial color="#39443f" roughness={1} />
              </mesh>
              {/* Meets the concourse at rear+.95; no coplanar overlapping top faces. */}
              <mesh position={[x, high / 2, rear.z]}>
                <boxGeometry args={[1.8, high, 1.9]} />
                <meshStandardMaterial color="#39443f" roughness={1} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, high / 2, rear.z + 2.1]}>
            <boxGeometry args={[10.4, high, 2.3]} />
            <meshStandardMaterial color="#39443f" roughness={1} />
          </mesh>
        </group>
      )}
      {[-1, 1].map((side) => (
        <group key={side}>
          {high > 0 && (
            <mesh
              position={[side * 3.22, high / 2 + 0.025, (front + end) / 2]}
              rotation={[-Math.PI / 2 - Math.atan2(high, length), 0, 0]}
            >
              <planeGeometry args={[0.035, Math.hypot(length, high)]} />
              <meshBasicMaterial color="#dba45f" />
            </mesh>
          )}
          <mesh
            position={[side * 3.22, high + 0.025, (end + rear.z + 3.2) / 2]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[0.035, rear.z + 3.2 - end]} />
            <meshBasicMaterial color="#dba45f" />
          </mesh>
        </group>
      ))}
    </group>
  );
});
