import { useMemo, useState } from "react";
import { MAX_IMPORT_BYTES, parsePlaylist } from "../shared/playlist";
export default function PlaylistImport({
  busy,
  onImport,
}: {
  busy: boolean;
  onImport: (urls: string[]) => Promise<void>;
}) {
  const [text, setText] = useState(""),
    [notice, setNotice] = useState("");
  const preview = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return { parsed: parsePlaylist(text) };
    } catch (e) {
      return { error: importError(e) };
    }
  }, [text]);
  return (
    <details className="playlist-import">
      <summary>Nhập nhiều link</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!preview?.parsed || busy) return;
          await onImport(preview.parsed.urls);
        }}
      >
        <label>
          Danh sách link · mỗi dòng một link
          <textarea
            value={text}
            maxLength={MAX_IMPORT_BYTES}
            rows={4}
            onChange={(e) => {
              setText(e.target.value);
              setNotice("");
            }}
            placeholder={"https://youtu.be/…\nhttps://example.com/music.mp3"}
          />
        </label>
        <label className="file-picker">
          Đọc từ file TXT / M3U
          <input
            type="file"
            accept=".txt,.m3u,text/plain,audio/x-mpegurl"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > MAX_IMPORT_BYTES) {
                setNotice("File danh sách tối đa 16 KB.");
                return;
              }
              try {
                setText(await f.text());
                setNotice("");
              } catch {
                setNotice("Không đọc được file danh sách.");
              }
            }}
          />
        </label>
        <p className="muted">
          Tối đa 20 link, 16 KB. Bỏ link trùng trong lần nhập này; giữ nguyên
          nội dung khi có lỗi. Không hỗ trợ playlist livestream HLS.
        </p>
        {notice && <p role="alert">{notice}</p>}
        {preview?.error && <p role="alert">{preview.error}</p>}
        {preview?.parsed && (
          <p role="status">
            {preview.parsed.urls.length} mục hợp lệ
            {preview.parsed.duplicates
              ? ` · bỏ ${preview.parsed.duplicates} link trùng`
              : ""}
          </p>
        )}
        <button type="submit" disabled={busy || !preview?.parsed}>
          Thêm danh sách
        </button>
      </form>
    </details>
  );
}
export function importError(e: unknown) {
  const code = e instanceof Error ? e.message : "";
  const line = code.match(/^INVALID_MEDIA_LINE:(\d+)$/)?.[1];
  if (line) return `Dòng ${line}: link không hợp lệ hoặc chưa được hỗ trợ.`;
  return (
    (
      {
        IMPORT_TOO_LARGE: "Danh sách tối đa 16 KB.",
        IMPORT_TOO_MANY: "Mỗi lần nhập tối đa 20 link.",
        IMPORT_EMPTY: "Hãy nhập ít nhất một link.",
        IMPORT_STREAM_PLAYLIST: "Playlist livestream HLS chưa được hỗ trợ.",
      } as Record<string, string>
    )[code] || "Không đọc được danh sách link."
  );
}
