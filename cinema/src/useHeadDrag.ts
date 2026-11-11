import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
type Point = { x: number; y: number; target: HTMLElement };
export function useHeadDrag(
  onTurn: (yaw: number, pitch: number) => void,
  enabled: boolean,
  onZoom?: (delta: number) => void,
) {
  const callback = useRef(onTurn),
    zoom = useRef(onZoom);
  callback.current = onTurn;
  zoom.current = onZoom;
  const points = useRef(new Map<number, Point>()),
    pending = useRef({ x: 0, y: 0, z: 0 }),
    frame = useRef(0),
    distance = useRef(0),
    travel = useRef(0);
  const [dragging, setDragging] = useState(false),
    [used, setUsed] = useState(false);
  const flush = useCallback(() => {
    frame.current = 0;
    const p = pending.current;
    pending.current = { x: 0, y: 0, z: 0 };
    if (p.x || p.y) callback.current(p.x, p.y);
    if (p.z) zoom.current?.(p.z);
  }, []);
  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    pending.current = { x: 0, y: 0, z: 0 };
    const old = [...points.current];
    points.current.clear();
    for (const [id, p] of old)
      if (p.target.hasPointerCapture(id)) p.target.releasePointerCapture(id);
    distance.current = 0;
    travel.current = 0;
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
      stop();
    };
  }, [stop]);
  const span = () => {
    const p = [...points.current.values()];
    return p.length === 2 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
  };
  const end = (e: ReactPointerEvent<HTMLElement>) => {
    if (!points.current.has(e.pointerId)) return;
    cancelAnimationFrame(frame.current);
    flush();
    points.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    distance.current = 0;
    travel.current = 0;
    if (!points.current.size) setDragging(false);
  };
  return {
    dragging,
    used,
    handlers: {
      onPointerDown(e: ReactPointerEvent<HTMLElement>) {
        if (
          !enabled ||
          e.button !== 0 ||
          (e.pointerType !== "touch" && !e.isPrimary) ||
          points.current.size >= 2
        )
          return;
        if (
          (e.target as HTMLElement).closest(
            "button,a,input,textarea,select,summary,.scene-controls,.sidebar,.quick-actions,.touch-navigation,[contenteditable=true],.screen-surface,[role=dialog]",
          )
        )
          return;
        e.currentTarget.focus({ preventScroll: true });
        e.currentTarget.setPointerCapture(e.pointerId);
        points.current.set(e.pointerId, {
          x: e.clientX,
          y: e.clientY,
          target: e.currentTarget,
        });
        distance.current = span();
        travel.current = 0;
      },
      onPointerMove(e: ReactPointerEvent<HTMLElement>) {
        const p = points.current.get(e.pointerId);
        if (!p) return;
        const dx = e.clientX - p.x,
          dy = p.y - e.clientY;
        p.x = e.clientX;
        p.y = e.clientY;
        if (points.current.size === 2) {
          const next = span();
          if (distance.current > 0 && next > 0)
            pending.current.z -= Math.log(next / distance.current) * 24;
          distance.current = next;
        } else {
          travel.current += Math.hypot(dx, dy);
          if (travel.current < 4) return;
          pending.current.x += dx * (e.pointerType === "touch" ? 0.3 : 0.18);
          pending.current.y += dy * (e.pointerType === "touch" ? 0.25 : 0.18);
        }
        setDragging(true);
        setUsed(true);
        if (!frame.current) frame.current = requestAnimationFrame(flush);
      },
      onPointerUp: end,
      onPointerCancel: () => stop(),
      onLostPointerCapture: end,
    },
  };
}
