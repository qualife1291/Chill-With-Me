import { useState, type CSSProperties } from "react";
import {
  FIREWORKS,
  FIREWORK_FUSE_MS,
  SPARKS_PER_BURST,
} from "../shared/fireworks";

export default function Fireworks({
  at,
  offset,
}: {
  at: number;
  offset: number;
}) {
  // Freeze the start offset: chat/pose updates must not restart an active show.
  const [age] = useState(() => Math.max(0, Date.now() + offset - at));
  return (
    <div className="fireworks-show" aria-hidden="true">
      {FIREWORKS.map((burst, index) => (
        <div
          className="firework-burst"
          key={index}
          style={
            {
              left: burst.x + "%",
              top: burst.y + "%",
              color: burst.color,
              "--launch-delay": burst.launch - age + "ms",
              "--burst-delay": burst.launch + FIREWORK_FUSE_MS - age + "ms",
            } as CSSProperties
          }
        >
          <span className="firework-rocket" />
          <span className="firework-core" />
          {Array.from({ length: SPARKS_PER_BURST }, (_, i) => {
            const angle = (i / SPARKS_PER_BURST) * Math.PI * 2;
            const radius = 15 + (i % 3) * 3;
            return (
              <i
                className="firework-spark"
                key={i}
                style={
                  {
                    "--dx": Math.cos(angle) * radius + "vmin",
                    "--dy": Math.sin(angle) * radius + "vmin",
                    "--angle": angle + Math.PI / 2 + "rad",
                    color: i % 3 === 0 ? "#fff1b7" : burst.color,
                  } as CSSProperties
                }
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
