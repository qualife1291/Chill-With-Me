import { Armchair, Hand, RotateCcw, X, Leaf } from "lucide-react";
import type { Room, Member, Command } from "../shared/model";
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
}: {
  room: Room;
  me: Member;
  camera: string;
  onCamera: (mode: string) => void;
  onReset: () => void;
  light: boolean;
  onLight: () => void;
  onClose: () => void;
  command: (c: Command, onSuccess?: () => void) => Promise<unknown>;
}) {
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
      </details>
      <button className="light-toggle" onClick={onLight} aria-pressed={light}>
        <Leaf size={15} />
        {light ? "Bật 3D" : "Chế độ nhẹ"}
      </button>
    </section>
  );
}
