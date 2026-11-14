import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyGame,
  gameCommandSchema,
  gameView,
  initialOaq,
  makeTicket,
  oaqScores,
  ownPits,
  pruneGame,
  secureBelow,
  shuffle,
  sowOaq,
  type GameCommand,
  type Game,
  type Oaq,
} from "../shared/games";
import { apply, createRoom, requestJoin, view } from "../shared/model";
const rng = (seed = 1) => {
  let n = seed;
  return (max: number) => {
    n ^= n << 13;
    n ^= n >>> 17;
    n ^= n << 5;
    return (n >>> 0) % max;
  };
};
const setup = () => ({
  host: "a",
  members: [{ id: "a" }, { id: "b" }, { id: "c" }],
  gameRevision: 0,
  game: undefined as Game | undefined,
});
const act = (
  r: ReturnType<typeof setup>,
  actor: string,
  operation: GameCommand["operation"],
  now = 10000,
  random = rng(23),
) =>
  applyGame(
    r,
    actor,
    { type: "game", expectedRevision: r.gameRevision, operation },
    now,
    random,
  );
const open = (kind: "oaq" | "loto") => {
  const r = setup();
  act(r, "a", { action: "open", kind });
  act(r, "b", { action: "join" });
  act(r, "a", { action: "start" });
  return r;
};
const conserved = (o: Oaq) => {
  const all = [...o.pits, ...o.banks];
  assert.equal(
    all.reduce((n, p) => n + p.dan, 0),
    50,
  );
  assert.equal(
    all.reduce((n, p) => n + p.quan, 0),
    2,
  );
  for (const p of all)
    for (const n of [p.dan, p.quan]) assert(Number.isInteger(n) && n >= 0);
  assert(o.debt.every((n) => Number.isInteger(n) && n >= 0));
};
const blank = (): Oaq => ({
  pits: Array.from({ length: 12 }, () => ({ dan: 0, quan: 0 })),
  banks: [
    { dan: 0, quan: 0 },
    { dan: 0, quan: 0 },
  ],
  debt: [0, 0],
  turn: 0,
  turns: 0,
});
test("game payload validates kinds, directions, indices and revisions", () => {
  for (const operation of [
    { action: "open", kind: "casino" },
    { action: "sow", pit: 12, direction: 1 },
    { action: "sow", pit: 1, direction: 0 },
    { action: "draw", deck: [1] },
  ]) {
    const parsed = gameCommandSchema.safeParse({
      type: "game",
      expectedRevision: 0,
      operation,
    });
    if (operation.action === "draw")
      assert(!("deck" in parsed.data!.operation));
    else assert(!parsed.success);
  }
  assert(
    !gameCommandSchema.safeParse({
      type: "game",
      expectedRevision: -1,
      operation: { action: "join" },
    }).success,
  );
});
test("Ô initial physical tokens differ from their weighted scores", () => {
  const o = initialOaq();
  conserved(o);
  assert.equal(o.pits.filter((p) => p.quan).length, 2);
  assert.deepEqual(oaqScores(o), [0, 0]);
});
test("Ô relays NEXT occupied pit, then captures through an empty pit", () => {
  const before = initialOaq(),
    copy = JSON.stringify(before),
    o = sowOaq(before, 1, 1);
  assert.equal(JSON.stringify(before), copy);
  assert.equal(o.pits[7].dan, 0);
  assert.equal(o.pits[2].dan, 0);
  assert.equal(o.banks[0].dan, 6);
  assert.equal(o.last!.captured, 6);
  conserved(o);
});
test("Ô occupied quan stops relay without picking up its marker", () => {
  const o = initialOaq();
  o.pits[1].dan = 4;
  o.banks[0].dan = 1;
  const next = sowOaq(o, 1, 1);
  assert.equal(next.last!.captured, 0);
  assert.equal(next.pits[6].quan, 1);
  assert.equal(next.banks[0].dan, 1);
  conserved(next);
});
test("Ô chained capture includes both quan and terminates with complete conservation", () => {
  const o = blank();
  o.pits[0].quan = o.pits[6].quan = 1;
  o.pits[1].dan = 1;
  o.pits[4].dan = 2;
  o.pits[8].dan = 3;
  o.pits[10].dan = 44;
  const next = sowOaq(o, 1, 1);
  assert.equal(next.end, "quan-finished");
  assert.equal(next.banks[0].quan, 2);
  assert.equal(next.last!.captured, 70);
  assert.deepEqual(oaqScores(next), [70, 0]);
  conserved(next);
});
test("Ô refill borrows only the missing dân, records debt without converting quan", () => {
  const o = blank();
  o.pits[0].quan = o.pits[6].quan = 1;
  o.pits[1].dan = 1;
  o.banks[0].dan = 47;
  o.banks[1].dan = 2;
  const next = sowOaq(o, 1, 1);
  assert.equal(next.last!.refilled, 5);
  assert.equal(next.banks[0].dan, 44);
  assert.deepEqual(next.debt, [0, 3]);
  assert(ownPits(1).every((p) => next.pits[p].dan === 1));
  conserved(next);
});
test("Ô no-refill variant preserves neutral quan-pit tokens at settlement", () => {
  const o = blank();
  o.pits[0] = { dan: 47, quan: 1 };
  o.pits[6].quan = 1;
  o.pits[1].dan = 1;
  o.banks[0].dan = 2;
  const next = sowOaq(o, 1, 1);
  assert.equal(next.end, "no-refill");
  assert.equal(next.pits[0].dan, 47);
  assert.equal(next.banks[0].dan, 3);
  conserved(next);
});
test("Ô illegal moves are atomic; bounded seeded legal games preserve all tokens", () => {
  assert.throws(() => sowOaq(initialOaq(), 0, 1), /INVALID_PIT/);
  let moves = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const random = rng(seed);
    let o = initialOaq();
    while (!o.end) {
      const pits = ownPits(o.turn).filter((p) => o.pits[p].dan);
      assert(pits.length > 0);
      o = sowOaq(o, pits[random(pits.length)], random(2) ? 1 : -1);
      conserved(o);
      moves++;
      assert(o.turns <= 500);
    }
  }
  assert(moves > 500);
});
test("lô tô 500 generated tickets obey geometry, uniqueness and column intervals", () => {
  for (let s = 1; s <= 500; s++) {
    const t = makeTicket(rng(s));
    assert.equal(t.length, 3);
    assert(t.every((r) => r.length === 9 && r.filter(Boolean).length === 5));
    assert.equal(new Set(t.flat().filter(Boolean)).size, 15);
    for (let c = 0; c < 9; c++) {
      const ns = t.map((r) => r[c]).filter(Boolean);
      assert(ns.length >= 1 && ns.length <= 3);
      assert.deepEqual(
        ns,
        [...ns].sort((a, b) => a - b),
      );
      assert(
        ns.every(
          (n) =>
            n >= (c === 0 ? 1 : c * 10) && n <= (c === 8 ? 90 : c * 10 + 9),
        ),
      );
    }
  }
});
test("server shuffle/RNG bounds reject invalid sources and preserve unique draws", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const d = shuffle(
      Array.from({ length: 90 }, (_, i) => i + 1),
      rng(seed),
    );
    assert.equal(new Set(d).size, 90);
    assert(d.every((n) => n >= 1 && n <= 90));
  }
  assert.throws(() => shuffle([1, 2], () => 2), /RANDOM/);
  for (let n = 0; n < 100; n++) {
    const v = secureBelow(90);
    assert(v >= 0 && v < 90);
  }
});
test("host/player ACL, pause and stale/close-open ABA reject without mutation", () => {
  const r = open("oaq");
  for (const [who, operation] of [
    ["c", { action: "sow", pit: 1, direction: 1 }],
    ["b", { action: "sow", pit: 7, direction: 1 }],
    ["b", { action: "close" }],
  ] as const) {
    const before = JSON.stringify(r);
    assert.throws(() => act(r, who, operation));
    assert.equal(JSON.stringify(r), before);
  }
  act(r, "b", { action: "pause" });
  assert.throws(
    () => act(r, "a", { action: "sow", pit: 1, direction: 1 }),
    /NOT_PLAYING/,
  );
  assert.throws(() => act(r, "c", { action: "resume" }), /CANNOT_RESUME/);
  act(r, "b", { action: "resume" });
  const old = r.gameRevision;
  act(r, "a", { action: "close" });
  act(r, "a", { action: "open", kind: "loto" });
  assert.throws(
    () =>
      applyGame(
        r,
        "a",
        { type: "game", expectedRevision: old, operation: { action: "close" } },
        10000,
      ),
    /STALE_GAME/,
  );
  assert.equal(r.game!.kind, "loto");
  assert.throws(() => act(r, "stranger", { action: "join" }), /FORBIDDEN/);
});
test("lô tô secrets are absent for host, player and spectator; only own ticket exists", () => {
  const r = open("loto");
  for (const who of ["a", "b", "c"]) {
    const dto = gameView(r.game!, who);
    assert(!("secrets" in dto));
    assert(!JSON.stringify(dto).includes('"deck"'));
    assert.equal(!!dto.ticket, who !== "c");
  }
  const t = gameView(r.game!, "a").ticket!;
  t[0][0] = 999;
  assert(!r.game!.secrets!.tickets.a.flat().includes(999));
});
test("lô tô freezes first winning draw and recognizes every simultaneous winner", () => {
  const r = open("loto"),
    row = [1, 10, 20, 30, 40, 0, 0, 0, 0];
  r.game!.secrets!.tickets = {
    a: [row, [2, 11, 21, 31, 41, 0, 0, 0, 0], [3, 12, 22, 32, 42, 0, 0, 0, 0]],
    b: [row, [4, 13, 23, 33, 43, 0, 0, 0, 0], [5, 14, 24, 34, 44, 0, 0, 0, 0]],
  };
  r.game!.secrets!.deck = [
    1,
    10,
    20,
    30,
    40,
    ...Array.from({ length: 90 }, (_, i) => i + 1).filter(
      (n) => ![1, 10, 20, 30, 40].includes(n),
    ),
  ];
  const old = JSON.stringify(r);
  assert.throws(() => act(r, "b", { action: "claim" }), /NOT_WINNING/);
  assert.equal(JSON.stringify(r), old);
  assert.throws(() => act(r, "b", { action: "draw" }), /HOST_ONLY/);
  for (let i = 0; i < 5; i++) {
    act(r, "a", { action: "draw" }, 10000 + i * 3000);
    if (i === 0)
      assert.throws(() => act(r, "a", { action: "draw" }, 10001), /COOLDOWN/);
  }
  assert.equal(r.game!.claiming, true);
  assert.throws(() => act(r, "a", { action: "draw" }, 30000), /CLAIM_PENDING/);
  act(r, "b", { action: "claim" }, 30000);
  assert.deepEqual(r.game!.winners, ["a", "b"]);
  assert.equal(r.game!.phase, "finished");
});
test("host publication also validates winners; malformed randomness/start leaves lobby intact", () => {
  const r = setup();
  act(r, "a", { action: "open", kind: "loto" });
  act(r, "b", { action: "join" });
  const before = JSON.stringify(r);
  assert.throws(
    () => act(r, "a", { action: "start" }, 10000, () => 999),
    /RANDOM/,
  );
  assert.equal(JSON.stringify(r), before);
  act(r, "a", { action: "start" });
  assert.throws(() => act(r, "a", { action: "publish" }), /NOT_WINNING/);
});
test("player removal is bounded, preserves Ô sides, and prunes lô tô private tickets", () => {
  const r = open("oaq"),
    ids = [...r.game!.players];
  r.members = r.members.filter((m) => m.id !== "a");
  assert(pruneGame(r));
  assert.equal(r.game!.phase, "finished");
  assert.deepEqual(r.game!.players, ids);
  assert.deepEqual(r.game!.winners, []);
  const l = open("loto");
  l.game!.players.push("c");
  l.game!.secrets!.tickets.c = makeTicket(rng(99));
  l.members = l.members.filter((m) => m.id !== "b");
  assert(pruneGame(l));
  assert.equal(l.game!.phase, "playing");
  assert(!l.game!.secrets!.tickets.b);
  assert(!pruneGame(l));
});
test("model DTO redacts pending games and game lifecycle never changes media", () => {
  const r = createRoom("a", "A", "Games", 3, 1000);
  r.members.push({ ...r.members[0], id: "b", seat: 1 });
  r.current = { id: "movie", videoId: "jfKfPfyJRdk" };
  r.playing = true;
  const media = () =>
    JSON.stringify([r.current, r.playing, r.position, r.anchor, r.generation]);
  const before = media();
  const cmd = (actor: string, operation: GameCommand["operation"]) =>
    apply(
      r,
      actor,
      { type: "game", expectedRevision: r.gameRevision || 0, operation },
      2000,
    );
  cmd("a", { action: "open", kind: "loto" });
  cmd("b", { action: "join" });
  cmd("a", { action: "start" });
  assert.equal(media(), before);
  requestJoin(r, "c", "C", 2100);
  assert.equal(view(r, "c").status, "pending");
  assert(!("room" in view(r, "c")));
  assert(!JSON.stringify(view(r, "a")).includes('"secrets"'));
  for (let i = 0; i < 30; i++) {
    cmd("a", { action: "close" });
    cmd("a", { action: "open", kind: "oaq" });
    assert(JSON.stringify(r).length < 10000);
  }
  assert.equal(media(), before);
});
