// Backend capacity smoke test: real cookies + 30 WebSockets; no video or GPU load.
const assert = require("node:assert/strict");
const { chromium, executablePath } = require("./browser-runtime.cjs");
const base = "http://localhost:8787";
(async () => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox"],
  });
  const clients = [],
    hosts = [];
  const timings = [];
  async function call(client, path, data) {
    const start = performance.now();
    const response = await client.context.request.fetch(base + "/api" + path, {
      method: data === undefined ? "GET" : "POST",
      data,
      headers: { Origin: base },
    });
    timings.push(performance.now() - start);
    return { status: response.status(), body: await response.json() };
  }
  try {
    const probe = await browser.newContext();
    const rooms = await (await probe.request.get(base + "/api/rooms")).json();
    await probe.close();
    assert(
      rooms.every((r) => !r.open),
      "All three local slots must be free; existing rooms are preserved",
    );
    for (let slot = 1; slot <= 3; slot++) {
      let host;
      for (let n = 0; n < 10; n++) {
        const context = await browser.newContext();
        const c = { context, slot };
        clients.push(c);
        const session = await call(c, "/session", {});
        assert.equal(session.status, 200);
        c.id = session.body.id;
        if (n === 0) {
          host = c;
          hosts.push(host);
          const created = await call(c, `/rooms/${slot}/create`, {
            name: `Host ${slot}`,
            title: `Capacity ${slot}`,
            capacity: 10,
            space: ["cinema", "lounge", "rooftop"][slot - 1],
          });
          assert.equal(created.status, 200);
          assert.equal(
            created.body.room.space,
            ["cinema", "lounge", "rooftop"][slot - 1],
          );
          host.epoch = created.body.room.session;
        } else {
          assert.equal(
            (await call(c, `/rooms/${slot}/join`, { name: `Guest ${n}` }))
              .status,
            200,
          );
          assert.equal(
            (
              await call(host, `/rooms/${slot}/command`, {
                session: host.epoch,
                commandId: crypto.randomUUID(),
                command: { type: "accept", id: c.id },
              })
            ).status,
            200,
          );
        }
        c.page = await context.newPage();
        c.page.on("console", (m) => {
          if (m.type() === "error") console.error("Browser:", m.text());
        });
        // A real local response gives Chromium the correct local address-space origin.
        await c.page.goto(base + "/api/rooms");
        const joined = await c.page.evaluate(
          (slot) =>
            new Promise((resolve, reject) => {
              window.received = [];
              window.socket = new WebSocket(
                `ws://${location.host}/api/rooms/${slot}/ws`,
              );
              const timeout = setTimeout(
                () => reject(Error("WS join timeout")),
                8000,
              );
              socket.onerror = () => {
                clearTimeout(timeout);
                reject(Error("WS connection failed"));
              };
              socket.onmessage = (e) => {
                const v = JSON.parse(e.data);
                window.received.push(v);
                if (v.status) {
                  clearTimeout(timeout);
                  resolve(v.status);
                }
              };
            }),
          slot,
        );
        assert.equal(joined, "joined");
      }
    }
    for (const host of hosts) {
      const state = await call(host, `/rooms/${host.slot}/state`);
      assert.equal(state.body.room.members.length, 10);
      assert(state.body.room.members.every((m) => m.online));
      const commandId = crypto.randomUUID();
      const started = performance.now();
      await host.page.evaluate(
        ({ epoch, commandId }) =>
          socket.send(
            JSON.stringify({
              session: epoch,
              commandId,
              command: { type: "chat", text: "capacity-broadcast" },
            }),
          ),
        { epoch: host.epoch, commandId },
      );
      await Promise.all(
        clients
          .filter((c) => c.slot === host.slot)
          .map((c) =>
            c.page.waitForFunction(() =>
              received.some(
                (v) =>
                  v.type === "chat" && v.message.text === "capacity-broadcast",
              ),
            ),
          ),
      );
      console.log(
        `PASS room ${host.slot}: 10 online members, chat received by all in ${Math.round(performance.now() - started)}ms`,
      );
    }
    const extra = { context: await browser.newContext() };
    try {
      await call(extra, "/session", {});
      assert.equal(
        (await call(extra, "/rooms/1/join", { name: "Overflow" })).status,
        400,
      );
    } finally {
      await extra.context.close();
    }
    timings.sort((a, b) => a - b);
    console.log(
      `PASS 3 rooms / 30 authenticated WebSockets, overflow rejected; local HTTP p50=${timings[Math.floor(timings.length * 0.5)].toFixed(1)}ms p95=${timings[Math.floor(timings.length * 0.95)].toFixed(1)}ms (${timings.length} requests). Excludes real media, rendering and Internet latency.`,
    );
  } finally {
    try {
      for (const h of hosts) {
        const result = await call(h, `/rooms/${h.slot}/command`, {
          session: h.epoch,
          commandId: crypto.randomUUID(),
          command: { type: "close" },
        });
        assert.equal(result.status, 200, "Test room cleanup failed");
      }
    } finally {
      await browser.close();
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
