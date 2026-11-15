/** Original, finite pentatonic cue; shares the existing interaction audio context. */
export function playLotoMusic(
  ctx: AudioContext,
  bus: AudioNode,
  variant: number,
) {
  const patterns = [
      [0, 2, 4, 7, 9, 12],
      [7, 4, 2, 4, 7, 12],
      [0, 7, 9, 7, 4, 2],
    ],
    nodes: { osc: OscillatorNode; gain: GainNode }[] = [];
  for (const [i, note] of patterns[variant % 3].entries()) {
    const osc = ctx.createOscillator(),
      gain = ctx.createGain(),
      at = ctx.currentTime + i * 0.14;
    osc.type = "triangle";
    osc.frequency.value = 261.63 * 2 ** (note / 12);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.25, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.23);
    osc.connect(gain);
    gain.connect(bus);
    nodes.push({ osc, gain });
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(at);
    osc.stop(at + 0.25);
  }
  return () => {
    for (const { osc, gain } of nodes) {
      try {
        osc.stop();
      } catch {
        /* Already ended. */
      }
      osc.disconnect();
      gain.disconnect();
    }
  };
}
