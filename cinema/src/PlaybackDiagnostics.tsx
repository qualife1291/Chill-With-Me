import { useEffect, useRef, useState } from "react";

// Explicit, local eight-second sample. No RAF, polling, source URLs or uploads.
export default function PlaybackDiagnostics({ rtt }: { rtt?: number | null }) {
  const [message, setMessage] = useState(""),
    [running, setRunning] = useState(false);
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stopListeners = useRef<() => void>(() => {});
  const cancel = () => {
    clearTimeout(pending.current);
    pending.current = undefined;
    stopListeners.current();
    setRunning(false);
  };
  useEffect(() => {
    const hidden = () => {
      if (document.hidden && pending.current !== undefined) {
        clearTimeout(pending.current);
        pending.current = undefined;
        stopListeners.current();
        setRunning(false);
        setMessage("Đã dừng đo khi chuyển tab. Bạn có thể đo lại.");
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      clearTimeout(pending.current);
      stopListeners.current();
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  const measure = () => {
    cancel();
    const video =
      document.querySelector<HTMLVideoElement>("video.native-video");
    if (!video || !video.videoWidth) {
      setMessage(
        "Chỉ đo khung hình của video native đang phát; YouTube, Drive preview và nhạc không cung cấp số đo này.",
      );
      return;
    }
    if (video.paused || video.readyState < 2 || document.hidden) {
      setMessage("Hãy phát video và giữ tab hiển thị để đo.");
      return;
    }
    const source = video.currentSrc,
      quality = video.getVideoPlaybackQuality?.(),
      start = video.currentTime;
    let interrupted = false;
    const interrupt = () => {
      interrupted = true;
    };
    const events = ["pause", "seeking", "waiting", "emptied"] as const;
    for (const event of events)
      video.addEventListener(event, interrupt, { once: true });
    const cleanup = () => {
      for (const event of events) video.removeEventListener(event, interrupt);
    };
    // Abort also releases listeners immediately when hidden/closed/unmounted.
    const timer = setTimeout(() => {
      cleanup();
      pending.current = undefined;
      setRunning(false);
      if (
        !video.isConnected ||
        video.currentSrc !== source ||
        video.paused ||
        interrupted ||
        video.currentTime <= start
      ) {
        setMessage(
          "Lần đo bị gián đoạn hoặc đổi nguồn; hãy phát ổn định rồi đo lại.",
        );
        return;
      }
      const final = video.getVideoPlaybackQuality?.(),
        frames =
          quality && final
            ? final.totalVideoFrames - quality.totalVideoFrames
            : undefined,
        dropped =
          quality && final
            ? final.droppedVideoFrames - quality.droppedVideoFrames
            : undefined;
      let buffer = 0;
      for (let i = 0; i < video.buffered.length; i++) {
        if (
          video.buffered.start(i) <= video.currentTime &&
          video.buffered.end(i) >= video.currentTime
        )
          buffer = video.buffered.end(i) - video.currentTime;
      }
      setMessage(
        `${video.videoWidth} × ${video.videoHeight} · đệm ${buffer.toFixed(1)} giây · ${frames !== undefined && dropped !== undefined && frames >= 0 && dropped >= 0 ? `${frames} khung, bỏ ${dropped} trong lần đo` : "trình duyệt không cung cấp bộ đếm khung"}.`,
      );
    }, 8000);
    pending.current = timer;
    stopListeners.current = cleanup;
    setMessage("Đang đo trong 8 giây… Giữ video phát và tab hiển thị.");
    setRunning(true);
  };
  return (
    <details
      className="control-section playback-diagnostics"
      onToggle={(e) => {
        if (!e.currentTarget.open) {
          cancel();
          setMessage("");
        }
      }}
    >
      <summary>Kiểm tra phát video</summary>
      <p className="control-hint">
        Đo riêng trên máy bạn, không gửi dữ liệu. Đây không phải điểm FPS hay
        cam kết độ mượt thiết bị.
      </p>
      <p className="control-hint">
        {Number.isFinite(rtt)
          ? `Độ trễ kết nối: ${Math.round(rtt!)} ms.`
          : "Chưa có số đo độ trễ kết nối."}
      </p>
      <button type="button" disabled={running} onClick={measure}>
        Đo video trong 8 giây
      </button>
      {running && (
        <button
          type="button"
          onClick={() => {
            cancel();
            setMessage("Đã dừng đo.");
          }}
        >
          Dừng đo
        </button>
      )}
      {message && <p role="status">{message}</p>}
    </details>
  );
}
