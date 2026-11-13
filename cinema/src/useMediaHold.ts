import { useLayoutEffect, useRef, type RefObject } from "react";
/** Mute only this media element; preserve its prior mute state and user volume. */
export function useMediaHold(
  ref: RefObject<HTMLVideoElement | null>,
  held: boolean,
  source: string | null | undefined,
) {
  const latestHeld = useRef(held);
  latestHeld.current = held;
  useLayoutEffect(() => {
    const video = ref.current;
    if (!held || !video) return;
    const previous = video.muted;
    const enforce = () => {
      if (!video.muted) video.muted = true;
    };
    video.addEventListener("volumechange", enforce);
    enforce();
    return () => {
      video.removeEventListener("volumechange", enforce);
      // Retired elements must remain silent until their player cleanup pauses them.
      if (!latestHeld.current) video.muted = previous;
    };
  }, [held, source, ref]);
}
