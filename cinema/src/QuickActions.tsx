import { useEffect, useState, useRef } from "react";
import { Armchair, Hand, Volume2, VolumeX, Smile, X } from "lucide-react";
import { reactions } from "./RoomActivity";
import type { Room, Member, Command, ReactionKind } from "../shared/model";
export default function QuickActions({
  room,
  me,
  command,
  soundsEnabled,
  onToggleSounds,
  open,
  onOpenChange: setOpen,
}: {
  room: Room;
  me: Member;
  command: (c: Command, onSuccess?: () => void) => Promise<unknown>;
  soundsEnabled: boolean;
  onToggleSounds: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [open, setOpen]);
  const selected = () => {
    setOpen(false);
    opener.current?.focus({ preventScroll: true });
  };
  const [sendingReaction, setSendingReaction] = useState(false);
  const [cooling, setCooling] = useState(false);
  useEffect(() => {
    if (!cooling) return;
    const timer = setTimeout(() => setCooling(false), 5000);
    return () => clearTimeout(timer);
  }, [cooling]);
  const sendReaction = async (kind: ReactionKind) => {
    setSendingReaction(true);
    try {
      await command({ type: "reaction", kind }, () => {
        setCooling(true);
        selected();
      });
    } finally {
      setSendingReaction(false);
    }
  };
  return (
    <div
      className="quick-actions"
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setOpen(false);
          opener.current?.focus();
        }
      }}
    >
      <button
        className="actions-trigger"
        ref={opener}
        type="button"
        aria-label="Hành động và cảm xúc"
        aria-expanded={open}
        aria-controls="quick-action-panel"
        onClick={() => {
          setOpen(!open);
        }}
      >
        <Smile size={23} />
        <span>Cảm xúc</span>
      </button>
      <section
        id="quick-action-panel"
        className="action-choices"
        aria-label="Hành động nhanh"
        hidden={!open}
      >
        <header>
          <strong>Hành động & cảm xúc</strong>
          <button
            type="button"
            aria-label="Đóng cảm xúc"
            onClick={() => {
              setOpen(false);
              opener.current?.focus();
            }}
          >
            <X size={18} />
          </button>
        </header>

        <div
          className="reaction-actions"
          role="group"
          aria-label="Cảm xúc cả rạp"
        >
          {(Object.keys(reactions) as ReactionKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              disabled={sendingReaction || cooling || !!room.reaction}
              onClick={() => void sendReaction(kind)}
            >
              <span aria-hidden="true">{reactions[kind].icon}</span>
              {reactions[kind].label}
            </button>
          ))}
        </div>

        <div className="action-row">
          <button
            onClick={() =>
              void command({ type: "sit", instant: true }, selected)
            }
          >
            <Armchair size={17} />
            Ngồi ngay
          </button>
          <button onClick={() => void command({ type: "wave" }, selected)}>
            <Hand size={17} />
            Vẫy tay
          </button>
        </div>
        <label className="friend-picker">
          Tương tác với bạn
          <select
            aria-label="Chọc bạn"
            value=""
            disabled={room.members.length < 2}
            onChange={(e) => {
              if (e.target.value)
                void command({ type: "poke", id: e.target.value }, selected);
            }}
          >
            <option value="">Chọn người để chọc vui…</option>
            {room.members
              .filter((m) => m.id !== me.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </label>
        <p className="control-hint" aria-live="polite">
          {cooling
            ? "Đợi một chút trước cảm xúc tiếp theo…"
            : "Cả rạp cùng thấy · 3 giây mỗi cảm xúc"}
        </p>
        <button
          className="sound-toggle"
          type="button"
          aria-pressed={soundsEnabled}
          onClick={onToggleSounds}
        >
          {soundsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          {soundsEnabled
            ? "Âm thanh tương tác: Bật"
            : "Âm thanh tương tác: Tắt"}
        </button>
      </section>
    </div>
  );
}
