// Explicit admission intent, CAS/dedupe and capability checks against localhost only.
import assert from "node:assert/strict";
const base = "http://localhost:8787";
async function session() {
  const r = await fetch(base + "/api/session", {
    method: "POST",
    headers: { Origin: base },
  });
  assert.equal(r.status, 200);
  return {
    cookie: r.headers.get("set-cookie").split(";")[0],
    id: (await r.json()).id,
  };
}
async function call(who, route, data) {
  const r = await fetch(base + "/api" + route, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      Origin: base,
      Cookie: who.cookie,
      "Content-Type": "application/json",
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return { status: r.status, data: await r.json() };
}
const [h, a, b, c] = await Promise.all([
  session(),
  session(),
  session(),
  session(),
]);
assert(
  (await call(h, "/rooms")).data.every((r) => !r.open),
  "Preserve occupied local rooms",
);
let epoch;
const cmd = (who, command, commandId = crypto.randomUUID()) =>
  call(who, "/rooms/2/command", { session: epoch, commandId, command });
const state = async () => (await call(h, "/rooms/2/state")).data.room;
const game = async (operation) =>
  cmd(h, {
    type: "game",
    expectedRevision: (await state()).gameRevision || 0,
    operation,
  });
try {
  const made = await call(h, "/rooms/2/create", {
    name: "Host",
    title: "Game entry API",
    capacity: 4,
    visibility: "private",
    activity: "oaq",
  });
  assert.equal(made.status, 200);
  epoch = made.data.room.session;
  const key = made.data.room.inviteKey,
    gameId = made.data.room.game.id;
  assert.equal(
    (await call(a, "/rooms/2/join", { name: "A", playGame: true })).data.error,
    "INVITE_REQUIRED",
  );
  assert.equal(
    (
      await call(a, "/rooms/2/join", {
        name: "A",
        inviteKey: key,
        playGame: "yes",
      })
    ).status,
    400,
  );
  assert.equal((await state()).pending.length, 0);
  assert.equal(
    (
      await call(a, "/rooms/2/join", {
        name: "A",
        inviteKey: key,
        playGame: true,
        playGameId: crypto.randomUUID(),
      })
    ).status,
    200,
  );
  assert.equal(
    (await state()).pending[0].playGameId,
    gameId,
    "client cannot choose a different round",
  );
  const pending = (await call(a, "/rooms/2/state")).data;
  assert.equal(pending.status, "pending");
  assert(!pending.room);
  assert.equal(
    (await cmd(a, { type: "accept", id: a.id })).data.error,
    "FORBIDDEN",
  );
  const id = crypto.randomUUID();
  assert.equal((await cmd(h, { type: "accept", id: a.id }, id)).status, 200);
  const rev = (await state()).gameRevision;
  assert.equal((await cmd(h, { type: "accept", id: a.id }, id)).status, 200);
  assert.equal((await state()).gameRevision, rev);
  assert.deepEqual((await state()).game.players, [h.id, a.id]);
  assert.equal(
    (
      await call(b, "/rooms/2/join", {
        name: "B",
        inviteKey: key,
        playGame: true,
      })
    ).status,
    200,
  );
  assert.equal((await cmd(h, { type: "accept", id: b.id })).status, 200);
  assert(!(await state()).game.players.includes(b.id));
  await game({ action: "close" });
  await game({ action: "open", kind: "loto" });
  await call(c, "/rooms/2/join", { name: "C", inviteKey: key, playGame: true });
  const bound = (await state()).pending[0].playGameId;
  await game({ action: "close" });
  await game({ action: "open", kind: "oaq" });
  assert.notEqual((await state()).game.id, bound);
  assert.equal((await cmd(h, { type: "accept", id: c.id })).status, 200);
  assert(!(await state()).game.players.includes(c.id));
  assert.deepEqual(
    (await call(h, "/rooms")).data.find((r) => r.slot === 2),
    { slot: 2, open: true, private: true },
  );
  console.log(
    "PASS game entry HTTP: capability/boolean schema, server-bound round, pending privacy, host ACL, approval dedupe, full/replaced-round spectator fallback",
  );
} finally {
  if (epoch) await cmd(h, { type: "close" });
}
