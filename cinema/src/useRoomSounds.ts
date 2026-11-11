import { useCallback, useEffect, useRef, useState } from "react";
import { playFireworkSound } from "./fireworkSound";
import type { ReactionKind } from "../shared/model";
export type RoomSound = ReactionKind | "poke";
/** Short, locally synthesized cues. Never queue audio behind an autoplay block. */
export function useRoomSounds(session = "") {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem("cinema-room-sounds") !== "off";
    } catch {
      return true;
    }
  });
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const fireworkStop = useRef<(() => void) | null>(null);
  const scheduledCues = useRef(new Set<AudioScheduledSourceNode>());
  const stopCues = useCallback(() => {
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
    if (!enabledRef.current || !("AudioContext" in window)) return;
    try {
      const ctx = (context.current ||= new AudioContext());
      if (!output.current) {
        output.current = ctx.createGain();
        output.current.connect(ctx.destination);
      }
      output.current.gain.value = 0.14;
      if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    } catch {
      /* Visual feedback remains available on unsupported devices. */
    }
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!e.repeat) unlock();
    };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", key, true);
      stopCues();
      const ctx = context.current;
      context.current = null;
      output.current = null;
      if (ctx && ctx.state !== "closed") void ctx.close().catch(() => {});
    };
  }, [unlock, stopCues]);
  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    setEnabled(next);
    try {
      localStorage.setItem("cinema-room-sounds", next ? "on" : "off");
    } catch {}
    if (next) unlock();
    else {
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
      if (kind === "flowers") {
        stopCues();
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
        gain.gain.exponentialRampToValueAtTime(0.5, at + 0.012);
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
      if (kind === "applause") {
        // Filtered noise bursts resemble a small round of applause, without a media download.
        const buffer = ctx.createBuffer(
          1,
          Math.ceil(ctx.sampleRate * 0.11),
          ctx.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++)
          data[i] =
            (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.022));
        for (let i = 0; i < 9; i++) {
          const source = ctx.createBufferSource(),
            filter = ctx.createBiquadFilter(),
            gain = ctx.createGain();
          filter.type = "highpass";
          filter.frequency.value = 750;
          gain.gain.value = 0.7;
          source.buffer = buffer;
          source.connect(filter);
          filter.connect(gain);
          gain.connect(bus);
          scheduledCues.current.add(source);
          source.onended = () => {
            scheduledCues.current.delete(source);
            source.disconnect();
            filter.disconnect();
            gain.disconnect();
          };
          source.start(ctx.currentTime + i * 0.09);
        }
      } else if (kind === "sad") {
        tone(430, 0, 0.32, 280);
        tone(330, 0.3, 0.4, 185);
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
  return { enabled, toggle, play };
}
