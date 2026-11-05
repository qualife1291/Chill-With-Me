import { useCallback, useEffect, useRef, useState } from "react";
import { RoomClock } from "../shared/clock";
export function useRoomClock(session: string | undefined) {
  const clock = useRef(new RoomClock()),
    active = useRef<WebSocket | null>(null),
    epoch = useRef(session);
  const pending = useRef(
    new Map<
      string,
      { sent: number; socket: WebSocket; session: string | undefined }
    >(),
  );
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [state, setState] = useState<{
    offset: number;
    rtt: number | null;
    calibrated: boolean;
  }>({ offset: 0, rtt: null, calibrated: false });
  const serverNow = useCallback(
    () => clock.current.now(performance.now(), Date.now()),
    [],
  );
  const publish = useCallback(() => {
    const mono = performance.now(),
      best = clock.current.best(mono);
    setState({
      offset:
        Math.round((clock.current.now(mono, Date.now()) - Date.now()) / 10) *
        10,
      rtt: best?.rtt ?? null,
      calibrated: !!best,
    });
  }, []);
  const probe = useCallback(() => {
    const socket = active.current;
    if (socket?.readyState !== WebSocket.OPEN) return;
    const now = performance.now();
    for (const [id, p] of pending.current)
      if (now - p.sent > 10000) pending.current.delete(id);
    if (pending.current.size >= 8) return;
    const nonce = crypto.randomUUID();
    pending.current.set(nonce, { sent: now, socket, session: epoch.current });
    try {
      socket.send(JSON.stringify({ type: "clock", nonce }));
    } catch {
      pending.current.delete(nonce);
    }
    publish();
  }, [publish]);
  const disconnect = useCallback((socket?: WebSocket) => {
    if (socket && active.current !== socket) return;
    active.current = null;
    setState((s) => ({ ...s, calibrated: false, rtt: null }));
    timers.current.forEach(clearTimeout);
    timers.current = [];
    pending.current.clear();
  }, []);
  const connect = useCallback(
    (socket: WebSocket) => {
      disconnect();
      active.current = socket;
      probe();
      timers.current = [setTimeout(probe, 400), setTimeout(probe, 1000)];
    },
    [disconnect, probe],
  );
  const pong = useCallback(
    (
      v: { nonce?: string; session?: string; serverTime?: number },
      socket: WebSocket,
    ) => {
      if (!v.nonce) return;
      const sent = pending.current.get(v.nonce);
      if (!sent) return;
      pending.current.delete(v.nonce);
      if (
        socket !== active.current ||
        sent.socket !== socket ||
        sent.session !== epoch.current ||
        v.session !== epoch.current ||
        typeof v.serverTime !== "number"
      )
        return;
      if (clock.current.record(sent.sent, performance.now(), v.serverTime))
        publish();
    },
    [publish],
  );
  const fallback = useCallback(
    (serverTime: number, nextSession?: string) => {
      // The HTTP snapshot can precede the render/effect for a new room.
      // Bind its bootstrap anchor now so that effect does not discard it.
      if (nextSession && epoch.current !== nextSession) {
        epoch.current = nextSession;
        clock.current.reset();
        pending.current.clear();
      }
      clock.current.seed(serverTime, performance.now());
      publish();
    },
    [publish],
  );
  useEffect(() => {
    if (epoch.current !== session) {
      epoch.current = session;
      clock.current.reset();
      pending.current.clear();
    }
    publish();
  }, [session, publish]);
  useEffect(() => {
    const timer = setInterval(probe, 15000),
      visible = () => {
        if (!document.hidden) probe();
      };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", visible);
      disconnect();
    };
  }, [disconnect, probe]);
  return { ...state, serverNow, connect, disconnect, pong, fallback };
}
