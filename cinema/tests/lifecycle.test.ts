import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createRoom,
  requestJoin,
  apply,
  connectMember,
  disconnectMember,
  sweep,
  nextDeadline,
  target,
  view,
} from "../shared/model";
function setup() {
  const r = createRoom("h", "Host", "Room", 3, 0);
  connectMember(r, "h", "hc", 1);
  requestJoin(r, "g", "Guest", 2);
  apply(r, "h", { type: "accept", id: "g" }, 3);
  return r;
}
test("accepted seat expires exactly after 20s without connecting", () => {
  const r = setup();
  sweep(r, 20002);
  assert.equal(r.members.length, 2);
  sweep(r, 20003);
  assert.equal(r.members.length, 1);
});
test("reconnect before 30s keeps seat and anchor", () => {
  const r = setup();
  connectMember(r, "g", "g1", 4);
  r.playing = true;
  r.anchor = 0;
  disconnectMember(r, "g", "g1", 5);
  assert.equal(nextDeadline(r), 30005);
  connectMember(r, "g", "g2", 30004);
  sweep(r, 30006);
  assert.equal(r.members[1].seat, 1);
  assert.equal(target(r, 30006), 30.006);
});
test("late reconnect cannot revive expired membership", () => {
  const r = setup();
  connectMember(r, "g", "g1", 4);
  disconnectMember(r, "g", "g1", 5);
  assert.throws(() => connectMember(r, "g", "g2", 30005), /EXPIRED/);
  sweep(r, 30005);
  assert.equal(view(r, "g").status, "removed");
});
test("old-tab close cannot disconnect replacement socket", () => {
  const r = setup();
  connectMember(r, "g", "g1", 4);
  connectMember(r, "g", "g2", 5);
  assert.equal(disconnectMember(r, "g", "g1", 6), false);
  assert.equal(r.members[1].connectionId, "g2");
  assert.equal(r.members[1].deadline, undefined);
});
test("only designated online successor gets expired host role", () => {
  const r = setup();
  connectMember(r, "g", "g1", 4);
  apply(r, "h", { type: "successor", id: "g" }, 5);
  disconnectMember(r, "h", "hc", 6);
  sweep(r, 30006);
  assert.equal(r.host, "g");
  assert.equal(r.members.length, 1);
});
test("without successor host role locks while playback continues", () => {
  const r = setup();
  connectMember(r, "g", "g1", 4);
  r.playing = true;
  disconnectMember(r, "h", "hc", 6);
  sweep(r, 30006);
  assert.equal(r.host, "");
  assert.equal(r.playing, true);
  assert.throws(
    () => apply(r, "g", { type: "pause", generation: 0 }, 30007),
    /HOST_ONLY/,
  );
});
test("explicit transfer revokes previous host control", () => {
  const r = setup();
  connectMember(r, "g", "g1", 4);
  apply(r, "h", { type: "transfer", id: "g" }, 5);
  assert.equal(r.host, "g");
  assert.throws(() => apply(r, "h", { type: "kick", id: "g" }, 6), /HOST_ONLY/);
});
test("pending TTL and empty room close independently of room expiry", () => {
  const r = createRoom("h", "H", "R", 2, 0);
  requestJoin(r, "g", "G", 1);
  sweep(r, 20000);
  assert.equal(r.emptySince, 20000);
  assert.equal(nextDeadline(r), 80000);
  assert.equal(sweep(r, 80000).closed, true);
  const s = setup();
  requestJoin(s, "p", "P", 10);
  sweep(s, 120010);
  assert.equal(s.pending.length, 0);
});
test("transport connection identity is never exposed in snapshot", () => {
  const r = setup();
  const v = view(r, "h");
  assert("room" in v);
  assert.equal(v.room?.members[0].online, true);
  assert(!JSON.stringify(v).includes('"connectionId"'));
});
