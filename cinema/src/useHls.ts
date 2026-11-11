import { useEffect, useRef, useState, type RefObject } from "react";
import type Hls from "hls.js";
import { publicHTTPSURL } from "../shared/media";
type Callbacks = { ready: () => void; unavailable: () => void };
const liveMessage =
  "Luồng này đang trực tiếp. Phòng hiện chỉ đồng bộ HLS video có điểm đầu/cuối; hãy chọn video VOD hoặc link YouTube.";

/** Native Safari first, lazy MSE fallback. Never fetch media through the Worker. */
export function useHls(
  video: RefObject<HTMLVideoElement | null>,
  url: string,
  callbacks: Callbacks,
) {
  const latest = useRef(callbacks);
  latest.current = callbacks;
  const player = useRef<Hls | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [engine, setEngine] = useState<
    "off" | "loading" | "native" | "mse" | "error"
  >("off");
  const [levels, setLevels] = useState<{ index: number; label: string }[]>([]);
  const [level, setLevel] = useState(-1),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const v = video.current;
    setError("");
    setLevels([]);
    setLevel(-1);
    if (!url || !v) {
      setEngine("off");
      setLoading(false);
      return;
    }
    let disposed = false,
      failed = false,
      notified = false,
      vod = false;
    let hls: Hls | null = null;
    const native = !!v.canPlayType("application/vnd.apple.mpegurl");
    const clear = () => {
      hls?.destroy();
      if (player.current === hls) player.current = null;
      hls = null;
      v.pause();
      v.removeAttribute("src");
      v.load();
    };
    const fail = (message: string) => {
      if (disposed || failed) return;
      failed = true;
      latest.current.unavailable();
      setError(message);
      setLoading(false);
      setEngine("error");
      clear();
    };
    const ready = () => {
      if (disposed || failed || notified || v.readyState < 1) return;
      if (native && v.duration === Infinity) {
        fail(liveMessage);
        return;
      }
      if ((native || vod) && Number.isFinite(v.duration) && v.duration > 0) {
        notified = true;
        setLoading(false);
        latest.current.ready();
      }
    };
    const mediaError = () =>
      fail(
        "Không đọc được HLS. Hãy kiểm tra codec, HTTPS/CORS và quyền xem của nguồn.",
      );
    v.addEventListener("loadedmetadata", ready);
    v.addEventListener("durationchange", ready);
    v.addEventListener("error", mediaError);
    const waiting = () => {
      if (!failed && !disposed) setLoading(true);
    };
    const flowing = () => {
      if (!failed && !disposed) setLoading(false);
    };
    v.addEventListener("waiting", waiting);
    v.addEventListener("playing", flowing);
    v.addEventListener("canplay", flowing);
    setEngine("loading");
    setLoading(true);
    if (native) {
      setEngine("native");
      v.src = url;
    } else
      void import("hls.js")
        .then(({ default: Hls }) => {
          if (disposed || failed) return;
          if (!Hls.isSupported()) {
            fail(
              "Thiết bị chưa hỗ trợ HLS/MSE. Hãy chọn MP4, WebM hoặc YouTube.",
            );
            return;
          }
          const policy = {
            default: {
              maxTimeToFirstByteMs: 10000,
              maxLoadTimeMs: 20000,
              timeoutRetry: {
                maxNumRetry: 1,
                retryDelayMs: 800,
                maxRetryDelayMs: 1600,
              },
              errorRetry: {
                maxNumRetry: 1,
                retryDelayMs: 800,
                maxRetryDelayMs: 1600,
              },
            },
          };
          hls = new Hls({
            enableWorker: true,
            maxBufferLength: 20,
            maxMaxBufferLength: 40,
            backBufferLength: 15,
            maxBufferSize: 25 * 1024 * 1024,
            lowLatencyMode: false,
            emeEnabled: false,
            enableInterstitialPlayback: false,
            manifestLoadPolicy: policy,
            playlistLoadPolicy: policy,
            fragLoadPolicy: policy,
            keyLoadPolicy: policy,
            xhrSetup: (xhr, resource) => {
              publicHTTPSURL(resource);
              xhr.withCredentials = false;
            },
          });
          player.current = hls;
          setEngine("mse");
          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            if (!disposed && !failed) hls?.loadSource(url);
          });
          hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            if (disposed || failed) return;
            setLevels(
              data.levels.map((entry, index) => ({
                index,
                label: entry.height
                  ? `${entry.height}p`
                  : `${Math.round(entry.bitrate / 1000)} kbps`,
              })),
            );
          });
          hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
            if (disposed || failed) return;
            if (data.details.live) {
              fail(liveMessage);
              return;
            }
            vod = true;
            ready();
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal)
              fail(
                "HLS bị gián đoạn hoặc nguồn không cho phép tải. Kiểm tra HTTPS/CORS, codec và quyền xem rồi thử lại.",
              );
          });
          hls.attachMedia(v);
        })
        .catch(() =>
          fail(
            "Chưa tải được trình phát HLS. Hãy kiểm tra kết nối rồi thử lại.",
          ),
        );
    return () => {
      disposed = true;
      v.removeEventListener("loadedmetadata", ready);
      v.removeEventListener("durationchange", ready);
      v.removeEventListener("error", mediaError);
      v.removeEventListener("waiting", waiting);
      v.removeEventListener("playing", flowing);
      v.removeEventListener("canplay", flowing);
      clear();
    };
  }, [url, attempt, video]);
  const choose = (index: number) => {
    const hls = player.current;
    if (
      !hls ||
      !Number.isInteger(index) ||
      index < -1 ||
      index >= hls.levels.length
    )
      return;
    hls.nextLevel = index;
    setLevel(index);
  };
  return {
    loading,
    error,
    engine,
    levels,
    level,
    choose,
    retry: () => setAttempt((n) => n + 1),
  };
}
