import { useEffect, useState, type RefObject } from "react";
export const COMPACT_QUERY = "(max-width: 900px), (max-height: 500px)";
/** Keyboard geometry affects sheets only, never the WebGL viewport or camera. */
export function useRoomViewport(root: RefObject<HTMLElement | null>) {
  const [compact, setCompact] = useState(
    () => matchMedia(COMPACT_QUERY).matches,
  );
  useEffect(() => {
    const media = matchMedia(COMPACT_QUERY),
      viewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      frame = 0;
      const node = root.current;
      if (!node) return;
      const height = viewport?.height ?? innerHeight;
      const editing = document.activeElement?.matches(
        "input,textarea,[contenteditable=true]",
      );
      const keyboard = editing
        ? Math.max(0, innerHeight - height - (viewport?.offsetTop || 0))
        : 0;
      node.style.setProperty("--panel-viewport", `${height}px`);
      node.style.setProperty(
        "--keyboard-inset",
        `${keyboard > 100 ? keyboard : 0}px`,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const changed = () => {
      setCompact(media.matches);
      schedule();
    };
    media.addEventListener("change", changed);
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    update();
    return () => {
      cancelAnimationFrame(frame);
      media.removeEventListener("change", changed);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
    };
  }, [root]);
  return compact;
}
