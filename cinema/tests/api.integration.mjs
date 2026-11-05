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
async function call(s, path, data) {
  const r = await fetch(base + "/api" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      Origin: base,
      Cookie: s.cookie,
      "Content-Type": "application/json",
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return { status: r.status, data: await r.json() };
}
const h = await session(),
  a = await session(),
  b = await session();
let v = await call(h, "/rooms/3/create", {
  name: "Host test",
  title: "QA room",
  capacity: 2,
  avatar: "female",
});
assert.equal(v.status, 200);
assert.equal(v.data.room.members[0].avatar, "female");
const epoch = v.data.room.session;
const cmd = (s, command, commandId = crypto.randomUUID(), session = epoch) =>
  call(s, "/rooms/3/command", { command, commandId, session });
try {
  const bad = await fetch(base + "/api/rooms/3/command", {
    method: "POST",
    headers: { Origin: "https://evil.test", Cookie: h.cookie },
    body: "{}",
  });
  assert.equal(bad.status, 403);
  await Promise.all([
    call(a, "/rooms/3/join", { name: "A", avatar: "male" }),
    call(b, "/rooms/3/join", { name: "B", avatar: "female" }),
  ]);
  const pending = await call(a, "/rooms/3/state");
  assert.equal(pending.data.status, "pending");
  assert.equal(pending.data.room, undefined);
  const accepts = await Promise.all([
    cmd(h, { type: "accept", id: a.id }),
    cmd(h, { type: "accept", id: b.id }),
  ]);
  assert.equal(accepts.filter((r) => r.status === 200).length, 1);
  const member = accepts[0].status === 200 ? a : b;
  const appearance = await call(member, "/rooms/3/state");
  assert.equal(
    appearance.data.room.members.find((m) => m.id === member.id).avatar,
    member === a ? "male" : "female",
  );
  assert.equal(
    (await cmd(member, { type: "next", generation: 0 })).status,
    400,
  );
  const duplicate = crypto.randomUUID();
  await cmd(h, { type: "add", url: "https://youtu.be/jfKfPfyJRdk" }, duplicate);
  await cmd(h, { type: "add", url: "https://youtu.be/jfKfPfyJRdk" }, duplicate);
  assert.equal((await call(h, "/rooms/3/state")).data.room.queue.length, 1);
  assert.equal((await cmd(h, { type: "next", generation: 0 })).status, 200);
  assert.equal((await cmd(h, { type: "next", generation: 0 })).status, 400);
  assert.equal(
    (
      await cmd(
        h,
        { type: "pause", generation: 1 },
        crypto.randomUUID(),
        "old-session",
      )
    ).status,
    400,
  );
  await cmd(h, { type: "kick", id: member.id });
  assert.equal((await call(member, "/rooms/3/state")).data.status, "removed");
  assert.equal(
    (await cmd(member, { type: "chat", text: "blocked" })).status,
    400,
  );
  console.log(
    "PASS integration: avatar choice, origin, pending privacy, concurrent capacity, host ACL, idempotency, Next race, stale epoch, kick revocation.",
  );
} finally {
  await cmd(h, { type: "close" });
}
