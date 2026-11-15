import { test } from "node:test";
import assert from "node:assert/strict";
import { activitySchema, activityLabel } from "../shared/activities";
import {
  createRoom,
  roomSummary,
  requestJoin,
  view,
  apply,
} from "../shared/model";
import { applyGame, type Game } from "../shared/games";
import {
  gameCue,
  gameMusicSamples,
  gameMusicGain,
  MUSIC_RATE,
  MUSIC_SECONDS,
} from "../shared/gameAudio";
const room = (
  kind: "watch" | "oaq" | "loto" = "watch",
  privateRoom = false,
  capacity = 6,
) =>
  createRoom(
    "a",
    "Host",
    "Friends",
    capacity,
    10000,
    "male",
    privateRoom ? "private" : "public",
    "sofa",
    undefined,
    "lounge",
    kind,
  );
const next = (
  r: ReturnType<typeof room>,
  op: Parameters<typeof applyGame>[2]["operation"],
  actor = "a",
  now = 10000,
) =>
  applyGame(
    r,
    actor,
    { type: "game", expectedRevision: r.gameRevision || 0, operation: op },
    now,
  );
test("legacy watch creates no game and selected activities have one atomic host lobby", () => {
  assert.equal(room().game, undefined);
  for (const kind of ["oaq", "loto"] as const)
    for (let capacity = 2; capacity <= 10; capacity++) {
      const r = room(kind, false, capacity);
      assert.equal(r.game?.kind, kind);
      assert.equal(r.game?.phase, "lobby");
      assert.deepEqual(r.game?.players, ["a"]);
      assert.equal(r.gameRevision, 1);
      assert.equal(r.game?.revision, 1);
      assert.equal(r.current, null);
      assert.equal(r.generation, 0);
      assert.deepEqual(r.queue, []);
      assert.equal(r.seating, "sofa");
      assert.equal(r.space, "lounge");
    }
});
test("activity validation rejects invented payloads rather than opening a partial room", () => {
  for (const kind of ["casino", "", null, { kind: "loto", deck: [90] }]) {
    assert(!activitySchema.safeParse(kind).success);
    assert.throws(() => room(kind as "loto"));
  }
  assert.equal(activityLabel(), "Xem chung");
});
test("private summaries and pending views reveal no activity, card or room payload", () => {
  for (const kind of ["oaq", "loto"] as const) {
    const r = room(kind, true);
    assert.deepEqual(roomSummary(r), { open: true, private: true });
    requestJoin(r, "b", "Guest", 10000, "female", r.inviteKey);
    const pending = view(r, "b");
    assert.equal(pending.status, "pending");
    assert(!("room" in pending));
    assert(!("game" in pending));
    assert.deepEqual(view(r, "stranger"), { status: "removed" });
    const summary = roomSummary(room(kind));
    assert("activity" in summary);
    assert.equal(summary.activity, kind);
    next(r, { action: "close" });
    assert.deepEqual(roomSummary(r), { open: true, private: true });
  }
});
const copy = (g?: Game) => g && structuredClone(g);
test("game audio emits start/capture/sow only for accepted game transitions", () => {
  const r = room("oaq");
  requestJoin(r, "b", "Guest", 10000);
  apply(r, "a", { type: "accept", id: "b" }, 10000);
  next(r, { action: "join" }, "b");
  let old = copy(r.game);
  next(r, { action: "start" });
  assert.equal(gameCue(old, r.game), "game-start");
  old = copy(r.game);
  next(r, { action: "sow", pit: 1, direction: 1 });
  assert.equal(gameCue(old, r.game), "game-capture");
  const sow = structuredClone(r.game!);
  sow.revision++;
  sow.oaq!.turns++;
  sow.oaq!.last!.captured = 0;
  assert.equal(gameCue(r.game, sow), "game-sow");
  const paused = structuredClone(sow);
  paused.revision++;
  paused.phase = "paused";
  assert.equal(gameCue(sow, paused), undefined);
  assert.equal(gameCue(undefined, r.game), undefined);
  assert.equal(gameCue(r.game, r.game), undefined);
  assert.equal(gameCue(r.game, { ...r.game!, id: "new" }), undefined);
});
test("draw and winning audio do not repeat on snapshots, resume, close or repeated results", () => {
  const r = room("loto");
  requestJoin(r, "b", "Guest", 10000);
  apply(r, "a", { type: "accept", id: "b" }, 10000);
  next(r, { action: "join" }, "b");
  next(r, { action: "start" });
  const old = copy(r.game);
  next(r, { action: "draw" });
  assert.equal(gameCue(old, r.game), "game-draw");
  const paused = {
    ...r.game!,
    revision: r.game!.revision + 1,
    phase: "paused" as const,
  };
  assert.equal(
    gameCue(paused, { ...r.game!, revision: paused.revision + 1 }),
    undefined,
  );
  const win = {
    ...r.game!,
    phase: "finished" as const,
    revision: paused.revision + 1,
    winners: ["a"],
  };
  assert.equal(gameCue(r.game, win), "game-win");
  assert.equal(gameCue(win, { ...win, revision: win.revision + 1 }), undefined);
  assert.equal(gameCue(r.game, undefined), undefined);
});
test("original music has bounded mono PCM, finite unclipped samples and silent loop boundaries", () => {
  const tracks = [gameMusicSamples("garden"), gameMusicSamples("festival")];
  for (const t of tracks) {
    assert.equal(t.length, MUSIC_RATE * MUSIC_SECONDS);
    assert.equal(t.byteLength, 1152000);
    assert(t.every((v) => Number.isFinite(v) && Math.abs(v) < 1));
    assert(t.some((v) => Math.abs(v) > 0.1));
    assert.equal(t[0], 0);
    assert.equal(t.at(-1), 0);
  }
  assert.notDeepEqual(tracks[0], tracks[1]);
  assert.deepEqual(tracks[0], gameMusicSamples("garden"));
});
test("music gain clamps unsafe input and ducks to one quarter during speech", () => {
  assert.equal(gameMusicGain(18, false), 0.36);
  assert.equal(gameMusicGain(18, true), 0.09);
  assert.equal(gameMusicGain(100, false), 1);
  for (const v of [-3, NaN, Infinity]) assert.equal(gameMusicGain(v, false), 0);
});
