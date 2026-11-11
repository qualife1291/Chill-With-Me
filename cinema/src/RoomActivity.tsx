import { useEffect, useRef, useState } from "react";
import type { Member, ReactionKind, Room } from "../shared/model";
import { REACTION_MS } from "../shared/model";
import Fireworks from "./Fireworks";
import type { RoomSound } from "./useRoomSounds";
export const reactions: Record<ReactionKind, { icon: string; label: string }> =
  {
    flowers: { icon: "🎆", label: "Pháo bông" },
    applause: { icon: "👏", label: "Vỗ tay" },
    sad: { icon: "🥺", label: "Mếu mào" },
    troll: { icon: "😜", label: "Trêu vui" },
  };
type Message = Room["messages"][number];
function useRemaining(
  at: number | undefined,
  duration: number,
  offset: number,
) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const left = (at ?? -Infinity) + duration - (Date.now() + offset);
    setActive(left > 0);
    if (left <= 0) return;
    const timer = setTimeout(() => setActive(false), left);
    return () => clearTimeout(timer);
  }, [at, duration, offset]);
  return active;
}
export default function RoomActivity({
  room,
  me,
  offset,
  chatOpen,
  onOpenChat,
  playSound,
  effectsBudget = 18,
}: {
  room: Room;
  me: Member;
  offset: number;
  chatOpen: boolean;
  onOpenChat: () => void;
  playSound: (kind: RoomSound, ageMs?: number) => void;
  effectsBudget?: number;
}) {
  const seen = useRef(new Set(room.messages.map((m) => m.id)));
  const poked = useRef(me.pokedAt);
  const reacted = useRef(room.reaction?.id);
  const [toasts, setToasts] = useState<(Message & { until: number })[]>([]);
  const pokeActive = useRemaining(me.pokedAt, REACTION_MS, offset);
  const reactionActive = useRemaining(room.reaction?.at, REACTION_MS, offset);
  useEffect(() => {
    const fresh = room.messages.filter(
      (m) =>
        !seen.current.has(m.id) &&
        m.senderId !== me.id &&
        m.at !== undefined &&
        Date.now() + offset - m.at < 6000,
    );
    seen.current = new Set(room.messages.map((m) => m.id));
    if (chatOpen) setToasts([]);
    else if (fresh.length)
      setToasts((previous) =>
        [
          ...previous,
          ...fresh.map((m) => ({ ...m, until: Date.now() + 6000 })),
        ].slice(-3),
      );
  }, [room.messages, me.id, chatOpen, offset]);
  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(
      () => setToasts((items) => items.filter((m) => m.until > Date.now())),
      Math.max(0, Math.min(...toasts.map((m) => m.until)) - Date.now()) + 10,
    );
    return () => clearTimeout(timer);
  }, [toasts]);
  useEffect(() => {
    if (me.pokedAt === poked.current) return;
    poked.current = me.pokedAt;
    const age = Date.now() + offset - (me.pokedAt ?? -Infinity);
    if (age > -1000 && age < REACTION_MS) playSound("poke");
  }, [me.pokedAt, offset, playSound]);
  useEffect(() => {
    const event = room.reaction;
    if (!event || reacted.current === event.id) return;
    reacted.current = event.id;
    const age = Date.now() + offset - event.at;
    if (age > -1000 && age < REACTION_MS)
      playSound(event.kind, Math.max(0, age));
  }, [room.reaction, offset, playSound]);
  const reaction = room.reaction;
  return (
    <>
      {!chatOpen && toasts.length > 0 && (
        <aside
          className="chat-toasts"
          aria-label="Tin nhắn mới"
          aria-live="polite"
          aria-relevant="additions"
        >
          {toasts.map((m) => (
            <div className="chat-toast" key={m.id}>
              <button
                type="button"
                onClick={onOpenChat}
                aria-label={`Mở chat: ${m.name}`}
              >
                <strong>{m.name}</strong>
                <span>{m.text}</span>
              </button>
              <button
                type="button"
                className="toast-dismiss"
                aria-label={`Ẩn tin nhắn của ${m.name}`}
                onClick={() =>
                  setToasts((items) => items.filter((i) => i.id !== m.id))
                }
              >
                ×
              </button>
            </div>
          ))}
        </aside>
      )}
      {pokeActive && (
        <div className="poke-notice" role="status">
          {room.members.find((m) => m.id === me.pokedBy)?.name ||
            "Một người bạn"}{" "}
          vừa chọc bạn 👋
        </div>
      )}
      {reactionActive && reaction && (
        <div key={reaction.id}>
          {reaction.kind === "flowers" && effectsBudget > 0 && (
            <Fireworks
              key={effectsBudget}
              at={reaction.at}
              offset={offset}
              count={effectsBudget}
            />
          )}
          {reaction.kind === "troll" && effectsBudget > 0 && (
            <div className="troll-bubbles" aria-hidden="true">
              {["Ủa alo? 😂", "Rồi xong 💀", "Hết cứu 🫠"].map((text, i) => (
                <span
                  key={text}
                  style={{ "--i": i } as import("react").CSSProperties}
                >
                  {text}
                </span>
              ))}
            </div>
          )}
          <div
            className={`room-reaction reaction-${reaction.kind}${effectsBudget === 0 ? " quiet-reaction" : ""}`}
            role="status"
            aria-label={`${reaction.name}: ${reactions[reaction.kind].label}`}
          >
            <div className="reaction-symbol" aria-hidden="true">
              {reactions[reaction.kind].icon}
            </div>
            <strong>{reaction.name}</strong>
            <span>{reactions[reaction.kind].label}</span>
          </div>
        </div>
      )}
    </>
  );
}
