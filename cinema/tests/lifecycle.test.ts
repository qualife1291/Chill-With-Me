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
  renewMember,
  roomSummary,
  CONNECTION_LEASE_MS,
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
test("without a designated successor host expiry closes the room immediately", () => {
  const r = setup();
  connectMember(r, "g", "g1", 4);
  r.playing = true;
  disconnectMember(r, "h", "hc", 6);
  assert.equal(sweep(r, 30006).closed, true);
  assert.equal(r.host, "");
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
test("unconnected creator expiry closes immediately; pending TTL still expires", () => {
  const r = createRoom("h", "H", "R", 2, 0);
  requestJoin(r, "g", "G", 1);
  assert.equal(sweep(r, 20000).closed, true);
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
  assert(!JSON.stringify(v).includes('"leaseUntil"'));
});

test("silent sockets expire at a bounded lease; only a fresh successor can take over", () => {
  for (const fresh of [true, false]) {
    const r = setup();
    connectMember(r, "g", "gc", 4);
    apply(r, "h", { type: "successor", id: "g" }, 5);
    if (fresh) renewMember(r, "g", "gc", 60000);
    const result = sweep(r, CONNECTION_LEASE_MS + 4);
    assert.equal(result.closed, !fresh);
    assert.equal(r.host, fresh ? "g" : "");
  }
});
test("normal host close blocks newcomers, preserves admitted rejoin and recovers within grace", () => {
  const r = setup();
  disconnectMember(r, "h", "hc", 100);
  assert.equal("recovering" in roomSummary(r), true);
  assert.throws(() => requestJoin(r, "new", "New", 101), /HOST_RECONNECTING/);
  requestJoin(r, "h", "Cannot rename", 102);
  assert.equal(r.members[0].deadline, 30100);
  connectMember(r, "h", "hc2", 30099);
  assert.equal(sweep(r, 30100).closed, false);
  assert.equal("recovering" in roomSummary(r), false);
  assert.equal(r.members[0].name, "Host");
});
test("leases renew at most once per 30 seconds and never broadcast by changing revision", () => {
  const r = setup(),
    revision = r.revision;
  assert.equal(renewMember(r, "h", "hc", 30000), false);
  assert.equal(renewMember(r, "h", "hc", 30001), true);
  assert.equal(r.members[0].leaseUntil, 120001);
  assert.equal(renewMember(r, "h", "hc", 30002), false);
  assert.equal(r.revision, revision);
  assert.throws(() => renewMember(r, "h", "old", 30003), /EXPIRED/);
  assert.throws(() => renewMember(r, "h", "hc", 120001), /EXPIRED/);
});
test("late close and replacement cannot extend or revive an expired lease", () => {
  const r = setup();
  assert.throws(() => connectMember(r, "h", "replacement", 90001), /EXPIRED/);
  disconnectMember(r, "h", "hc", 90002);
  assert.equal(r.members[0].deadline, 90001);
  assert(sweep(r, 90002).closed);
});
test("old socket clock/close cannot renew or disconnect a replacement", () => {
  const r = setup();
  connectMember(r, "h", "new", 100);
  assert.throws(() => renewMember(r, "h", "hc", 30100), /EXPIRED/);
  assert.equal(disconnectMember(r, "h", "hc", 30100), false);
  assert.equal(r.members[0].connectionId, "new");
});
test("legacy active connections gain a finite lease once, without extending on reads", () => {
  const r = setup();
  delete r.members[0].leaseUntil;
  sweep(r, 1000);
  assert.equal(r.members[0].leaseUntil, 91000);
  sweep(r, 2000);
  assert.equal(r.members[0].leaseUntil, 91000);
  assert(sweep(r, 91000).closed);
  assert(!JSON.stringify(view(r, "h")).includes('"leaseUntil"'));
});
test("private recovering summaries still reveal no identity or status metadata", () => {
  const r = setup();
  r.visibility = "private";
  disconnectMember(r, "h", "hc", 100);
  assert.deepEqual(roomSummary(r), { open: true, private: true });
});
test("legacy orphan rooms close on the next sweep even if viewers remain", () => {
  const r = setup();
  r.host = "";
  assert.equal(sweep(r, 100).closed, true);
});
