export type RandomBelow = (max: number) => number;
export const secureBelow: RandomBelow = (max) => {
  const limit = Math.floor(0x100000000 / max) * max,
    b = new Uint32Array(1);
  for (let n = 0; n < 128; n++) {
    crypto.getRandomValues(b);
    if (b[0] < limit) return b[0] % max;
  }
  throw Error("GAME_RANDOM_FAILURE");
};
export function shuffle<T>(input: T[], random: RandomBelow) {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = random(i + 1);
    if (!Number.isInteger(j) || j < 0 || j > i)
      throw Error("GAME_RANDOM_FAILURE");
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function makeTicket(random: RandomBelow): number[][] {
  let rows: number[][] = [];
  for (let trial = 0; trial < 256; trial++) {
    rows = Array.from({ length: 3 }, () =>
      shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8], random).slice(0, 5),
    );
    if (new Set(rows.flat()).size === 9) break;
    rows = [];
  }
  if (!rows.length)
    rows = [
      [0, 1, 2, 3, 4],
      [2, 3, 5, 6, 7],
      [0, 1, 5, 7, 8],
    ];
  const ticket = Array.from({ length: 3 }, () => Array<number>(9).fill(0));
  for (let col = 0; col < 9; col++) {
    const selected = rows
        .map((r, i) => (r.includes(col) ? i : -1))
        .filter((i) => i >= 0),
      min = col === 0 ? 1 : col * 10,
      max = col === 8 ? 90 : col * 10 + 9,
      numbers = shuffle(
        Array.from({ length: max - min + 1 }, (_, i) => min + i),
        random,
      )
        .slice(0, selected.length)
        .sort((a, b) => a - b);
    selected.forEach((row, i) => (ticket[row][col] = numbers[i]));
  }
  return ticket;
}
export function completeTicket(ticket: number[][], drawn: number[]) {
  const called = new Set(drawn);
  return ticket.some(
    (r) =>
      r.filter(Boolean).length === 5 &&
      r.filter(Boolean).every((n) => called.has(n)),
  );
}
