import { useCallback, useEffect, useRef, useState } from "react";
import { ambientGain, noiseTexture, type Ambience } from "../shared/ambience";
import { boundedVolume } from "../shared/audioMix";
type Engine = {
  context: AudioContext;
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
};
function dispose(engine: Engine | null) {
  if (!engine) return;
  try {
    engine.source.stop();
  } catch {
    /* A partially initialized source may not have started. */
  }
  engine.source.disconnect();
  engine.filter.disconnect();
  engine.gain.disconnect();
  void engine.context.close().catch(() => {});
}
export function useAmbience(session: string, speaking: boolean, sideGain = 1) {
  const engine = useRef<Engine | null>(null);
  const [mode, setMode] = useState<Ambience>("off");
  const [volume, updateVolume] = useState(15);
  const setVolume = (value: number) => updateVolume(boundedVolume(value));
  const [warning, setWarning] = useState("");
  const stop = useCallback(() => {
    const old = engine.current;
    engine.current = null;
    dispose(old);
    setMode("off");
  }, []);
  useEffect(() => {
    stop();
    const hidden = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      const old = engine.current;
      engine.current = null;
      dispose(old);
    };
  }, [session, stop]);
  useEffect(() => {
    const current = engine.current;
    if (current)
      current.gain.gain.setTargetAtTime(
        ambientGain(volume, speaking) * sideGain,
        current.context.currentTime,
        0.04,
      );
  }, [volume, speaking, mode, sideGain]);
  const change = (next: Ambience) => {
    stop();
    setWarning("");
    if (next === "off" || !session || document.hidden) return;
    if (!("AudioContext" in window)) {
      setWarning(
        "Trình duyệt chưa hỗ trợ âm nền. Nội dung chiếu vẫn phát bình thường.",
      );
      return;
    }
    try {
      const context = new AudioContext(),
        source = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        gain = context.createGain();
      const current = { context, source, filter, gain };
      engine.current = current;
      const buffer = context.createBuffer(1, 96000, 24000);
      buffer.copyToChannel(noiseTexture(next, buffer.length), 0);
      source.buffer = buffer;
      source.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = next === "rain" ? 1600 : 500;
      filter.Q.value = 0.5;
      gain.gain.value = 0;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start();
      void context
        .resume()
        .then(() => {
          if (engine.current !== current) return;
          if (context.state === "running") {
            gain.gain.setTargetAtTime(
              ambientGain(volume, speaking) * sideGain,
              context.currentTime,
              0.04,
            );
            setMode(next);
          } else {
            stop();
            setWarning("Hãy bấm chọn âm nền lần nữa để bật âm thanh.");
          }
        })
        .catch(() => {
          if (engine.current === current) {
            stop();
            setWarning("Chưa bật được âm nền trên thiết bị này.");
          }
        });
    } catch {
      stop();
      setWarning("Chưa bật được âm nền trên thiết bị này.");
    }
  };
  return { mode, change, volume, setVolume, warning };
}
