import { useCallback, useEffect, useRef } from "react";
import type { Game } from "../shared/games";
import { gameCue, type GameCue } from "../shared/gameAudio";
export function useGameFeedback(
  game: Game | undefined,
  enabled: boolean,
  play: (cue: GameCue) => void,
) {
  const seen = useRef(game),
    quietUntil = useRef(0);
  useEffect(() => {
    const cue = gameCue(seen.current, game);
    seen.current = game;
    if (
      cue &&
      enabled &&
      !document.hidden &&
      performance.now() >= quietUntil.current
    )
      play(cue);
  }, [game, enabled, play]);
  useEffect(() => {
    const visible = () => {
      quietUntil.current = performance.now() + 600;
    };
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, []);
  return useCallback((snapshot?: Game) => {
    seen.current = snapshot;
  }, []);
}
