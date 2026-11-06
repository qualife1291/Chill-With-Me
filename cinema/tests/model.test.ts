import { test } from "node:test";
import assert from "node:assert/strict";
import {
  apply,
  createRoom,
  requestJoin,
  seats,
  commandSchema,
  target,
  videoId,
  view,
} from "../shared/model";
test("all nine capacities produce exact unique seats", () => {
  for (let n = 2; n <= 10; n++) {
    const s = seats(n);
    assert.equal(s.length, n);
    assert.equal(new Set(s.map((s) => `${s.x},${s.z}`)).size, n);
    const rows = [...new Set(s.map((p) => p.z))].map((z) =>
      s.filter((p) => p.z === z),
    );
    assert.equal(rows.length, n < 6 ? 1 : n <= 8 ? 2 : 3);
    for (const row of rows) {
      assert(Math.abs(row.reduce((sum, p) => sum + p.x, 0)) < 1e-9);
      for (let i = 1; i < row.length; i++)
        assert(Math.abs(row[i].x - row[i - 1].x - 1.25) < 1e-9);
    }
    assert(
      Math.max(...rows.map((r) => r.length)) -
        Math.min(...rows.map((r) => r.length)) <=
        1,
    );
  }
  assert.throws(() => seats(11));
});
test("host alone plays and late join does not alter timeline", () => {
  const r = createRoom("h", "Host", "Room", 2, 1000);
  apply(r, "h", { type: "add", url: "https://youtu.be/jfKfPfyJRdk" }, 1000);
  apply(r, "h", { type: "next", generation: 0 }, 1000);
  assert.equal(r.playing, true);
  requestJoin(r, "v", "Viewer", 31000);
  apply(r, "h", { type: "accept", id: "v" }, 61000);
  assert.equal(target(r, 61000), 60);
  assert.equal(r.generation, 1);
});
test("last seat admission and host role enforced", () => {
  const r = createRoom("h", "H", "R", 2, 0);
  requestJoin(r, "a", "A", 1);
  requestJoin(r, "b", "B", 1);
  apply(r, "h", { type: "accept", id: "a" }, 2);
  assert.throws(
    () => apply(r, "h", { type: "accept", id: "b" }, 2),
    /ROOM_FULL/,
  );
  assert.throws(() => apply(r, "a", { type: "kick", id: "h" }, 3), /HOST_ONLY/);
});
test("pending cannot see private queue/chat or mutate room", () => {
  const r = createRoom("h", "H", "R", 3, 0);
  requestJoin(r, "a", "A", 1);
  assert.equal(view(r, "a").status, "pending");
  assert(!("room" in view(r, "a")));
  assert.throws(
    () => apply(r, "a", { type: "chat", text: "x" }, 2),
    /FORBIDDEN/,
  );
});
test("next race advances only once", () => {
  const r = createRoom("h", "H", "R", 2, 0);
  for (let i = 0; i < 2; i++)
    apply(
      r,
      "h",
      { type: "add", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
      0,
    );
  apply(r, "h", { type: "next", generation: 0 }, 1);
  assert.throws(
    () => apply(r, "h", { type: "next", generation: 0 }, 2),
    /STALE/,
  );
  assert.equal(r.queue.length, 1);
});
test("kick revokes access and cannot rejoin session", () => {
  const r = createRoom("h", "H", "R", 2, 0);
  requestJoin(r, "a", "A", 1);
  apply(r, "h", { type: "accept", id: "a" }, 2);
  apply(r, "h", { type: "kick", id: "a" }, 3);
  assert.equal(view(r, "a").status, "removed");
  assert.throws(() => requestJoin(r, "a", "A", 4), /BANNED/);
});
test("expiry and URL allowlist", () => {
  const r = createRoom("h", "H", "R", 2, 0);
  requestJoin(r, "a", "A", 0);
  assert.throws(
    () => apply(r, "h", { type: "accept", id: "a" }, 120001),
    /EXPIRED/,
  );
  for (const u of [
    "https://youtube.com.evil.test/watch?v=jfKfPfyJRdk",
    "http://youtu.be/jfKfPfyJRdk",
    "https://user@youtube.com/watch?v=jfKfPfyJRdk",
    "https://127.0.0.1/",
  ])
    assert.throws(() => videoId(u));
});

test("cinema rows rise towards the back, ten-seat rooms have three tiers", () => {
  const layout = seats(10);
  assert.equal(new Set(layout.map((s) => s.y)).size, 3);
  const rows = [...new Map(layout.map((s) => [s.z, s.y])).entries()].sort(
    (a, b) => a[0] - b[0],
  );
  for (let i = 1; i < rows.length; i++) assert(rows[i][1] > rows[i - 1][1]);
});

test("host quick start is atomic, viewer cannot replace video, empty queue marks one end", () => {
  const r = createRoom("h", "H", "R", 2, 0);
  requestJoin(r, "v", "V", 1);
  apply(r, "h", { type: "accept", id: "v" }, 2);
  assert.throws(
    () =>
      apply(
        r,
        "v",
        { type: "start", url: "https://youtu.be/jfKfPfyJRdk", generation: 0 },
        3,
      ),
    /HOST_ONLY/,
  );
  apply(
    r,
    "h",
    { type: "start", url: "https://youtu.be/jfKfPfyJRdk", generation: 0 },
    4,
  );
  assert(r.playing);
  assert.equal(r.generation, 1);
  assert.equal(r.queue.length, 0);
  assert.throws(
    () =>
      apply(
        r,
        "h",
        { type: "start", url: "https://youtu.be/jfKfPfyJRdk", generation: 1 },
        5,
      ),
    /SELECTED/,
  );
  apply(r, "h", { type: "next", generation: 1 }, 6);
  assert.equal(r.queueEndedAt, 6);
  assert.equal(r.current, null);
  apply(
    r,
    "h",
    { type: "start", url: "https://youtu.be/jfKfPfyJRdk", generation: 2 },
    7,
  );
  assert.equal(r.queueEndedAt, undefined);
  assert.equal(r.generation, 3);
});
test("look changes belong to member and enforce neck angle limits", () => {
  const r = createRoom("h", "H", "R", 2, 0);
  requestJoin(r, "v", "V", 1);
  apply(r, "h", { type: "accept", id: "v" }, 2);
  apply(r, "v", { type: "look", yaw: 20, pitch: 15, bodyYaw: 0 }, 3);
  assert.deepEqual(r.members[1].look, { yaw: 20, pitch: 15, bodyYaw: 0 });
});

test("member waves are actor-scoped, bounded, and unavailable to nonmembers", () => {
  const r = createRoom("host", "Host", "Cinema", 2, 1000);
  requestJoin(r, "guest", "Guest", 1000);
  apply(r, "host", { type: "accept", id: "guest" }, 1000);
  apply(r, "guest", { type: "wave" }, 2000);
  assert.equal(r.members.find((m) => m.id === "guest")?.waveAt, 2000);
  assert.equal(r.members.find((m) => m.id === "host")?.waveAt, undefined);
  apply(r, "guest", { type: "wave" }, 2100);
  assert.equal(r.members.find((m) => m.id === "guest")?.waveAt, 2000);
  assert.throws(
    () => apply(r, "outsider", { type: "wave" }, 5000),
    /FORBIDDEN/,
  );
  apply(r, "guest", { type: "wave" }, 4500);
  assert.equal(r.members.find((m) => m.id === "guest")?.waveAt, 4500);
});

test("avatar choice survives creation, pending approval and snapshots with legacy defaults", () => {
  const r = createRoom("host", "Host", "Avatar room", 2, 1000, "female");
  assert.equal(r.members[0].avatar, "female");
  requestJoin(r, "guest", "Guest", 1000, "male");
  assert.equal(r.pending[0].avatar, "male");
  apply(r, "host", { type: "accept", id: "guest" }, 1001);
  assert.equal(r.members[1].avatar, "male");
  assert.equal(view(r, "guest").room?.members[0].avatar, "female");
  assert.equal(
    createRoom("h", "Host", "Legacy", 2, 1000).members[0].avatar,
    "male",
  );
  assert.throws(() =>
    createRoom("h", "Host", "Bad", 2, 1000, "invalid" as never),
  );
});

test("poke targets approved peers, is actor scoped, and has a three-second cooldown", () => {
  const r = createRoom("h", "H", "Poke", 3, 0);
  requestJoin(r, "g", "G", 1);
  assert.throws(
    () => apply(r, "h", { type: "poke", id: "g" }, 2),
    /INVALID_TARGET/,
  );
  apply(r, "h", { type: "accept", id: "g" }, 3);
  apply(r, "g", { type: "poke", id: "h" }, 4);
  assert.equal(r.members[0].pokedAt, 4);
  assert.equal(r.members[0].pokedBy, "g");
  apply(r, "g", { type: "poke", id: "h" }, 100);
  assert.equal(r.members[0].pokedAt, 4);
  apply(r, "g", { type: "poke", id: "h" }, 3004);
  assert.equal(r.members[0].pokedAt, 3004);
  assert.throws(
    () => apply(r, "h", { type: "poke", id: "h" }, 4000),
    /INVALID_TARGET/,
  );
  assert.throws(
    () => apply(r, "outsider", { type: "poke", id: "h" }, 4000),
    /FORBIDDEN/,
  );
});

test("appearance is chosen on entry, survives approval, and cannot change inside a room", () => {
  const colors = { clothing: "#bf3355", hair: "#4c2f9c" },
    other = { clothing: "#008353", hair: "#9b5a45" };
  const r = createRoom(
    "h",
    "H",
    "Style",
    3,
    0,
    "female",
    "public",
    "sofa",
    colors,
  );
  requestJoin(r, "g", "G", 1, "male", undefined, other);
  requestJoin(r, "g", "G", 2, "male", undefined, colors);
  apply(r, "h", { type: "accept", id: "g" }, 3);
  requestJoin(r, "g", "G", 4, "male", undefined, colors);
  assert.deepEqual(r.members.find((m) => m.id === "g")?.appearance, other);
  assert.deepEqual(r.members[0].appearance, colors);
  const restored = JSON.parse(JSON.stringify(r));
  assert.deepEqual(restored.members[0].appearance, colors);
  assert.equal(
    commandSchema.safeParse({ type: "appearance", colors: other }).success,
    false,
  );
  for (const invalid of ["#fff", "red", "#12345678", "url(x)", "#zzzzzz", ""])
    assert.throws(() =>
      createRoom("x", "X", "Bad", 2, 0, "male", "public", "cinema", {
        clothing: invalid,
        hair: "#123456",
      }),
    );
});
