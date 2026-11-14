import GameRules from "./games/GameRules";
import OaqBoard from "./games/OaqBoard";
import { useEffect, useRef, useState } from "react";
import { X, Sprout, Dices, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { Room, Command } from "../shared/model";
import { completeTicket, type GameCommand } from "../shared/games";
import "./games.css";
const title = (kind: string) => (kind === "oaq" ? "Ô ăn quan" : "Lô tô");
const reasons: Record<string, string> = {
  "quan-finished": "Hai quan đã được ăn hết.",
  "no-refill": "Không đủ dân rải bù; tính điểm theo luật đã chọn.",
  "turn-limit": "Ván hòa do đạt giới hạn lượt.",
  repetition: "Ván hòa do lượt rải lặp quá lâu.",
  "player-left": "Người chơi rời phòng; ván dừng, không xử thắng.",
  "row-complete": "Đủ một hàng ở cùng lần gọi.",
};
export default function GamePanel({
  room,
  id,
  command,
  onClose,
  onSound,
  soundsEnabled,
  onEnableSounds,
  serverNow,
}: {
  room: Room;
  id: string;
  command: (c: Command, onSuccess?: () => void) => Promise<unknown>;
  onClose: () => void;
  onSound: () => void;
  soundsEnabled: boolean;
  onEnableSounds: () => void;
  serverNow: () => number;
}) {
  const g = room.game,
    host = room.host === id,
    player = g?.players.indexOf(id) ?? -1;
  const [busy, setBusy] = useState(false),
    [sound, setSound] = useState(false),
    [cooldown, setCooldown] = useState(false);
  const root = useRef<HTMLElement>(null),
    seen = useRef(g ? `${g.id}:${g.revision}` : "");
  useEffect(() => {
    root.current
      ?.querySelector<HTMLButtonElement>("header button")
      ?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const rev = g ? `${g.id}:${g.revision}` : "",
      changed = !!seen.current && seen.current !== rev;
    seen.current = rev;
    if (changed && sound && g?.phase !== "lobby" && !document.hidden) onSound();
  }, [g?.id, g?.revision, sound, onSound]);
  useEffect(() => {
    const delay =
      g?.lastDrawAt === undefined
        ? 0
        : Math.max(0, g.lastDrawAt + 3000 - serverNow());
    setCooldown(delay > 0);
    if (delay <= 0) return;
    const timer = setTimeout(() => setCooldown(false), delay);
    return () => clearTimeout(timer);
  }, [g?.lastDrawAt, serverNow]);
  const send = async (operation: GameCommand["operation"]) => {
    if (busy) return;
    setBusy(true);
    try {
      await command({
        type: "game",
        expectedRevision: room.gameRevision || 0,
        operation,
      });
    } finally {
      setBusy(false);
    }
  };
  const name = (who: string) =>
    room.members.find((m) => m.id === who)?.name || "Người đã rời";
  const called = new Set(g?.drawn || []),
    last = g?.drawn?.at(-1),
    canClaim = !!(
      g?.ticket &&
      g.phase === "playing" &&
      completeTicket(g.ticket, g.drawn || [])
    );
  const result =
    g?.phase === "finished"
      ? g.winners?.length
        ? `Chúc mừng ${g.winners.map(name).join(", ")}`
        : g.reason === "player-left"
          ? "Ván đã dừng"
          : "Ván hòa"
      : "";
  return (
    <section
      className="activity-sheet game-sheet"
      aria-label="Trò chơi dân gian"
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header>
        <strong>{g ? title(g.kind) : "Chơi cùng nhau"}</strong>
        <button type="button" aria-label="Đóng bảng trò chơi" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      {!g ? (
        <>
          <p className="small">
            Một ván nhẹ nhàng, mọi người cùng tham gia hoặc xem.
          </p>
          {host ? (
            <div className="game-choices">
              <button
                aria-label="Ô ăn quan"
                disabled={busy}
                onClick={() => void send({ action: "open", kind: "oaq" })}
              >
                <Sprout size={24} />
                <strong>Ô ăn quan</strong>
                <span>2 người · rải dân, ăn quan</span>
              </button>
              <button
                aria-label="Lô tô"
                disabled={busy}
                onClick={() => void send({ action: "open", kind: "loto" })}
              >
                <Dices size={24} />
                <strong>Lô tô</strong>
                <span>2–10 người · cùng chờ một hàng</span>
              </button>
            </div>
          ) : (
            <p>Chủ phòng chọn trò chơi để bắt đầu.</p>
          )}
        </>
      ) : (
        <>
          {g.phase === "lobby" && (
            <>
              <p className="small">
                {g.kind === "oaq"
                  ? "Quan = 10 dân · không quan non · 2 người"
                  : "Bộ 1–90 · một vé mỗi người · đủ 5 số trên một hàng"}
              </p>
              <div className="game-players" aria-label="Người tham gia">
                {g.players.map((p, i) => (
                  <span key={p}>
                    {i + 1}. {name(p)}
                    {p === id ? " (bạn)" : ""}
                  </span>
                ))}
              </div>
              <div className="game-actions">
                {player < 0 && (
                  <button
                    disabled={
                      busy || g.players.length >= (g.kind === "oaq" ? 2 : 10)
                    }
                    onClick={() => void send({ action: "join" })}
                  >
                    Tham gia ván
                  </button>
                )}
                {host && (
                  <button
                    disabled={busy || g.players.length < 2}
                    onClick={() => void send({ action: "start" })}
                  >
                    Bắt đầu ván
                  </button>
                )}
                {player >= 0 && (
                  <button
                    disabled={busy}
                    onClick={() => void send({ action: "leave" })}
                  >
                    Rời ván
                  </button>
                )}
              </div>
              <p className="small">
                Đọc luật bên dưới trước khi tham gia. Người ngoài ván vẫn xem
                được.
              </p>
            </>
          )}
          {g.phase === "paused" && (
            <p className="game-status" role="status">
              {name(g.pausedBy || "")} xin nghỉ. Ván vẫn giữ nguyên.
            </p>
          )}
          {result && (
            <div className="game-result" role="status">
              <strong>{result}</strong>
              <p>{reasons[g.reason || ""]}</p>
            </div>
          )}
          {g.oaq && (
            <OaqBoard
              game={g}
              id={id}
              busy={busy}
              name={name}
              onMove={(pit, direction) =>
                void send({ action: "sow", pit, direction })
              }
            />
          )}
          {g.kind === "loto" && g.phase !== "lobby" && (
            <>
              <div className="loto-call" role="status">
                <small>Số vừa gọi</small>
                <strong key={last ?? "empty"}>{last ?? "—"}</strong>
                <span>{called.size}/90 số</span>
              </div>
              {g.ticket ? (
                <>
                  <p className="small">Vé của bạn · số tự đánh dấu</p>
                  <div
                    className="loto-ticket"
                    role="table"
                    aria-label="Vé lô tô của bạn"
                  >
                    {g.ticket.map((row, r) => (
                      <div role="row" key={r}>
                        {row.map((n, c) => (
                          <span
                            key={c}
                            role="cell"
                            className={n && called.has(n) ? "called" : ""}
                            aria-label={
                              n
                                ? `${n}${called.has(n) ? ", đã gọi" : ""}`
                                : "Ô trống"
                            }
                          >
                            {n || ""}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="small">
                  Bạn đang xem ván; tham gia ở ván tiếp theo để nhận vé.
                </p>
              )}
              <details className="game-called">
                <summary>Các số đã gọi ({called.size})</summary>
                <p>{g.drawn?.join(" · ") || "Chưa gọi số."}</p>
              </details>
              {g.phase === "playing" && (
                <div className="game-actions">
                  {host && (
                    <button
                      disabled={busy || cooldown || g.claiming}
                      onClick={() => void send({ action: "draw" })}
                    >
                      {cooldown ? "Chờ một nhịp…" : "Gọi số"}
                    </button>
                  )}
                  {g.ticket && (
                    <button
                      disabled={busy || !canClaim}
                      onClick={() => void send({ action: "claim" })}
                    >
                      Kinh!
                    </button>
                  )}
                  {host && g.claiming && (
                    <button
                      disabled={busy}
                      onClick={() => void send({ action: "publish" })}
                    >
                      Công bố kết quả
                    </button>
                  )}
                </div>
              )}
              {g.claiming && g.phase === "playing" && (
                <p role="status">
                  Đã có hàng đủ. Bấm Kinh hoặc chờ chủ phòng công bố; các vé
                  cùng đủ đều thắng.
                </p>
              )}
            </>
          )}
          {g.phase !== "lobby" && g.phase !== "finished" && (
            <div className="game-actions">
              {(host || player >= 0) && g.phase === "playing" && (
                <button
                  disabled={busy}
                  onClick={() => void send({ action: "pause" })}
                >
                  <Pause size={16} />
                  Xin nghỉ
                </button>
              )}
              {g.phase === "paused" && (host || g.pausedBy === id) && (
                <button
                  disabled={busy}
                  onClick={() => void send({ action: "resume" })}
                >
                  <Play size={16} />
                  Tiếp tục ván
                </button>
              )}
            </div>
          )}
          <GameRules kind={g.kind} />
          <footer className="game-footer">
            <button
              type="button"
              aria-pressed={sound}
              onClick={() => {
                if (!sound && !soundsEnabled) onEnableSounds();
                setSound((v) => !v);
              }}
            >
              {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}Âm ván:{" "}
              {sound ? "bật" : "tắt"}
            </button>
            {host && (
              <button
                disabled={busy}
                onClick={() => {
                  if (
                    g.phase === "lobby" ||
                    g.phase === "finished" ||
                    confirm("Kết thúc ván cho mọi người?")
                  )
                    void send({ action: "close" });
                }}
              >
                Đóng ván
              </button>
            )}
          </footer>
        </>
      )}
    </section>
  );
}
