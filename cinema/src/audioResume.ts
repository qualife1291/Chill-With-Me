type ResumableAudio = Pick<AudioContext, "state" | "resume">;
/** A blocked/device-less browser may leave resume() pending indefinitely. */
export function resumeAudio(
  context: ResumableAudio,
  signal: AbortSignal,
  timeoutMs = 1600,
): Promise<void> {
  if (signal.aborted) return Promise.reject(Error("AUDIO_CANCELLED"));
  if (context.state === "running") return Promise.resolve();
  return new Promise((resolve, reject) => {
    let finished = false;
    const done = (error?: unknown) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      if (error) reject(error);
      else resolve();
    };
    const cancel = () => done(Error("AUDIO_CANCELLED"));
    const timer = setTimeout(() => done(Error("AUDIO_BLOCKED")), timeoutMs);
    signal.addEventListener("abort", cancel, { once: true });
    try {
      void context
        .resume()
        .then(
          () =>
            context.state === "running" ? done() : done(Error("AUDIO_BLOCKED")),
          done,
        );
    } catch (error) {
      done(error);
    }
  });
}
