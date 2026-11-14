export type Tokens = { dan: number; quan: number };
export type Oaq = {
  pits: Tokens[];
  banks: [Tokens, Tokens];
  debt: [number, number];
  turn: 0 | 1;
  turns: number;
  end?: string;
  last?: { pit: number; direction: number; captured: number; refilled: number };
};
const empty = (): Tokens => ({ dan: 0, quan: 0 });
const quan = (pit: number) => pit === 0 || pit === 6;
export const ownPits = (side: number) =>
  side === 0 ? [1, 2, 3, 4, 5] : [7, 8, 9, 10, 11];
const count = (t: Tokens) => t.dan + t.quan;
const points = (t: Tokens) => t.dan + t.quan * 10;
export const oaqScores = (o: Oaq) =>
  o.banks.map((b, s) => points(b) - o.debt[s] + o.debt[1 - s]);
export function initialOaq(): Oaq {
  return {
    pits: Array.from({ length: 12 }, (_, p) => ({
      dan: quan(p) ? 0 : 5,
      quan: quan(p) ? 1 : 0,
    })),
    banks: [empty(), empty()],
    debt: [0, 0],
    turn: 0,
    turns: 0,
  };
}
function settle(o: Oaq, reason: string) {
  o.end = reason;
  for (const side of [0, 1])
    for (const p of ownPits(side)) {
      o.banks[side].dan += o.pits[p].dan;
      o.pits[p].dan = 0;
    }
}
function refill(o: Oaq) {
  const s = o.turn,
    t = 1 - s;
  if (ownPits(s).some((p) => o.pits[p].dan)) return 0;
  const missing = Math.max(0, 5 - o.banks[s].dan);
  if (o.banks[t].dan < missing) {
    settle(o, "no-refill");
    return 0;
  }
  o.banks[t].dan -= missing;
  o.banks[s].dan += missing;
  o.debt[s] += missing;
  const offset = Math.min(...o.debt);
  o.debt[0] -= offset;
  o.debt[1] -= offset;
  o.banks[s].dan -= 5;
  for (const p of ownPits(s)) o.pits[p].dan = 1;
  return 5;
}
/** Pure atomic turn; complete the hand before checking the work bound. */
export function sowOaq(input: Oaq, pit: number, direction: 1 | -1): Oaq {
  if (
    input.end ||
    !ownPits(input.turn).includes(pit) ||
    !input.pits[pit].dan ||
    ![1, -1].includes(direction)
  )
    throw Error("GAME_INVALID_PIT");
  const o = structuredClone(input),
    step = (i: number) => (i + direction + 12) % 12;
  let cursor = pit,
    steps = 0,
    captured = 0;
  while (true) {
    const hand = o.pits[cursor].dan;
    o.pits[cursor].dan = 0;
    for (let n = 0; n < hand; n++) {
      cursor = step(cursor);
      o.pits[cursor].dan++;
      steps++;
    }
    if (steps >= 4096) {
      settle(o, "repetition");
      break;
    }
    const next = step(cursor);
    if (!quan(next) && o.pits[next].dan > 0) {
      cursor = next;
      continue;
    }
    cursor = next;
    while (!count(o.pits[cursor]) && count(o.pits[step(cursor)])) {
      const taken = step(cursor),
        t = o.pits[taken];
      o.banks[o.turn].dan += t.dan;
      o.banks[o.turn].quan += t.quan;
      captured += points(t);
      o.pits[taken] = empty();
      cursor = step(taken);
    }
    break;
  }
  o.turns++;
  o.turn = o.turn === 0 ? 1 : 0;
  if (!o.end && o.pits[0].quan + o.pits[6].quan === 0)
    settle(o, "quan-finished");
  if (!o.end && o.turns >= 500) settle(o, "turn-limit");
  const refilled = o.end ? 0 : refill(o);
  o.last = { pit, direction, captured, refilled };
  return o;
}
