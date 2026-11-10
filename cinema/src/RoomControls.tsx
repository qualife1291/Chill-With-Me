import { useEffect, useState } from "react";
import {
  Armchair,
  Hand,
  RotateCcw,
  X,
  Leaf,
  Volume2,
  VolumeX,
} from "lucide-react";
import { reactions } from "./RoomActivity";
import type { SceneQuality } from "./useSceneQuality";
import type { Room, Member, Command, ReactionKind } from "../shared/model";
export default function RoomControls({
  room,
  me,
  camera,
  onCamera,
  onReset,
  light,
  onLight,
  onClose,
  command,
  soundsEnabled,
  onToggleSounds,
  quality,
  onQuality,
}: {
  quality: SceneQuality;
  onQuality: (quality: SceneQuality) => void;
  room: Room;
  me: Member;
  camera: string;
  onCamera: (mode: string) => void;
  onReset: () => void;
  light: boolean;
  onLight: () => void;
  onClose: () => void;
  soundsEnabled: boolean;
  onToggleSounds: () => void;
  command: (c: Command, onSuccess?: () => void) => Promise<unknown>;
}) {
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
      await command({ type: "reaction", kind }, () => setCooling(true));
    } finally {
      setSendingReaction(false);
    }
  };
  return (
    <section
      className="room-controls"
      aria-label="Điều chỉnh không gian và nhân vật"
    >
      <header>
        <span>Không gian của bạn</span>
        <button type="button" onClick={onClose} aria-label="Đóng điều khiển">
          <X size={16} />
        </button>
      </header>
      <div className="view-row">
        <label>
          Góc nhìn
          <select
            aria-label="Chọn góc nhìn"
            value={camera}
            onChange={(e) => onCamera(e.target.value)}
          >
            <option value="first">Mắt người</option>
            <option value="orbit">Tự do · nhìn quanh phòng</option>
          </select>
        </label>
        <button
          type="button"
          title="Nhìn màn chiếu"
          aria-label="Nhìn màn chiếu"
          onClick={onReset}
        >
          <RotateCcw size={17} />
        </button>
      </div>
      <p className="control-hint">Kéo để nhìn · Cuộn để thu/phóng</p>
      <label className="scene-quality">
        Độ nét cảnh 3D
        <select
          aria-label="Độ nét cảnh 3D"
          value={quality}
          onChange={(e) => onQuality(e.target.value as SceneQuality)}
        >
          <option value="auto">Tự động theo thiết bị</option>
          <option value="economy">Tiết kiệm · máy nhẹ hơn</option>
          <option value="detail">Chi tiết</option>
        </select>
      </label>
      <p className="control-hint">
        Chỉ chỉnh cảnh 3D; độ nét video giữ nguyên.
      </p>
      <details open className="control-section">
        <summary>Hành động</summary>
        <div className="action-row">
          <button onClick={() => void command({ type: "sit", instant: true })}>
            <Armchair size={17} />
            Ngồi ngay
          </button>
          <button onClick={() => void command({ type: "wave" })}>
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
                void command({ type: "poke", id: e.target.value });
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
      </details>
      <button className="light-toggle" onClick={onLight} aria-pressed={light}>
        <Leaf size={15} />
        {light ? "Bật 3D" : "Chế độ nhẹ"}
      </button>
    </section>
  );
}
