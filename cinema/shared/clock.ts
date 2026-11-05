export type ClockSample = {
  sent: number;
  received: number;
  serverTime: number;
  rtt: number;
};
/** Midpoint clock estimates use monotonic time; low RTT reduces queueing bias. */
export class RoomClock {
  private samples: ClockSample[] = [];
  private baseline?: { at: number; serverTime: number };
  reset() {
    this.samples = [];
    this.baseline = undefined;
  }
  seed(serverTime: number, mono: number) {
    if (!this.baseline && Number.isFinite(serverTime) && Number.isFinite(mono))
      this.baseline = { at: mono, serverTime };
  }
  record(sent: number, received: number, serverTime: number) {
    const rtt = received - sent;
    if (
      ![sent, received, serverTime].every(Number.isFinite) ||
      rtt < 0 ||
      rtt > 10000
    )
      return false;
    this.samples = this.samples
      .filter((s) => received - s.received <= 60000)
      .slice(-7);
    this.samples.push({ sent, received, serverTime, rtt });
    const best = this.best(received)!;
    this.baseline = {
      at: (best.sent + best.received) / 2,
      serverTime: best.serverTime,
    };
    return true;
  }
  best(mono: number) {
    return this.samples
      .filter((s) => mono - s.received <= 60000 && mono >= s.received)
      .reduce<ClockSample | undefined>(
        (best, s) => (!best || s.rtt < best.rtt ? s : best),
        undefined,
      );
  }
  now(mono: number, wall: number) {
    return this.baseline
      ? this.baseline.serverTime + mono - this.baseline.at
      : wall;
  }
}
