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
const rooms = await (await fetch(base + "/api/rooms")).json();
assert(
  !rooms.find((r) => r.slot === slot).open,
  "Local slot 2 must be free; do not replace existing rooms",
);
const h = await session(),
  g = await session();
const created = await call(h, `/rooms/${slot}/create`, {
  name: "Queue host",
  title: "Queue integration",
  capacity: 2,
});
assert.equal(created.status, 200);
const epoch = created.data.room.session;
const cmd = (s, command, commandId = crypto.randomUUID()) =>
  call(s, `/rooms/${slot}/command`, { session: epoch, commandId, command });
try {
  assert.equal(
    (await call(g, `/rooms/${slot}/join`, { name: "Queue guest" })).status,
    200,
  );
  assert.equal((await cmd(h, { type: "accept", id: g.id })).status, 200);
  await cmd(h, {
    type: "start",
    url: "https://youtu.be/jfKfPfyJRdk",
    generation: 0,
  });
  await cmd(h, { type: "add", url: "https://youtu.be/5qap5aO4i9A" });
  assert.equal(
    (await cmd(g, { type: "suggest", url: "https://youtu.be/dQw4w9WgXcQ" }))
      .status,
    200,
  );
  let state = (await call(h, `/rooms/${slot}/state`)).data.room;
  assert.equal(state.queue.length, 1);
  assert.equal(state.suggestions.length, 1);
  assert.equal(
    (
      await cmd(g, {
        type: "reorder",
        id: state.queue[0].id,
        direction: "up",
        expectedQueueRevision: state.queueRevision,
      })
    ).data.error,
    "HOST_ONLY",
  );
  const acceptId = crypto.randomUUID(),
    accept = {
      type: "review-suggestion",
      id: state.suggestions[0].id,
      accept: true,
      expectedQueueRevision: state.queueRevision,
    };
  assert.equal((await cmd(h, accept, acceptId)).status, 200);
  assert.equal((await cmd(h, accept, acceptId)).status, 200);
  state = (await call(h, `/rooms/${slot}/state`)).data.room;
  assert.equal(state.queue.length, 2);
  assert.equal(state.suggestions.length, 0);
  const stale = state.queueRevision,
    second = state.queue[1].id;
  const reordered = await cmd(h, {
    type: "reorder",
    id: second,
    direction: "up",
    expectedQueueRevision: stale,
  });
  assert.equal(reordered.status, 200);
  assert.equal(reordered.data.room.queue[0].videoId, "dQw4w9WgXcQ");
  const rejected = await cmd(h, {
    type: "remove",
    id: second,
    expectedQueueRevision: stale,
  });
  assert.equal(rejected.data.error, "STALE_QUEUE");
  state = (await call(g, `/rooms/${slot}/state`)).data.room;
  assert.equal(state.queue[0].id, second);
  assert.equal(state.current.videoId, "jfKfPfyJRdk");
  assert.equal(state.generation, 1);
  assert.equal(state.playing, true);
  console.log(
    "PASS playlist integration: suggestion approval, host ACL, idempotent accept, shared ordering, stale edit rejection and current playback unchanged",
  );
} finally {
  assert.equal((await cmd(h, { type: "close" })).status, 200);
}
