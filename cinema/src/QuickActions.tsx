import { useEffect, useState, useRef } from "react";
import { Armchair, Hand, Volume2, VolumeX, Smile, X } from "lucide-react";
import { reactionChoices, type ReactionVariant } from "../shared/reactions";
import type { Room, Member, Command, ReactionKind } from "../shared/model";
export default function QuickActions({
  room,
  me,
  command,
  soundsEnabled,
  onToggleSounds,
  open,
  onOpenChange: setOpen,
  reactionsOpen,
  onReactionsChange,
  onPresentation,
}: {
  room: Room;
  me: Member;
  command: (c: Command, onSuccess?: () => void) => Promise<unknown>;
  soundsEnabled: boolean;
  onToggleSounds: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPresentation: () => void;
  reactionsOpen: boolean;
  onReactionsChange: (open: boolean) => void;
}) {
  const root = useRef<HTMLDivElement>(null),
    opener = useRef<HTMLButtonElement>(null),
    reactionOpener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open && !reactionsOpen) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false);
        onReactionsChange(false);
      }
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, [open, reactionsOpen, setOpen, onReactionsChange]);
  useEffect(() => {
    if (reactionsOpen)
      root.current
        ?.querySelector<HTMLButtonElement>(
          ".reaction-strip button:not(:disabled)",
        )
        ?.focus({ preventScroll: true });
  }, [reactionsOpen]);
  const selected = () => {
    setOpen(false);
    opener.current?.focus({ preventScroll: true });
  };
  const [sendingReaction, setSendingReaction] = useState(false),
    [cooling, setCooling] = useState(false);
  useEffect(() => {
    if (!cooling) return;
    const timer = setTimeout(() => setCooling(false), 5000);
    return () => clearTimeout(timer);
  }, [cooling]);
  const sendReaction = async (
    kind: ReactionKind,
    variant?: ReactionVariant,
  ) => {
    setSendingReaction(true);
    try {
      await command(
        { type: "reaction", kind, ...(variant ? { variant } : {}) },
        () => {
          setCooling(true);
          onReactionsChange(false);
          requestAnimationFrame(() =>
            reactionOpener.current?.focus({ preventScroll: true }),
          );
        },
      );
    } finally {
      setSendingReaction(false);
    }
  };
  return (
    <div
      className="quick-actions"
      ref={root}
      onKeyDown={(e) => {
        if (
          reactionsOpen &&
          ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
        ) {
          const buttons = Array.from(
            root.current?.querySelectorAll<HTMLButtonElement>(
              ".reaction-strip button:not(:disabled)",
            ) || [],
          );
          const at = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          const next =
            e.key === "Home"
              ? 0
              : e.key === "End"
                ? buttons.length - 1
                : (at + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) %
                  buttons.length;
          e.preventDefault();
          e.stopPropagation();
          buttons[next]?.focus();
        }
        if (e.key === "Escape") {
          e.stopPropagation();
          if (reactionsOpen) {
            onReactionsChange(false);
            requestAnimationFrame(() => reactionOpener.current?.focus());
          } else {
            setOpen(false);
            opener.current?.focus();
          }
        }
      }}
    >
      <button
        className="actions-trigger interaction-trigger"
        ref={opener}
        type="button"
        aria-label="Tương tác nhân vật"
        title="Tương tác nhân vật"
        aria-expanded={open}
        aria-controls="quick-action-panel"
        onClick={() => {
          onReactionsChange(false);
          setOpen(!open);
        }}
      >
        <Hand size={22} />
        <span>Tương tác</span>
      </button>
      <button
        className="actions-trigger reactions-trigger"
        ref={reactionOpener}
        type="button"
        aria-label="Cảm xúc"
        title="Cảm xúc cả rạp"
        aria-expanded={reactionsOpen}
        aria-controls="reaction-strip"
        onClick={() => {
          setOpen(false);
          onReactionsChange(!reactionsOpen);
        }}
      >
        <Smile size={23} />
        <span>Cảm xúc</span>
      </button>
      <div
        id="reaction-strip"
        className="reaction-strip"
        role="group"
        aria-label="Cảm xúc cả rạp"
        hidden={!reactionsOpen}
      >
        <div className="reaction-options">
          {reactionChoices.map(({ kind, variant, label, icon }) => (
            <button
              key={variant || kind}
              type="button"
              title={cooling ? "Đợi một chút trước cảm xúc tiếp theo" : label}
              aria-label={label}
              disabled={sendingReaction || cooling || !!room.reaction}
              onClick={() => void sendReaction(kind, variant)}
            >
              <span aria-hidden="true">{icon}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Đóng cảm xúc"
          title="Đóng cảm xúc"
          onClick={() => {
            onReactionsChange(false);
            requestAnimationFrame(() => reactionOpener.current?.focus());
          }}
        >
          <X size={18} />
        </button>
        <span className="sr-only" aria-live="polite">
          {cooling
            ? "Đợi một chút trước cảm xúc tiếp theo"
            : "Cả rạp cùng thấy · 3 giây mỗi cảm xúc"}
        </span>
      </div>
      <section
        id="quick-action-panel"
        className="action-choices"
        aria-label="Tương tác nhân vật"
        hidden={!open}
      >
        <header>
          <strong>Tương tác nhân vật</strong>
          <button type="button" aria-label="Đóng tương tác" onClick={selected}>
            <X size={18} />
          </button>
        </header>
        <button
          type="button"
          className="presentation-launcher"
          aria-label="Trình chiếu PDF / ảnh"
          onClick={onPresentation}
        >
          ▧ Trình chiếu PDF / ảnh
        </button>
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
        <button
          className="sound-toggle"
          type="button"
          aria-pressed={soundsEnabled}
          onClick={onToggleSounds}
        >
          {soundsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}Âm
          thanh tương tác: {soundsEnabled ? "Bật" : "Tắt"}
        </button>
      </section>
    </div>
  );
}
