import { FIREWORKS, FIREWORK_FUSE_MS } from "../shared/fireworks";

/** Short festive launch/boom/crackle layers; cancellation stops future cues too. */
export function playFireworkSound(
  ctx: BaseAudioContext,
  output: AudioNode,
  ageMs = 0,
) {
  const age = Number.isFinite(ageMs) ? Math.max(0, ageMs) : 3000;
  if (age >= 2200) return () => {};
  const master = ctx.createGain(),
    limiter = ctx.createDynamicsCompressor();
  master.gain.value = 0.8;
  limiter.threshold.value = -8;
  limiter.knee.value = 12;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.004;
  limiter.release.value = 0.12;
  master.connect(limiter);
  limiter.connect(output);
  const active = new Set<AudioScheduledSourceNode>();
  let finished = false;
  const stop = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    for (const node of active) {
      try {
        node.stop();
      } catch {}
      node.disconnect();
    }
    active.clear();
    master.disconnect();
    limiter.disconnect();
  };
  const timer = setTimeout(stop, Math.max(0, 2800 - age));
  const noise = ctx.createBuffer(
    1,
    Math.ceil(ctx.sampleRate * 0.24),
    ctx.sampleRate,
  );
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  const own = (node: AudioScheduledSourceNode, nodes: AudioNode[]) => {
    active.add(node);
    node.onended = () => {
      active.delete(node);
      node.disconnect();
      nodes.forEach((n) => n.disconnect());
    };
  };
  const startAt = (ms: number) =>
    ms + 50 < age ? null : ctx.currentTime + Math.max(0, ms - age) / 1000;
  const hiss = (
    ms: number,
    length: number,
    level: number,
    crackle: boolean,
  ) => {
    const at = startAt(ms);
    if (at === null) return;
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    source.buffer = noise;
    filter.type = crackle ? "highpass" : "bandpass";
    filter.frequency.setValueAtTime(crackle ? 2200 : 600, at);
    if (!crackle)
      filter.frequency.exponentialRampToValueAtTime(2200, at + length);
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.001, at);
    gain.gain.exponentialRampToValueAtTime(
      level,
      at + Math.min(0.015, length / 3),
    );
    gain.gain.exponentialRampToValueAtTime(0.001, at + length);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    own(source, [filter, gain]);
    source.start(at);
    source.stop(at + length + 0.01);
  };
  const tone = (
    ms: number,
    hz: number,
    end: number,
    length: number,
    level: number,
  ) => {
    const at = startAt(ms);
    if (at === null) return;
    const source = ctx.createOscillator(),
      gain = ctx.createGain();
    source.frequency.setValueAtTime(hz, at);
    source.frequency.exponentialRampToValueAtTime(end, at + length);
    gain.gain.setValueAtTime(0.001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, at + length);
    source.connect(gain);
    gain.connect(master);
    own(source, [gain]);
    source.start(at);
    source.stop(at + length + 0.01);
  };
  for (const [i, burst] of FIREWORKS.entries()) {
    const pop = burst.launch + FIREWORK_FUSE_MS;
    hiss(burst.launch, 0.23, 0.22, false);
    tone(pop, 78 + i * 9, 35, 0.42, 0.65);
    tone(pop + 20, 1047 + i * 200, 740, 0.18, 0.22);
    for (let j = 0; j < 6; j++) hiss(pop + 45 + j * 40, 0.065, 0.12, true);
  }
  return stop;
}
