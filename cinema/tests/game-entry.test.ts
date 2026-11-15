import { test } from "node:test";
import assert from "node:assert/strict";
import {
  apply,
  createRoom,
  requestJoin,
  roomSummary,
  view,
  type Room,
} from "../shared/model";
const make = (kind: "oaq" | "loto" = "oaq", privateRoom = false) =>
  createRoom(
    "h",
    "Host",
    "Game",
    10,
    1000,
    "male",
    privateRoom ? "private" : "public",
    "cinema",
    undefined,
    "cinema",
    kind,
  );
const ask = (r: Room, id: string, play = true) =>
  requestJoin(r, id, id, 1001, "female", r.inviteKey, undefined, play);
const accept = (r: Room, id: string) =>
  apply(r, "h", { type: "accept", id }, 1002);
const game = (
  r: Room,
  operation: Extract<
    Parameters<typeof apply>[2],
    { type: "game" }
  >["operation"],
  who = "h",
) =>
  apply(
    r,
    who,
    { type: "game", expectedRevision: r.gameRevision || 0, operation },
    1003,
  );
test("explicit play intent joins the observed lobby in the same approval revision", () => {
  for (const kind of ["oaq", "loto"] as const) {
    const r = make(kind);
    ask(r, "a");
    const rev = r.revision,
      gRev = r.gameRevision!;
    assert.equal(view(r, "a").status, "pending");
    assert(!("room" in view(r, "a")));
    assert.deepEqual(r.game!.players, ["h"]);
    accept(r, "a");
    assert.equal(r.revision, rev + 1);
    assert.equal(r.gameRevision, gRev + 1);
    assert.deepEqual(r.game!.players, ["h", "a"]);
    assert.equal(r.game!.phase, "lobby");
    assert(!("playGameId" in r.members[1]));
    assert.equal(r.current, null);
  }
});
test("spectator, legacy join and absent game never auto-join", () => {
  const r = make();
  ask(r, "viewer", false);
  accept(r, "viewer");
  requestJoin(r, "legacy", "Legacy", 1001);
  accept(r, "legacy");
  assert.deepEqual(r.game!.players, ["h"]);
  game(r, { action: "close" });
  ask(r, "late");
  accept(r, "late");
  assert.equal(r.game, undefined);
});
test("round replacement after request cannot enroll an applicant in another game", () => {
  const r = make();
  ask(r, "a");
  const id = r.pending[0].playGameId;
  game(r, { action: "close" });
  game(r, { action: "open", kind: "loto" });
  assert.notEqual(r.game!.id, id);
  accept(r, "a");
  assert.deepEqual(r.game!.players, ["h"]);
  assert.equal(r.members.length, 2);
});
test("starting/full games admit spectators without failing room approval", () => {
  for (const kind of ["oaq", "loto"] as const) {
    const r = make(kind);
    ask(r, "a");
    ask(r, "b");
    accept(r, "a");
    game(r, { action: "start" });
    accept(r, "b");
    assert(r.members.some((m) => m.id === "b"));
    assert(!r.game!.players.includes("b"));
    assert.equal(r.game!.phase, "playing");
  }
  const r = make();
  ask(r, "a");
  ask(r, "b");
  accept(r, "a");
  accept(r, "b");
  assert.equal(r.members.length, 3);
  assert.deepEqual(r.game!.players, ["h", "a"]);
});
test("requests during play and rejection cannot reserve or join a future round", () => {
  const r = make();
  ask(r, "a");
  accept(r, "a");
  game(r, { action: "start" });
  ask(r, "late");
  assert.equal(r.pending[0].playGameId, undefined);
  game(r, { action: "close" });
  game(r, { action: "open", kind: "loto" });
  accept(r, "late");
  assert.deepEqual(r.game!.players, ["h"]);
  ask(r, "reject");
  apply(r, "h", { type: "reject", id: "reject" }, 1002);
  assert(!r.members.some((m) => m.id === "reject"));
});
test("private capability/ACL/duplicates still guard play intent and phase remains private", () => {
  const r = make("loto", true);
  assert.throws(
    () => requestJoin(r, "a", "a", 1001, "female", undefined, undefined, true),
    /INVITE_REQUIRED/,
  );
  ask(r, "a");
  ask(r, "a", false);
  assert.equal(r.pending.length, 1);
  assert.equal(r.pending[0].playGameId, r.game!.id);
  assert.throws(
    () => apply(r, "a", { type: "accept", id: "a" }, 1002),
    /FORBIDDEN/,
  );
  assert.deepEqual(roomSummary(r), { open: true, private: true });
  assert.deepEqual(view(r, "stranger"), { status: "removed" });
  accept(r, "a");
  assert.deepEqual(r.game!.players, ["h", "a"]);
  const pub = roomSummary(make());
  assert("gamePhase" in pub);
  assert.equal(pub.gamePhase, "lobby");
});
