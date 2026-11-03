import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

// One active pointer, one React update per animation frame, no idle render loop.
export function useHeadDrag(
  onTurn: (yaw: number, pitch: number) => void,
  enabled: boolean,
) {
  const callback = useRef(onTurn);
  callback.current = onTurn;
  const pointer = useRef<{
    id: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    active: boolean;
    target: HTMLElement;
  } | null>(null);
  const pending = useRef({ x: 0, y: 0 });
  const frame = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [used, setUsed] = useState(false);
  const flush = useCallback(() => {
    frame.current = 0;
    const { x, y } = pending.current;
    pending.current = { x: 0, y: 0 };
    if (x || y) callback.current(x, y);
  }, []);
  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    pending.current = { x: 0, y: 0 };
    const p = pointer.current;
    pointer.current = null;
    if (p?.target.hasPointerCapture(p.id)) p.target.releasePointerCapture(p.id);
    setDragging(false);
  }, []);
  useEffect(() => {
    if (!enabled) stop();
  }, [enabled, stop]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", hidden);
      cancelAnimationFrame(frame.current);
      const p = pointer.current;
      pointer.current = null;
      if (p?.target.hasPointerCapture(p.id))
        p.target.releasePointerCapture(p.id);
    };
  }, [stop]);
  return {
    dragging,
    used,
    handlers: {
      onPointerDown(e: ReactPointerEvent<HTMLElement>) {
        if (!enabled || !e.isPrimary || e.button !== 0 || pointer.current)
          return;
        const target = e.target as HTMLElement;
        if (
          target.closest(
            "button,a,input,textarea,select,[contenteditable=true],.screen-surface,[role=dialog]",
          )
        )
          return;
        e.currentTarget.focus({ preventScroll: true });
        e.currentTarget.setPointerCapture(e.pointerId);
        pointer.current = {
          id: e.pointerId,
          x: e.clientX,
          y: e.clientY,
          startX: e.clientX,
          startY: e.clientY,
          active: false,
          target: e.currentTarget,
        };
      },
      onPointerMove(e: ReactPointerEvent<HTMLElement>) {
        const p = pointer.current;
        if (!p || p.id !== e.pointerId) return;
        if (!p.active) {
          // Ignore hand jitter while clicking/focusing the theater.
          if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < 4)
            return;
          p.active = true;
          setDragging(true);
          setUsed(true);
        }
        pending.current.x += (e.clientX - p.x) * 0.18;
        pending.current.y += (p.y - e.clientY) * 0.18;
        p.x = e.clientX;
        p.y = e.clientY;
        if (!frame.current) frame.current = requestAnimationFrame(flush);
      },
      onPointerUp(e: ReactPointerEvent<HTMLElement>) {
        if (pointer.current?.id !== e.pointerId) return;
        cancelAnimationFrame(frame.current);
        flush();
        stop();
      },
      onPointerCancel(e: ReactPointerEvent<HTMLElement>) {
        if (pointer.current?.id === e.pointerId) stop();
      },
      onLostPointerCapture(e: ReactPointerEvent<HTMLElement>) {
        if (pointer.current?.id === e.pointerId) stop();
      },
    },
  };
}
