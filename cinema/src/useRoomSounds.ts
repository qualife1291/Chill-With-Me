import { useCallback, useEffect, useRef, useState } from "react";
import { playFireworkSound } from "./fireworkSound";
import type { ReactionKind } from "../shared/model";
import type { ReactionVariant } from "../shared/reactions";
export type RoomSound = ReactionKind | ReactionVariant | "poke";
/** Short, locally synthesized cues. Never queue audio behind an autoplay block. */
export function useRoomSounds(session = "", sideGain = 1) {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem("cinema-room-sounds") !== "off";
    } catch {
      return true;
    }
  });
  const [active, setActive] = useState(false);
  const [warning, setWarning] = useState("");
  const activeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const activeUntil = useRef(0);
  const sideRef = useRef(sideGain);
  sideRef.current = sideGain;
  const limiter = useRef<DynamicsCompressorNode | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const fireworkStop = useRef<(() => void) | null>(null);
  const scheduledCues = useRef(new Set<AudioScheduledSourceNode>());
  const stopCues = useCallback(() => {
    clearTimeout(activeTimer.current);
    activeUntil.current = 0;
    setActive(false);
    fireworkStop.current?.();
    fireworkStop.current = null;
    for (const node of scheduledCues.current) {
      try {
        node.stop();
      } catch {}
      node.disconnect();
    }
    scheduledCues.current.clear();
  }, []);
  useEffect(() => {
    stopCues();
    return stopCues;
  }, [session, stopCues]);
  const context = useRef<AudioContext | null>(null);
  const output = useRef<GainNode | null>(null);
  const unlock = useCallback(() => {
    if (!enabledRef.current) return;
    if (!("AudioContext" in window)) {
      setWarning(
        "Thiết bị chưa hỗ trợ âm tương tác; hiệu ứng hình ảnh vẫn hoạt động.",
      );
      return;
    }
    try {
      const ctx = (context.current ||= new AudioContext());
      if (!output.current) {
        output.current = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -10;
        compressor.knee.value = 18;
        compressor.ratio.value = 5;
        compressor.attack.value = 0.004;
        compressor.release.value = 0.14;
        limiter.current = compressor;
        output.current.gain.value = 0.14 * sideRef.current;
        output.current.connect(compressor);
        compressor.connect(ctx.destination);
      }
      if (ctx.state === "suspended")
        void ctx
          .resume()
          .then(() => {
            setWarning(
              ctx.state === "running"
                ? ""
                : "Hãy bấm bật âm tương tác để cho phép phát tiếng.",
            );
          })
          .catch(() =>
            setWarning(
              "Chưa bật được âm tương tác. Hãy thử lại từ menu cảm xúc.",
            ),
          );
      else setWarning("");
    } catch {
      setWarning(
        "Chưa khởi tạo được âm tương tác. Bạn vẫn có thể dùng hiệu ứng hình ảnh.",
      );
    }
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!e.repeat) unlock();
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("pointerup", unlock, true);
    document.addEventListener("click", unlock, true);
    document.addEventListener("touchend", unlock, {
      capture: true,
      passive: true,
    });
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("pointerup", unlock, true);
      document.removeEventListener("click", unlock, true);
      document.removeEventListener("touchend", unlock, true);
      document.removeEventListener("keydown", key, true);
      stopCues();
      const ctx = context.current;
      context.current = null;
      output.current?.disconnect();
      limiter.current?.disconnect();
      limiter.current = null;
      output.current = null;
      if (ctx && ctx.state !== "closed") void ctx.close().catch(() => {});
    };
  }, [unlock, stopCues]);
  useEffect(() => {
    if (output.current && context.current)
      output.current.gain.setTargetAtTime(
        enabled ? 0.14 * sideGain : 0,
        context.current.currentTime,
        0.04,
      );
  }, [sideGain, enabled]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stopCues();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, [stopCues]);
  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    try {
      localStorage.setItem("cinema-room-sounds", next ? "on" : "off");
    } catch {}
    if (next) {
      unlock();
      if (output.current && context.current)
        output.current.gain.setTargetAtTime(
          0.14 * sideRef.current,
          context.current.currentTime,
          0.04,
        );
    } else {
      stopCues();
      if (output.current) output.current.gain.value = 0;
    }
  }, [unlock, stopCues]);
  const play = useCallback(
    (kind: RoomSound, ageMs = 0) => {
      const ctx = context.current,
        bus = output.current;
      if (!enabledRef.current || !ctx || !bus || ctx.state !== "running")
        return;
      if (
        document.hidden ||
        !Number.isFinite(ageMs) ||
        ageMs < 0 ||
        ageMs >= 3000
      )
        return;
      if ((kind === "flowers" || kind === "celebrate") && ageMs >= 2200) return;
      if (kind === "flowers" || kind === "celebrate") stopCues();
      const length =
        kind === "flowers" || kind === "celebrate"
          ? 2800 - ageMs
          : kind === "love" || kind === "wow"
            ? 750
            : kind === "thanks" || kind === "laugh"
              ? 900
              : kind === "troll"
                ? 1050
                : kind === "applause"
                  ? 1000
                  : kind === "sad"
                    ? 750
                    : 350;
      activeUntil.current = Math.max(activeUntil.current, Date.now() + length);
      clearTimeout(activeTimer.current);
      setActive(true);
      activeTimer.current = setTimeout(
        () => setActive(false),
        Math.max(0, activeUntil.current - Date.now()),
      );
      if (kind === "flowers" || kind === "celebrate") {
        fireworkStop.current = playFireworkSound(ctx, bus, ageMs);
        return;
      }
      const tone = (
        hz: number,
        start: number,
        length: number,
        end = hz,
        type: OscillatorType = "sine",
      ) => {
        const osc = ctx.createOscillator(),
          gain = ctx.createGain(),
          at = ctx.currentTime + start;
        osc.type = type;
        osc.frequency.setValueAtTime(hz, at);
        osc.frequency.exponentialRampToValueAtTime(end, at + length);
        gain.gain.setValueAtTime(0.001, at);
        gain.gain.exponentialRampToValueAtTime(0.38, at + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.001, at + length);
        osc.connect(gain);
        gain.connect(bus);
        scheduledCues.current.add(osc);
        osc.onended = () => {
          scheduledCues.current.delete(osc);
          osc.disconnect();
          gain.disconnect();
        };
        osc.start(at);
        osc.stop(at + length + 0.02);
      };
      if (kind === "love" || kind === "thanks" || kind === "wow") {
        const notes =
          kind === "love"
            ? [523.25, 659.25, 783.99]
            : kind === "thanks"
              ? [392, 523.25, 659.25, 783.99]
              : [330, 494, 740];
        notes.forEach((n, i) =>
          tone(n, i * 0.12, 0.28, kind === "wow" ? n * 1.2 : n),
        );
      } else if (kind === "laugh") {
        for (let i = 0; i < 4; i++)
          tone(i % 2 ? 480 : 390, i * 0.15, 0.12, 250, "triangle");
      } else if (kind === "applause") {
        // Filtered noise bursts resemble a small round of applause, without a media download.
        const buffer = ctx.createBuffer(
          2,
          Math.ceil(ctx.sampleRate * 0.11),
          ctx.sampleRate,
        );
        for (let channel = 0; channel < 2; channel++) {
          const data = buffer.getChannelData(channel);
          let last = 0;
          for (let i = 0; i < data.length; i++) {
            const white = Math.random() * 2 - 1;
            last = last * 0.3 + white * 0.7;
            data[i] = last * Math.exp(-i / (ctx.sampleRate * 0.026));
          }
        }
        for (let i = 0; i < 9; i++) {
          const source = ctx.createBufferSource(),
            filter = ctx.createBiquadFilter(),
            gain = ctx.createGain(),
            panner = ctx.createStereoPanner();
          panner.pan.value = ((i % 3) - 1) * 0.55;
          filter.type = "highpass";
          filter.frequency.value = 750;
          gain.gain.value = 0.6 + (i % 3) * 0.08;
          source.buffer = buffer;
          source.connect(filter);
          filter.connect(gain);
          gain.connect(panner);
          panner.connect(bus);
          scheduledCues.current.add(source);
          source.onended = () => {
            scheduledCues.current.delete(source);
            source.disconnect();
            filter.disconnect();
            gain.disconnect();
            panner.disconnect();
          };
          source.start(ctx.currentTime + i * 0.09);
        }
      } else if (kind === "sad") {
        tone(430, 0, 0.32, 280, "triangle");
        tone(330, 0.3, 0.4, 185, "triangle");
      } else if (kind === "troll") {
        for (let i = 0; i < 3; i++) {
          tone(220 + i * 25, i * 0.14, 0.065, 340, "triangle");
          tone(340, i * 0.14 + 0.065, 0.065, 180, "triangle");
        }
        tone(170, 0.45, 0.22, 620, "triangle");
        tone(620, 0.67, 0.35, 110, "triangle");
      } else {
        tone(740, 0, 0.12);
        tone(980, 0.13, 0.18);
      }
    },
    [stopCues],
  );
  return { enabled, toggle, play, active, warning };
}
