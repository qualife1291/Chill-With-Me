import { useCallback, useEffect, useRef, useState } from "react";
import type { Game } from "../shared/games";
import { callVariant, lotoCall } from "../shared/lotoCalls";
import { speechBus } from "./speechBus";
export const CALLER_MODES = ["off", "number", "festive"] as const;
export type CallerMode = (typeof CALLER_MODES)[number];
export function useLotoCaller({
  game,
  session,
  mode,
  enabled,
  volume,
  voiceURI,
  rate,
  serverNow,
  onMusic,
  stopMusic,
}: {
  game?: Game;
  session: string;
  mode: CallerMode;
  enabled: boolean;
  volume: number;
  voiceURI: string;
  rate: number;
  serverNow: () => number;
  onMusic: (variant: number) => void;
  stopMusic: () => void;
}) {
  const [speaking, setSpeaking] = useState(false),
    [warning, setWarning] = useState("");
  const generation = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stop = useCallback(() => {
    generation.current++;
    clearTimeout(timer.current);
    if ("speechSynthesis" in window) speechBus.cancel("loto");
    stopMusic();
    setSpeaking(false);
  }, [stopMusic]);
  const settings = useRef({ mode, enabled, volume, voiceURI, rate, onMusic });
  settings.current = { mode, enabled, volume, voiceURI, rate, onMusic };
  const say = useCallback(
    (number: number, variant: number) => {
      const p = settings.current;
      if (!p.enabled || p.mode === "off" || document.hidden) {
        stop();
        return;
      }
      if (
        !("speechSynthesis" in window) ||
        !("SpeechSynthesisUtterance" in window)
      ) {
        stop();
        setWarning(
          "Trình duyệt chưa có giọng đọc; số và lời hô vẫn hiện trên màn hình.",
        );
        return;
      }
      const voices = speechSynthesis
          .getVoices()
          .filter((v) => /^vi(?:-|_)?/i.test(v.lang)),
        voice =
          voices.find((v) => v.voiceURI === p.voiceURI) ||
          voices.find((v) => v.default) ||
          voices[0];
      if (!voice) {
        stop();
        setWarning(
          "Chưa có giọng tiếng Việt. Cài giọng trong thiết bị hoặc chọn giọng ở phần Chat, rồi thử lại.",
        );
        return;
      }
      // Replace in the broker atomically; stop() here would briefly start and discard deferred chat.
      generation.current++;
      clearTimeout(timer.current);
      stopMusic();
      setSpeaking(false);
      const call = lotoCall(number, variant),
        u = new SpeechSynthesisUtterance(
          p.mode === "number" ? `Số ${call.number}.` : call.text,
        ),
        serial = ++generation.current;
      u.lang = "vi-VN";
      u.voice = voice;
      u.rate = p.rate;
      u.pitch = 1;
      u.volume = p.volume;
      const done = () => {
        if (serial !== generation.current) return;
        clearTimeout(timer.current);
        setSpeaking(false);
      };
      u.onstart = () => {
        if (serial === generation.current) {
          setSpeaking(true);
          setWarning("");
        }
      };
      u.onend = done;
      u.onerror = () => {
        if (serial === generation.current)
          setWarning(
            "Giọng hô chưa phát được. Hãy thử lại hoặc đổi giọng tiếng Việt.",
          );
        done();
      };
      timer.current = setTimeout(() => {
        if (serial === generation.current) stop();
      }, 8000);
      try {
        speechSynthesis.resume();
        speechBus.speak("loto", u);
        if (p.mode === "festive") p.onMusic(variant);
      } catch {
        setWarning("Chưa phát được giọng hô trên trình duyệt này.");
        stop();
      }
    },
    [stop, stopMusic],
  );
  const currentKey = `${session}:${game?.id || ""}:${game?.drawn?.length || 0}`;
  const seen = useRef(currentKey);
  useEffect(() => {
    if (seen.current === currentKey) return;
    const previous = seen.current;
    seen.current = currentKey;
    const number = game?.drawn?.at(-1),
      age =
        game?.lastDrawAt === undefined
          ? Infinity
          : serverNow() - game.lastDrawAt;
    // Joining a different round/session never replays its latest snapshot.
    const sameRound = previous.startsWith(`${session}:${game?.id || ""}:`);
    if (
      sameRound &&
      game?.kind === "loto" &&
      game.phase === "playing" &&
      number &&
      age >= 0 &&
      age < 4500
    )
      say(number, callVariant(game.id, game.drawn!.length));
    else stop();
  }, [currentKey, game, say, stop, serverNow]);
  useEffect(() => {
    if (!enabled || mode === "off" || game?.phase !== "playing") stop();
  }, [enabled, mode, game?.phase, stop]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      stop();
    };
  }, [session, stop]);
  const baseline = useCallback(
    (snapshot: Game | undefined, roomSession: string) => {
      seen.current = `${roomSession}:${snapshot?.id || ""}:${snapshot?.drawn?.length || 0}`;
      stop();
    },
    [stop],
  );
  return {
    speaking,
    warning,
    stop,
    baseline,
    preview: () =>
      say(
        game?.drawn?.at(-1) || 7,
        callVariant(game?.id || "preview", game?.drawn?.length || 0),
      ),
  };
}
