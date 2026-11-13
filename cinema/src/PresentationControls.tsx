import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { X, ChevronLeft, ChevronRight, FileUp } from "lucide-react";
import { DOCUMENT_ACCEPT } from "../shared/presentation";
import type { Room, Command } from "../shared/model";
import type { FileShare } from "./FileShare";
export default function PresentationControls({
  room,
  isHost,
  files,
  onFile,
  command,
  onClose,
  busy,
}: {
  room: Room;
  isHost: boolean;
  files: FileShare;
  onFile: (file: File, restore?: boolean) => Promise<void>;
  command: (c: Command, onSuccess?: () => void) => Promise<unknown>;
  onClose: () => void;
  busy: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    root.current
      ?.querySelector<HTMLButtonElement>("header button")
      ?.focus({ preventScroll: true });
  }, []);
  const transfer = useSyncExternalStore(files.subscribe, files.snapshot),
    p = room.presentation;
  const [sending, setSending] = useState(false);
  const send = async (c: Command) => {
    setSending(true);
    try {
      await command(c);
    } finally {
      setSending(false);
    }
  };
  return (
    <section
      className="activity-sheet"
      ref={root}
      aria-label="Trình chiếu tài liệu"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header>
        <strong>Trình chiếu</strong>
        <button type="button" aria-label="Đóng trình chiếu" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <p className="small">PDF / ảnh · tối đa 20 MB · 200 trang</p>
      {isHost && (
        <label className="document-picker">
          <FileUp size={20} />
          <span>
            {busy
              ? "Đang kiểm tra tài liệu…"
              : p
                ? "Đổi tài liệu"
                : "Chọn PDF hoặc ảnh"}
          </span>
          <input
            type="file"
            aria-label="Chọn tài liệu trình chiếu"
            accept={DOCUMENT_ACCEPT}
            disabled={busy || sending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void onFile(f);
            }}
          />
        </label>
      )}
      {!p && !isHost && (
        <p>Chủ phòng có thể chọn PDF hoặc ảnh để cả phòng cùng xem.</p>
      )}
      {p && (
        <>
          <p className="document-name">{p.source.name}</p>
          <p>
            Trang {p.page} / {p.source.pages}
          </p>
          {isHost ? (
            <div className="slide-navigation">
              <button
                type="button"
                aria-label="Trang trước"
                disabled={busy || sending || p.page === 1}
                onClick={() =>
                  void send({
                    type: "slide",
                    fileId: p.source.fileId,
                    page: p.page - 1,
                    expectedRevision: p.revision,
                  })
                }
              >
                <ChevronLeft size={18} />
                Trước
              </button>
              <button
                type="button"
                aria-label="Trang tiếp"
                disabled={busy || sending || p.page === p.source.pages}
                onClick={() =>
                  void send({
                    type: "slide",
                    fileId: p.source.fileId,
                    page: p.page + 1,
                    expectedRevision: p.revision,
                  })
                }
              >
                Tiếp
                <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            <p className="small">Đang theo trang của chủ phòng.</p>
          )}
          {!transfer.url && (
            <div className="document-transfer" role="status">
              <p>
                {transfer.error ||
                  `Đang nhận ${Math.round((100 * transfer.received) / Math.max(1, p.source.size))}%`}
              </p>
              {files.isOwner() ? (
                <label>
                  Chọn lại file sau khi tải lại trang
                  <input
                    type="file"
                    aria-label="Chọn lại tài liệu"
                    accept={DOCUMENT_ACCEPT}
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void onFile(f, true);
                    }}
                  />
                </label>
              ) : (
                <>
                  <button type="button" onClick={() => files.retry()}>
                    Thử nhận lại
                  </button>
                  <button type="button" onClick={() => files.receiveViaRoom()}>
                    Nhận qua phòng
                  </button>
                  <p className="small">
                    Nếu kết nối trực tiếp không thành công, nhận qua phòng sẽ
                    truyền file qua máy chủ tạm thời, không lưu file.
                  </p>
                </>
              )}
            </div>
          )}
          {isHost && (
            <button
              type="button"
              disabled={busy || sending}
              onClick={() =>
                void send({
                  type: "stop-presentation",
                  fileId: p.source.fileId,
                  expectedRevision: p.revision,
                })
              }
            >
              Dừng trình chiếu
            </button>
          )}
        </>
      )}
      <details className="control-section">
        <summary>Lưu ý trình chiếu</summary>
        <p className="small">
          Người gửi giữ tab mở. Phim tạm dừng khi bắt đầu; dừng trình chiếu rồi
          bấm Phát video để xem tiếp. File không được lưu trên máy chủ.
        </p>
      </details>
    </section>
  );
}
