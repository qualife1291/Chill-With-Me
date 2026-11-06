import { useState, useEffect } from "react";
import type { Room, Command } from "../shared/model";
export default function PlaybackReadiness({
  room,
  id,
  onCommand,
}: {
  room: Room;
  id: string;
  onCommand: (c: Command) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false);
  useEffect(() => {
    if (room.waiting?.length) setOpen(true);
    else if (room.playing) setOpen(false);
  }, [room.waiting?.length, room.playing, room.generation]);
  if (!room.current) return null;
  const waiting = (room.waiting || []).filter((id) =>
      room.members.some((m) => m.id === id),
    ),
    mine = waiting.includes(id),
    host = room.host === id;
  const send = async (type: "wait" | "ready" | "resume") => {
    setBusy(true);
    try {
      await onCommand({ type, generation: room.generation });
    } finally {
      setBusy(false);
    }
  };
  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="playback-readiness"
      aria-label="Chờ mọi người cùng xem"
    >
      <summary title="Báo quảng cáo hoặc tải chậm để chờ nhau">
        Chờ{waiting.length ? ` · ${waiting.length}` : ""}
      </summary>
      <div className="readiness-body">
        <button
          disabled={busy}
          aria-pressed={mine}
          onClick={() => void send(mine ? "ready" : "wait")}
        >
          {mine ? "Đã sẵn sàng" : "Đang quảng cáo / tải video"}
        </button>
        {waiting.length > 0 ? (
          <p role="status">
            Phòng đang chờ:{" "}
            {waiting
              .map((id) => room.members.find((m) => m.id === id)?.name)
              .join(", ")}
            . Khi hết quảng cáo hoặc tải xong, hãy bấm “Đã sẵn sàng”.
          </p>
        ) : (
          !room.playing && (
            <p role="status">
              Không còn ai báo chờ. Chủ phòng có thể tiếp tục.
            </p>
          )
        )}
        {host && !room.playing && (
          <button
            disabled={busy}
            title={
              waiting.length
                ? "Tiếp tục dù vẫn có người báo chờ"
                : "Tiếp tục cùng timeline đã dừng"
            }
            onClick={() => void send("resume")}
          >
            {waiting.length
              ? "Tiếp tục dù còn người chờ"
              : "Tiếp tục cho cả phòng"}
          </button>
        )}
        <small>
          Đây là báo gián đoạn thủ công, không tự nhận diện hoặc bỏ quảng cáo.
          Chủ phòng quyết định thời điểm phát tiếp.
        </small>
      </div>
    </details>
  );
}
