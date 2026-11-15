import { useCallback, useEffect, useRef, useState } from "react";
import { resumeAudio } from "./audioResume";
import {
  gameMusicGain,
  gameMusicSamples,
  MUSIC_MODES,
  MUSIC_RATE,
  type GameMusicMode,
} from "../shared/gameAudio";
export type AudioBus = { context: AudioContext; output: GainNode };
export function useGameMusic(
  session: string,
  active: boolean,
  enabled: boolean,
  speaking: boolean,
  audio: () => AudioBus | undefined,
) {
  // Key selection to the game immediately; an old track must not start between effects on a new session.
  const [selection, setSelection] = useState({
      session,
      mode: "off" as GameMusicMode,
      volume: 18,
    }),
    [attempt, setAttempt] = useState(0),
    [playing, setPlaying] = useState(false),
    [warning, setWarning] = useState(""),
    [visible, setVisible] = useState(!document.hidden);
  const mode = selection.session === session ? selection.mode : "off",
    volume = selection.session === session ? selection.volume : 18;
  const pending = useRef<AbortController | undefined>(undefined);
  const serial = useRef(0),
    nodes = useRef<
      | {
          source: AudioBufferSourceNode;
          gain: GainNode;
          filter: BiquadFilterNode;
          context: AudioContext;
        }
      | undefined
    >(undefined),
    buffer = useRef<{ mode: GameMusicMode; data: AudioBuffer } | undefined>(
      undefined,
    );
  const desired = useRef({ volume, speaking });
  desired.current = { volume, speaking };
  const stop = useCallback(() => {
    serial.current++;
    pending.current?.abort();
    pending.current = undefined;
    const old = nodes.current;
    nodes.current = undefined;
    if (old) {
      try {
        old.source.stop();
      } catch {}
      old.source.disconnect();
      old.gain.disconnect();
      old.filter.disconnect();
    }
    setPlaying(false);
  }, []);
  useEffect(() => {
    setWarning("");
  }, [session]);
  useEffect(() => {
    const update = () => {
      if (document.hidden) {
        stop();
        buffer.current = undefined;
      }
      setVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      stop();
      buffer.current = undefined;
    };
  }, [stop]);
  useEffect(() => {
    stop();
    if (!session || !active || !enabled || !visible || mode === "off") {
      buffer.current = undefined;
      return;
    }
    setWarning("");
    const bus = audio(),
      token = serial.current;
    if (!bus) {
      setWarning("Bấm bật âm tương tác, rồi chọn lại nhạc để cho phép phát.");
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    void (async () => {
      try {
        await resumeAudio(bus.context, controller.signal);
        if (
          token !== serial.current ||
          document.hidden ||
          bus.context.state !== "running"
        )
          return;
        if (buffer.current?.mode !== mode) {
          const data = gameMusicSamples(mode),
            b = bus.context.createBuffer(1, data.length, MUSIC_RATE);
          b.copyToChannel(data, 0);
          buffer.current = { mode, data: b };
        }
        const source = bus.context.createBufferSource(),
          gain = bus.context.createGain(),
          filter = bus.context.createBiquadFilter();
        source.buffer = buffer.current!.data;
        source.loop = true;
        filter.type = "lowpass";
        filter.frequency.value = 4800;
        gain.gain.value = gameMusicGain(
          desired.current.volume,
          desired.current.speaking,
        );
        source.connect(filter);
        filter.connect(gain);
        gain.connect(bus.output);
        nodes.current = { source, gain, filter, context: bus.context };
        source.start();
        setPlaying(true);
        setWarning("");
      } catch {
        if (token === serial.current) {
          stop();
          setWarning(
            "Thiết bị chưa bật được âm thanh. Bấm thử lại hoặc kiểm tra đầu ra âm thanh của máy.",
          );
        }
      }
    })();
    return stop;
  }, [session, active, enabled, visible, mode, audio, stop, attempt]);
  useEffect(() => {
    const n = nodes.current;
    if (n && n.context.state !== "closed")
      n.gain.gain.setTargetAtTime(
        gameMusicGain(volume, speaking),
        n.context.currentTime,
        0.08,
      );
  }, [volume, speaking]);
  const change = (value: GameMusicMode) => {
    setWarning("");
    if (MUSIC_MODES.includes(value))
      setSelection((old) => ({
        session,
        mode: value,
        volume: old.session === session ? old.volume : 18,
      }));
  };
  return {
    mode,
    change,
    retry: () => {
      // Resume directly inside the user's click, then restart the bounded attempt.
      try {
        void audio()
          ?.context.resume()
          .catch(() => {});
      } catch {}
      setAttempt((n) => n + 1);
    },
    volume,
    setVolume: (n: number) => {
      if (Number.isFinite(n))
        setSelection((old) => ({
          session,
          mode: old.session === session ? old.mode : "off",
          volume: Math.max(0, Math.min(50, n)),
        }));
    },
    playing,
    warning,
    stop,
  };
}
