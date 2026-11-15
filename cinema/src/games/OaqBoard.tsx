import { useEffect, useState } from "react";
import { Sprout } from "lucide-react";
import { ownPits, oaqScores } from "../../shared/games/oaq";
import type { Game } from "../../shared/games";
export default function OaqBoard({
  game: g,
  id,
  busy,
  name,
  onMove,
  selectedPit,
  onSelectPit,
  controlsOnly = false,
}: {
  game: Game;
  id: string;
  busy: boolean;
  name: (id: string) => string;
  onMove: (pit: number, direction: 1 | -1) => void;
  selectedPit?: number | null;
  onSelectPit?: (pit: number | null) => void;
  controlsOnly?: boolean;
}) {
  const [localPit, setLocalPit] = useState<number | null>(null);
  const pit = selectedPit === undefined ? localPit : selectedPit;
  const setPit = (value: number | null) =>
    onSelectPit ? onSelectPit(value) : setLocalPit(value);
  useEffect(() => setLocalPit(null), [g.id, g.revision]);
  const current = g.oaq,
    player = g.players.indexOf(id),
    turn = current?.turn,
    canMove = !!(g.phase === "playing" && current && player === turn && !busy);
  if (!current) return null;
  return (
    <>
      <div className="game-scores">
        {g.players.map((p, i) => (
          <span
            key={p}
            className={g.phase === "playing" && i === turn ? "is-turn" : ""}
          >
            {name(p)}
            {p === id ? " · bạn" : ""}
            <strong>{oaqScores(current)[i]} điểm</strong>
            <small>
              {i === 0 ? "Phía A" : "Phía B"} · {current.banks[i].dan} dân,{" "}
              {current.banks[i].quan} quan
              {current.debt[i] ? ` · nợ ${current.debt[i]}` : ""}
            </small>
          </span>
        ))}
      </div>
      {g.phase !== "finished" && (
        <p className="game-turn" role="status">
          Lượt {name(g.players[turn || 0])} ·{" "}
          {player < 0
            ? "Bạn đang xem"
            : player === 0
              ? "Bạn ở phía A"
              : "Bạn ở phía B"}
        </p>
      )}
      {controlsOnly ? (
        <label className="game-pit-select">
          Ô muốn rải
          <select
            aria-label="Ô muốn rải"
            value={pit ?? ""}
            disabled={!canMove}
            onChange={(e) =>
              setPit(e.target.value === "" ? null : Number(e.target.value))
            }
          >
            <option value="">Chạm ô trên bàn hoặc chọn ở đây</option>
            {ownPits(player)
              .filter((p) => current.pits[p].dan > 0)
              .map((p) => (
                <option key={p} value={p}>
                  Ô {player === 0 ? "A" : "B"}
                  {player === 0 ? p : p - 6} · {current.pits[p].dan} dân
                </option>
              ))}
          </select>
        </label>
      ) : (
        <div className="oaq-board" role="group" aria-label="Bàn Ô ăn quan">
          {current.pits.map((tokens, index) => {
            const isQuan = index === 0 || index === 6,
              own = ownPits(player).includes(index);
            const inside = (
              <>
                <span className="pebbles" aria-hidden="true">
                  {Array.from({ length: Math.min(6, tokens.dan) }, (_, n) => (
                    <i key={n} />
                  ))}
                </span>
                {tokens.quan > 0 && (
                  <Sprout className="quan-token" aria-hidden="true" size={25} />
                )}
                <strong>{tokens.dan}</strong>
                <small>
                  {isQuan
                    ? `Quan ${index === 0 ? "trái" : "phải"}`
                    : `${index < 6 ? "A" : "B"}${index < 6 ? index : index - 6}`}
                </small>
              </>
            );
            return isQuan ? (
              <div
                key={index}
                className={`oaq-pit quan pit-${index}`}
                aria-label={`${index === 0 ? "Quan trái" : "Quan phải"}, ${tokens.dan} dân, ${tokens.quan} quan`}
              >
                {inside}
              </div>
            ) : (
              <button
                key={index}
                className={`oaq-pit pit-${index}${pit === index ? " selected" : ""}`}
                aria-label={`Ô ${index < 6 ? "A" : "B"}${index < 6 ? index : index - 6}, ${tokens.dan} dân`}
                aria-pressed={pit === index}
                disabled={!canMove || !own || tokens.dan === 0}
                onClick={() => setPit(pit === index ? null : index)}
              >
                {inside}
              </button>
            );
          })}
        </div>
      )}
      {g.phase !== "finished" && pit !== null && (
        <div className="game-move-controls">
          <button
            disabled={!canMove || pit === null}
            onClick={() => pit !== null && onMove(pit, 1)}
          >
            ↺ Rải ngược chiều
          </button>
          <button
            disabled={!canMove || pit === null}
            onClick={() => pit !== null && onMove(pit, -1)}
          >
            ↻ Rải thuận chiều
          </button>
        </div>
      )}
      {current.last && (
        <p className="small game-last" aria-live="polite">
          Lượt {current.turns}: ăn {current.last.captured} điểm
          {current.last.refilled ? ", rải bù 5 dân" : ""}.
        </p>
      )}
    </>
  );
}
