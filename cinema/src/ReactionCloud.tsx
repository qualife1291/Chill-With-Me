import { useState, type CSSProperties } from "react";
import type { ReactionKind } from "../shared/model";
const icons = { applause: "👏", sad: "🥺", troll: "😜", flowers: "🎆" };
export default function ReactionCloud({
  kind,
  at,
  offset,
  budget,
}: {
  kind: ReactionKind;
  at: number;
  offset: number;
  budget: number;
}) {
  // Stable phase across chat/pose snapshots; no animation restart or frame loop.
  const [age] = useState(() => Math.max(0, Date.now() + offset - at));
  return (
    <div className="reaction-floats" aria-hidden="true">
      {Array.from({ length: Math.min(24, budget) }, (_, i) => (
        <i
          key={i}
          style={
            {
              "--origin": 15 + ((i * 31) % 70) + "%",
              "--sway": (i % 2 ? -1 : 1) * (12 + ((i * 3) % 28)) + "px",
              "--drift": (i % 2 ? 1 : -1) * (10 + ((i * 11) % 32)) + "px",
              "--size": 28 + ((i * 7) % 17) + "px",
              "--delay": i * 38 - age + "ms",
              "--tilt": (i % 2 ? 12 : -12) + "deg",
            } as CSSProperties
          }
        >
          {i % 3
            ? icons[kind]
            : kind === "applause"
              ? "✨"
              : kind === "troll"
                ? "😂"
                : "💧"}
        </i>
      ))}
    </div>
  );
}
