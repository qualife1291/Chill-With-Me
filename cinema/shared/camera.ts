import { seats, type Member } from "./model";
import { avatarPosition, avatarMotion } from "./avatar";
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
      position: [base.x, base.y + 1.65 - seated * 0.4, base.z - 0.08],
      target: [0, 2.3, -5.7],
      fov: 60,
    };
  if (mode === "shoulder")
    return {
      position: [base.x + 1.0, base.y + 2.0, base.z + 2.7],
      target: [0, 2.3, -5.7],
      fov: 58,
    };
  if (mode === "side")
    return {
      position: [4.1, highest + 1.8, -2.7],
      target: [0, highest + 0.9, rear * 0.5],
      fov: 54,
    };
  return {
    position: [0, highest + 3.4, rear + 5.2],
    target: [0, 1.25, -5.7],
    fov: 48,
  };
}
