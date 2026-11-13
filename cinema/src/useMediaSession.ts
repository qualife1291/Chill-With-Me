import { useEffect, useRef } from "react";
import { target, type Command, type Room } from "../shared/model";
import { mediaLabel } from "../shared/media";
const actions: MediaSessionAction[] = [
  "play",
  "pause",
  "seekto",
  "seekbackward",
  "seekforward",
];
export function useMediaSession(
  room: Room | null,
  host: boolean,
  command: (c: Command) => Promise<unknown>,
  serverNow: () => number,
) {
  const latest = useRef({ room, host, command, serverNow });
  latest.current = { room, host, command, serverNow };
  useEffect(() => {
    const media = navigator.mediaSession;
    if (!media || !room?.session) return;
    const send = (
      action: MediaSessionAction,
      details: MediaSessionActionDetails,
    ) => {
      const p = latest.current,
        r = p.room;
      if (!p.host || !r?.current) return;
      if (action === "play" || action === "pause") {
        void p
          .command({ type: action, generation: r.generation })
          .catch(() => {});
        return;
      }
      const at = target(r, p.serverNow());
      const seconds =
        action === "seekto"
          ? details.seekTime
          : at +
            (action === "seekbackward" ? -1 : 1) * (details.seekOffset ?? 10);
      if (seconds === undefined || !Number.isFinite(seconds)) return;
      void p
        .command({
          type: "seek",
          generation: r.generation,
          position: Math.max(0, Math.min(86400, seconds)),
        })
        .catch(() => {});
    };
    for (const action of actions) {
      try {
        media.setActionHandler(action, host ? (d) => send(action, d) : null);
      } catch {
        /* Optional actions vary by browser. */
      }
    }
    return () => {
      for (const action of actions) {
        try {
          media.setActionHandler(action, null);
        } catch {}
      }
      media.metadata = null;
      media.playbackState = "none";
    };
  }, [room?.session, host]);
  useEffect(() => {
    const media = navigator.mediaSession;
    if (!media || !room?.session) return;
    if (typeof MediaMetadata !== "undefined")
      media.metadata = new MediaMetadata({
        title: mediaLabel(room.current),
        artist: room.title,
        album: "Chill With Me",
      });
    media.playbackState = room.current
      ? room.playing
        ? "playing"
        : "paused"
      : "none";
  }, [room?.session, room?.current?.id, room?.title, room?.playing, host]);
}
