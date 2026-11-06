import NativePlayer, { type PlayerProps } from "./NativePlayer";
import { mediaSource } from "../shared/media";
import { useEffect, useRef, useState } from "react";
import { target, type Room, type Command } from "../shared/model";
export type YouTubePlayer = {
  loadVideoById: (v: { videoId: string; startSeconds: number }) => void;
  cueVideoById: (v: { videoId: string; startSeconds: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (t: number, allow: boolean) => void;
  getCurrentTime: () => number;
  getPlayerState: () => number;
  getDuration: () => number;
  getVideoData: () => { video_id?: string };
  getVolume: () => number;
  setVolume: (n: number) => void;
  destroy: () => void;
};
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, config: object) => YouTubePlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}
let api: Promise<void> | undefined;
function loadAPI() {
  return (api ??= new Promise<void>((resolve, reject) => {
    if (window.YT) {
      resolve();
      return;
    }
    window.onYouTubeIframeAPIReady = resolve;
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.onerror = () => {
      api = undefined;
      reject(Error("YouTube không kết nối được"));
    };
    document.head.append(s);
  }));
}
function YouTubePlayerView({
  room,
  offset,
  onEnded,
  isHost,
  onControl,
  speaking,
  serverNow,
}: {
  room: Room;
  offset: number;
  serverNow?: () => number;
  onEnded: () => void;
  isHost: boolean;
  onControl: (c: Command) => Promise<void>;
  speaking: boolean;
}) {
  const el = useRef<HTMLDivElement>(null),
    player = useRef<YouTubePlayer | null>(null),
    loaded = useRef(-1),
    endedGeneration = useRef(-1),
    quietUntil = useRef(0),
    controlPending = useRef(false),
    lastSample = useRef<{
      time: number;
      position: number;
      state: number;
    } | null>(null),
    duck = useRef<{ original: number; applied: number } | null>(null);
  const latest = useRef({
    room,
    offset,
    onEnded,
    isHost,
    onControl,
    serverNow,
  });
  latest.current = { room, offset, onEnded, isHost, onControl, serverNow };
  const [error, setError] = useState(""),
    [ready, setReady] = useState(false);
  const current = !!room.current;
  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    void loadAPI()
      .then(() => {
        if (cancelled || !el.current || !window.YT) return;
        const mount = document.createElement("div");
        el.current.replaceChildren(mount);
        player.current = new window.YT.Player(mount, {
          width: "100%",
          height: "100%",
          playerVars: {
            playsinline: 1,
            origin: location.origin,
            controls: latest.current.isHost ? 1 : 0,
            disablekb: latest.current.isHost ? 0 : 1,
            rel: 0,
          },
          events: {
            onReady: () => setReady(true),
            onAutoplayBlocked: () =>
              setError(
                "Trình duyệt đang chặn tự phát. Bấm Phát / bắt kịp phòng để tiếp tục.",
              ),
            onError: (e: { data: number }) =>
              setError(
                `YouTube báo lỗi ${e.data}. Chủ phòng có thể bỏ qua video.`,
              ),
            onStateChange: (e: { data: number }) => {
              const p = player.current,
                r = latest.current.room;
              if (
                !p ||
                !r.current ||
                loaded.current !== r.generation ||
                p.getVideoData().video_id !== r.current.videoId
              )
                return;
              if (
                !r.readinessPaused &&
                e.data === 0 &&
                p.getDuration() > 0 &&
                p.getCurrentTime() >= p.getDuration() - 2 &&
                endedGeneration.current !== r.generation
              ) {
                endedGeneration.current = r.generation;
                quietUntil.current = performance.now() + 1200;
                p.pauseVideo();
                if (latest.current.isHost) latest.current.onEnded();
                return;
              }
              if (
                latest.current.isHost &&
                performance.now() > quietUntil.current
              ) {
                if (e.data === 2 && r.playing)
                  latest.current.onControl({
                    type: "pause",
                    generation: r.generation,
                  });
                if (e.data === 1 && !r.playing && !r.readinessPaused)
                  latest.current.onControl({
                    type: "play",
                    generation: r.generation,
                  });
              }
            },
          },
        });
      })
      .catch(() => setError("Không tải được YouTube."));
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
      loaded.current = -1;
      lastSample.current = null;
      duck.current = null;
      setReady(false);
    };
  }, [current, isHost]);
  useEffect(() => {
    const p = player.current;
    if (!ready || !p) return;
    const sync = () => {
      const { room: r, offset: o, isHost: host } = latest.current;
      if (!r.current) return;
      const t = target(r, latest.current.serverNow?.() ?? Date.now() + o);
      if (
        loaded.current !== r.generation ||
        (p.getVideoData().video_id &&
          p.getVideoData().video_id !== r.current.videoId)
      ) {
        loaded.current = r.generation;
        quietUntil.current = performance.now() + 1200;
        lastSample.current = null;
        setError("");
        const v = { videoId: r.current.videoId, startSeconds: t };
        r.playing ? p.loadVideoById(v) : p.cueVideoById(v);
        return;
      }
      // Host is the source for native iframe seeks. Never pull its scrubber back to the old server anchor.
      if (
        !host &&
        p.getPlayerState() !== 3 &&
        Math.abs(p.getCurrentTime() - t) > 1.5
      ) {
        quietUntil.current = performance.now() + 800;
        p.seekTo(t, true);
      }
      if (r.playing && ![1, 3].includes(p.getPlayerState())) {
        quietUntil.current = performance.now() + 800;
        p.playVideo();
      } else if (!r.playing && p.getPlayerState() === 1) {
        quietUntil.current = performance.now() + 800;
        p.pauseVideo();
      }
    };
    sync();
    const t = setInterval(() => {
      if (!latest.current.isHost) sync();
    }, 5000);
    return () => clearInterval(t);
  }, [
    ready,
    room.generation,
    room.playing,
    room.anchor,
    room.readinessPaused,
    room.waiting?.length,
  ]);
  useEffect(() => {
    if (!ready) return;
    const t = setInterval(() => {
      const p = player.current,
        r = latest.current.room;
      if (!p || !r.current || !latest.current.isHost || r.readinessPaused)
        return;
      if (
        p.getVideoData().video_id &&
        p.getVideoData().video_id !== r.current.videoId
      ) {
        quietUntil.current = performance.now() + 1200;
        p.loadVideoById({
          videoId: r.current.videoId,
          startSeconds: target(
            r,
            latest.current.serverNow?.() ?? Date.now() + latest.current.offset,
          ),
        });
        return;
      }
      const now = performance.now(),
        position = p.getCurrentTime(),
        state = p.getPlayerState(),
        before = lastSample.current;
      lastSample.current = { time: now, position, state };
      if (
        controlPending.current ||
        !before ||
        now < quietUntil.current ||
        ![1, 2].includes(state) ||
        p.getVideoData().video_id !== r.current.videoId
      )
        return;
      const expected =
        before.position + (before.state === 1 ? (now - before.time) / 1000 : 0);
      if (
        Math.abs(position - expected) > 1.5 ||
        Math.abs(
          position -
            target(
              r,
              latest.current.serverNow?.() ??
                Date.now() + latest.current.offset,
            ),
        ) > 3
      ) {
        quietUntil.current = now + 500;
        controlPending.current = true;
        void latest.current
          .onControl({ type: "seek", generation: r.generation, position })
          .finally(() => {
            controlPending.current = false;
          });
      }
    }, 250);
    return () => clearInterval(t);
  }, [ready]);
  useEffect(() => {
    const p = player.current;
    if (!ready || !p) return;
    if (speaking && !duck.current) {
      const original = p.getVolume(),
        applied = Math.min(original, original * 0.25);
      duck.current = { original, applied };
      p.setVolume(applied);
    } else if (!speaking && duck.current) {
      if (Math.abs(p.getVolume() - duck.current.applied) < 1)
        p.setVolume(duck.current.original);
      duck.current = null;
    }
    return () => {
      if (duck.current && player.current) {
        if (Math.abs(player.current.getVolume() - duck.current.applied) < 1)
          player.current.setVolume(duck.current.original);
        duck.current = null;
      }
    };
  }, [speaking, ready]);
  return (
    <section className="player-panel" data-control={isHost ? "host" : "viewer"}>
      {!current ? (
        <div className="empty-player">
          <span>▶</span>
          <h2>Buổi chiếu bắt đầu từ bạn.</h2>
          <p>Thêm video vào playlist rồi bấm Phát tiếp.</p>
        </div>
      ) : (
        <div ref={el} className="youtube" />
      )}
      {error && <p className="player-error">{error}</p>}
      {current && (
        <button
          className="unlock"
          onClick={() => {
            const p = player.current;
            if (!p) return;
            if (!latest.current.isHost)
              p.seekTo(
                target(
                  latest.current.room,
                  latest.current.serverNow?.() ??
                    Date.now() + latest.current.offset,
                ),
                true,
              );
            if (latest.current.room.playing) p.playVideo();
          }}
        >
          Phát / bắt kịp phòng
        </button>
      )}
    </section>
  );
}

export default function PlayerView(props: PlayerProps) {
  return props.room.current &&
    mediaSource(props.room.current).kind !== "youtube" ? (
    <NativePlayer key={props.room.current.id} {...props} />
  ) : (
    <YouTubePlayerView {...props} />
  );
}
