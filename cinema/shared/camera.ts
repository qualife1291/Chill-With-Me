import { seats, type Member } from "./model";
import { avatarPosition, avatarMotion } from "./avatar";
import { SCREEN } from "./projection";
export function cameraView(
  capacity: number,
  m: Member,
  mode: string,
  now: number,
) {
  const layout = seats(capacity),
    highest = Math.max(...layout.map((s) => s.y)),
    rear = Math.max(...layout.map((s) => s.z));
  const base = avatarPosition(m, capacity, now),
    seated = avatarMotion(m, now).sitting;
  if (mode === "first")
    return {
      position: [base.x, base.y + 1.65 - seated * 0.15, base.z - 0.58],
      target: [0, SCREEN.y, SCREEN.z],
      fov: 60,
    };
  // One orbit mode replaces overview/shoulder/social. Wheel sets distance;
  // horizontal drag travels around the seats, vertical drag sets elevation.
  return {
    position: [0, highest + 3.4, rear + 5.2],
    target: [0, highest + 1.1, (layout[0].z + rear) / 2],
    fov: 55,
  };
}
export function orbitView(
  capacity: number,
  yaw: number,
  pitch: number,
  zoom: number,
  aspect: number,
) {
  const layout = seats(capacity),
    rear = layout[layout.length - 1],
    z = (layout[0].z + rear.z) / 2;
  const angle = (-yaw * Math.PI) / 180,
    elevation = (Math.min(65, Math.max(10, 22 + pitch)) * Math.PI) / 180;
  const fit =
    SCREEN.width / (2 * Math.tan((55 * Math.PI) / 360) * Math.max(0.2, aspect));
  const distance = Math.max(
    4,
    Math.min(
      24,
      Math.max(10, fit * 1.15 - (z - SCREEN.z)) * Math.exp(zoom * 0.035),
    ),
  );
  return {
    position: [
      Math.max(
        -4.8,
        Math.min(4.8, Math.sin(angle) * distance * Math.cos(elevation)),
      ),
      Math.max(
        rear.y + 1.8,
        Math.min(5.65, rear.y + 0.6 + Math.sin(elevation) * distance),
      ),
      Math.max(-3.8, z + Math.cos(angle) * distance * Math.cos(elevation)),
    ],
    target: [0, rear.y + 1.1, z],
    fov: 55,
  };
}
