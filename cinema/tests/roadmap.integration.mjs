import assert from "node:assert/strict";
const base = "http://localhost:8787",
  slot = 2;
async function session() {
  const r = await fetch(base + "/api/session", {
    method: "POST",
    headers: { Origin: base },
  });
  assert.equal(r.status, 200);
  return {
    id: (await r.json()).id,
    cookie: r.headers.get("set-cookie").split(";")[0],
  };
}
async function api(s, path, data) {
  const r = await fetch(base + "/api" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      Origin: base,
      Cookie: s.cookie,
      "Content-Type": "application/json",
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return { code: r.status, data: await r.json() };
}
const [h, g, o] = await Promise.all([session(), session(), session()]);
assert(
  !(await api(h, "/rooms")).data.find((r) => r.slot === slot).open,
  "Local slot must be free",
);
const created = await api(h, `/rooms/${slot}/create`, {
  name: "Roadmap API host",
  title: "Private API secret title",
  capacity: 3,
  visibility: "private",
});
assert.equal(created.code, 200);
const epoch = created.data.room.session,
  key = created.data.room.inviteKey;
const cmd = (s, command, commandId = crypto.randomUUID(), extra = {}) =>
  api(s, `/rooms/${slot}/command`, {
    session: epoch,
    commandId,
    command,
    ...extra,
  });
try {
  const summary = (await api(o, "/rooms")).data.find((r) => r.slot === slot);
  assert.deepEqual(summary, { slot, open: true, private: true });
  assert(
    !JSON.stringify((await api(o, `/rooms/${slot}/state`)).data).includes(key),
  );
  assert.equal(
    (await api(g, `/rooms/${slot}/join`, { name: "Missing invitation" })).data
      .error,
    "INVITE_REQUIRED",
  );
  assert.equal(
    (
      await api(g, `/rooms/${slot}/join`, {
        name: "Guest",
        inviteKey: key,
        session: epoch,
      })
    ).code,
    200,
  );
  assert.equal((await cmd(h, { type: "accept", id: g.id })).code, 200);
  assert(
    !JSON.stringify((await api(g, `/rooms/${slot}/state`)).data).includes(key),
  );
  const first = {
    type: "import",
    urls: ["https://youtu.be/jfKfPfyJRdk", "https://example.com/first.mp3"],
    mode: "start",
    generation: 0,
    expectedQueueRevision: 0,
  };
  assert.equal((await cmd(g, first)).data.error, "HOST_ONLY");
  assert.equal((await cmd(h, first)).code, 200);
  let state = (await api(h, `/rooms/${slot}/state`)).data.room;
  const current = state.current.id,
    anchor = state.anchor;
  const large = {
    type: "import",
    urls: Array.from(
      { length: 4 },
      (_, i) => `https://example.com/${i}.mp3?signature=` + "a".repeat(1200),
    ),
    mode: "queue",
    generation: 1,
    expectedQueueRevision: state.queueRevision,
  };
  const id = crypto.randomUUID();
  assert(new TextEncoder().encode(JSON.stringify(large)).length > 4096);
  assert.equal((await cmd(h, large, id)).code, 200);
  assert.equal((await cmd(h, large, id)).code, 200);
  state = (await api(h, `/rooms/${slot}/state`)).data.room;
  assert.equal(state.queue.length, 5);
  assert.equal(state.current.id, current);
  assert.equal(state.anchor, anchor);
  const before = JSON.stringify(state);
  assert.equal(
    (
      await cmd(h, {
        ...large,
        urls: ["https://example.com/valid.mp3", "invalid"],
        expectedQueueRevision: state.queueRevision,
      })
    ).data.error,
    "INVALID_MEDIA_LINE:2",
  );
  assert.equal(
    JSON.stringify((await api(h, `/rooms/${slot}/state`)).data.room),
    before,
  );
  assert.equal(
    (
      await cmd(h, {
        type: "move",
        id: state.queue[0].id,
        beforeId: null,
        expectedQueueRevision: 0,
      })
    ).data.error,
    "STALE_QUEUE",
  );
  assert.equal(
    (
      await cmd(h, { type: "chat", text: "small" }, crypto.randomUUID(), {
        padding: "x".repeat(6000),
      })
    ).data.error,
    "PAYLOAD_TOO_LARGE",
  );
  assert.equal(
    (
      await cmd(h, {
        ...large,
        urls: Array(21).fill("https://example.com/a.mp3"),
      })
    ).data.error,
    "INVALID_INPUT",
  );
  await api(o, `/rooms/${slot}/join`, {
    name: "Pending old link",
    inviteKey: key,
  });
  const rotate = crypto.randomUUID();
  await cmd(h, { type: "rotate-invite" }, rotate);
  const rotated = (await api(h, `/rooms/${slot}/state`)).data.room;
  await cmd(h, { type: "rotate-invite" }, rotate);
  assert.equal(
    (await api(h, `/rooms/${slot}/state`)).data.room.inviteKey,
    rotated.inviteKey,
  );
  assert.equal(rotated.pending.length, 0);
  assert.equal(
    (
      await api(o, `/rooms/${slot}/join`, {
        name: "Expired link",
        inviteKey: key,
      })
    ).data.error,
    "INVITE_REQUIRED",
  );
  assert.equal(
    (await api(g, `/rooms/${slot}/join`, { name: "Resume without key" })).data
      .status,
    "joined",
  );
  console.log(
    "PASS roadmap API: private projection/admission/rotation, host ACL, atomic invalid batch, >4KB import, idempotency, stale drag revision, unchanged timeline and unchanged non-import body cap",
  );
} finally {
  assert.equal((await cmd(h, { type: "close" })).code, 200);
}
