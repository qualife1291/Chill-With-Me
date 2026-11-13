import { useMediaHold } from "./useMediaHold";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { target, type Room, type Command } from "../shared/model";
import {
  mediaSource,
  playableURL,
  isAudio,
  isHlsURL,
  mediaLabel,
  FILE_ACCEPT,
} from "../shared/media";
import { useHls } from "./useHls";
import type { FileShare } from "./FileShare";
export type PlayerProps = {
  room: Room;
  offset: number;
  serverNow?: () => number;
  isHost: boolean;
  onEnded: () => void;
  onControl: (c: Command) => Promise<void>;
  duckAudio: boolean;
  held?: boolean;
  files: FileShare;
  captions?: { url: string; name: string };
  onPreviewModeChange?: (preview: boolean) => void;
};
export default function NativePlayer(props: PlayerProps) {
  const { room, isHost, duckAudio, files } = props,
    source = mediaSource(room.current!);
  const transfer = useSyncExternalStore(files.subscribe, files.snapshot);
  const url = source.kind === "local" ? transfer.url : playableURL(source);
  const streaming = source.kind === "url" && isHlsURL(url || "");
  const ref = useRef<HTMLVideoElement>(null),
    latest = useRef(props);
  latest.current = props;
  const expectedSeek = useRef<number | null>(null),
    expectedPlayback = useRef<"play" | "pause" | null>(null),
    ended = useRef(false),
    ready = useRef(false),
    buffering = useRef(false),
    nativePending = useRef(0),
    duck = useRef<{ original: number; applied: number } | null>(null);
  const [error, setError] = useState(""),
    [blocked, setBlocked] = useState(false),
    [preview, setPreview] = useState(false);
  useMediaHold(ref, !!props.held, url);
  useLayoutEffect(() => {
    props.onPreviewModeChange?.(preview);
    return () => props.onPreviewModeChange?.(false);
  }, [preview, props.onPreviewModeChange]);
  function sync(force = false) {
    const v = ref.current,
      { room: r, offset, isHost: host } = latest.current;
    if (
      !v ||
      !ready.current ||
      ended.current ||
      (host && nativePending.current > 0)
    )
      return;
    if (r.presentation) {
      if (!v.paused) {
        expectedPlayback.current = "pause";
        v.pause();
      }
      return;
    }
    const t = target(r, latest.current.serverNow?.() ?? Date.now() + offset);
    if (
      force ||
      (!host &&
        !v.seeking &&
        !buffering.current &&
        v.readyState >= 3 &&
        Math.abs(v.currentTime - t) > 1.5)
    ) {
      const position = Math.min(t, Math.max(0, v.duration - 0.05));
      if (Math.abs(v.currentTime - position) > 0.05) {
        expectedSeek.current = position;
        v.currentTime = position;
      }
    }
    if (r.playing && v.paused) {
      expectedPlayback.current = "play";
      void v
        .play()
        .then(() => setBlocked(false))
        .catch((e) => {
          if (e.name === "NotAllowedError") setBlocked(true);
          else if (e.name !== "AbortError")
            setError("Không phát được video trên trình duyệt này.");
        });
    } else if (!r.playing && !v.paused) {
      expectedPlayback.current = "pause";
      v.pause();
    }
  }
  useEffect(() => {
    const v = ref.current;
    ready.current = false;
    ended.current = false;
    buffering.current = false;
    setError("");
    setBlocked(false);
    duck.current = null;
    return () => {
      if (v) {
        ended.current = true;
        v.pause();
        v.removeAttribute("src");
        v.load();
      }
    };
  }, [url]);
  const stream = useHls(ref, streaming ? url || "" : "", {
    ready: () => {
      ready.current = true;
      sync(true);
    },
    unavailable: () => {
      ready.current = false;
      buffering.current = false;
    },
  });
  useEffect(() => {
    sync(true);
    const timer = setInterval(() => sync(), 1000);
    return () => clearInterval(timer);
  }, [
    room.generation,
    room.playing,
    room.position,
    room.anchor,
    room.presentation?.source.fileId,
    isHost,
    url,
  ]);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (duckAudio && !duck.current) {
      const original = v.volume,
        applied = original * 0.25;
      duck.current = { original, applied };
      v.volume = applied;
    } else if (!duckAudio && duck.current) {
      if (Math.abs(v.volume - duck.current.applied) < 0.001)
        v.volume = duck.current.original;
      duck.current = null;
    }
    return () => {
      if (duck.current) {
        if (Math.abs(v.volume - duck.current.applied) < 0.001)
          v.volume = duck.current.original;
        duck.current = null;
      }
    };
  }, [duckAudio, url]);
  function control(type: "play" | "pause" | "seek") {
    const p = latest.current,
      v = ref.current;
    if (
      !v ||
      !ready.current ||
      !p.isHost ||
      !!p.room.readinessPaused ||
      ended.current ||
      v.ended
    )
      return;
    if (
      !nativePending.current &&
      ((type === "play" && p.room.playing) ||
        (type === "pause" && !p.room.playing))
    )
      return;
    const command: Command =
      type === "seek"
        ? { type, generation: p.room.generation, position: v.currentTime }
        : { type, generation: p.room.generation };
    nativePending.current++;
    void p.onControl(command).finally(() => {
      nativePending.current--;
      if (!nativePending.current) setTimeout(() => sync(true), 0);
    });
  }
  const failure =
    stream.error || error || (source.kind === "local" ? transfer.error : "");
  return (
    <section
      className={isAudio(source) ? "player-panel audio-player" : "player-panel"}
      data-control={isHost ? "host" : "viewer"}
      data-provider={source.kind}
      data-stream-engine={streaming ? stream.engine : undefined}
    >
      {isAudio(source) && url && (
        <div className="audio-cover" aria-hidden="true">
          <span>♫</span>
          <p>{mediaLabel(room.current)}</p>
        </div>
      )}
      {preview && source.kind === "drive" ? (
        <iframe
          className="native-video"
          title="Xem trước Google Drive · không đồng bộ"
          src={`https://drive.google.com/file/d/${source.fileId}/preview${source.resourceKey ? "?resourcekey=" + encodeURIComponent(source.resourceKey) : ""}`}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      ) : url ? (
        <video
          ref={ref}
          key={url}
          className="native-video"
          src={streaming ? undefined : url}
          crossOrigin={source.kind === "drive" ? "anonymous" : undefined}
          playsInline
          preload="auto"
          controls={isHost}
          onWaiting={() => {
            buffering.current = true;
          }}
          onPlaying={() => {
            buffering.current = false;
          }}
          onCanPlay={() => {
            buffering.current = false;
          }}
          onLoadedMetadata={() => {
            if (streaming) return;
            ready.current = true;
            sync(true);
          }}
          onPlay={() => {
            if (latest.current.room.presentation) {
              expectedPlayback.current = "pause";
              ref.current?.pause();
              return;
            }
            if (expectedPlayback.current === "play") {
              expectedPlayback.current = null;
              return;
            }
            control("play");
          }}
          onPause={() => {
            if (expectedPlayback.current === "pause") {
              expectedPlayback.current = null;
              return;
            }
            control("pause");
          }}
          onSeeked={() => {
            const expected = expectedSeek.current;
            expectedSeek.current = null;
            if (
              expected !== null &&
              ref.current &&
              Math.abs(ref.current.currentTime - expected) < 0.25
            )
              return;
            control("seek");
          }}
          onEnded={() => {
            if (ended.current || latest.current.room.readinessPaused) return;
            ended.current = true;
            if (latest.current.isHost) latest.current.onEnded();
          }}
          onError={() => {
            if (!streaming)
              setError(
                source.kind === "drive"
                  ? "Không tải được video Drive. File cần chia sẻ công khai; Google có thể giới hạn tải hoặc yêu cầu xác nhận."
                  : "Không tải được video. Hãy kiểm tra link, codec và quyền truy cập.",
              );
          }}
          aria-label="Video của phòng"
        >
          {props.captions?.url && !isAudio(source) && (
            <track
              key={props.captions.url}
              kind="subtitles"
              src={props.captions.url}
              srcLang="und"
              label={props.captions.name || "Phụ đề riêng"}
              default
              onLoad={(e) => {
                e.currentTarget.track.mode = "showing";
              }}
            />
          )}
        </video>
      ) : (
        <div className="empty-player">
          <p>
            {source.kind === "local" && !failure
              ? `Đang nhận video: ${Math.floor((100 * transfer.received) / Math.max(1, transfer.size))}%`
              : "Đang chuẩn bị video"}
          </p>
        </div>
      )}
      {streaming && stream.loading && !stream.error && (
        <div className="stream-status" role="status">
          Đang tải HLS…
        </div>
      )}
      {streaming && stream.engine === "mse" && stream.levels.length > 1 && (
        <label className="stream-quality">
          Chất lượng trên máy bạn
          <select
            aria-label="Chất lượng luồng"
            value={stream.level}
            onChange={(e) => stream.choose(Number(e.target.value))}
          >
            <option value={-1}>Tự động theo mạng</option>
            {stream.levels.map((l) => (
              <option key={l.index} value={l.index}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {streaming && stream.error && (
        <button className="stream-retry" onClick={stream.retry}>
          Thử lại HLS
        </button>
      )}
      {failure && (
        <p className="player-error" role="alert">
          {failure}
        </p>
      )}
      {source.kind === "local" && !url && (
        <div className="media-recovery">
          <button
            onClick={() => {
              setError("");
              files.retry();
            }}
          >
            Thử nhận trực tiếp
          </button>
          {!files.isOwner() && source.size <= 25 * 1024 * 1024 && (
            <button
              onClick={() => {
                setError("");
                files.receiveViaRoom();
              }}
            >
              Nhận qua phòng · tối đa 25 MB
            </button>
          )}
          {files.isOwner() && (
            <label>
              Chọn lại file
              <input
                type="file"
                accept={FILE_ACCEPT}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f)
                    void files.restore(f).catch((e) => setError(e.message));
                  e.target.value = "";
                }}
              />
            </label>
          )}
        </div>
      )}
      {source.kind === "drive" && (failure || preview) && (
        <div className="drive-recovery">
          <p>
            {preview
              ? "Bản xem trước do Google điều khiển, mỗi người tự phát/tua; không đồng bộ với phòng."
              : "Google có thể chặn phát trực tiếp. Có thể mở bản xem trước, hoặc tải file và chia sẻ lại từ máy để xem cùng phòng."}
          </p>
          <button
            disabled={!!props.held}
            onClick={() => {
              if (latest.current.held) return;
              setPreview((v) => !v);
              setError("");
            }}
          >
            {preview ? "Thử phát đồng bộ lại" : "Mở bản xem trước Drive"}
          </button>
          {props.held && (
            <p role="status">
              Bỏ Hold trước khi mở Drive preview; iframe này không có API tắt
              tiếng.
            </p>
          )}
          <a
            className="media-external"
            target="_blank"
            rel="noopener noreferrer"
            href={`https://drive.google.com/file/d/${source.fileId}/view${source.resourceKey ? "?resourcekey=" + encodeURIComponent(source.resourceKey) : ""}`}
          >
            Kiểm tra file trên Google Drive
          </a>
        </div>
      )}
      {url && !preview && !failure && (
        <button
          className="unlock"
          onClick={() => {
            ended.current = false;
            sync(true);
          }}
        >
          {blocked ? "Bấm để cho phép phát" : "Phát / bắt kịp phòng"}
        </button>
      )}
    </section>
  );
}
