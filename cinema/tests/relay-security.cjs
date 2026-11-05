// Protocol ACL/ordering test only. Synthetic bytes are never decoded as media.
const assert = require("node:assert/strict");
const { chromium, executablePath } = require("./browser-runtime.cjs");
(async () => {
  const b = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox"],
  });
  const h = await b.newPage(),
    g = await b.newPage();
  const base = "http://localhost:8787",
    slot = 2;
  let epoch;
  const call = async (p, path, data) => {
    const r = await p.request.fetch(base + "/api" + path, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    return { code: r.status(), data: await r.json() };
  };
  const cmd = (p, command) =>
    call(p, `/rooms/${slot}/command`, {
      session: epoch,
      commandId: crypto.randomUUID(),
      command,
    });
  const connect = async (p) => {
    await p.goto(base + "/api/rooms");
    await p.evaluate(
      (slot) =>
        new Promise((resolve, reject) => {
          window.events = [];
          window.socket = new WebSocket(
            `ws://${location.host}/api/rooms/${slot}/ws`,
          );
          socket.binaryType = "arraybuffer";
          socket.onerror = () => reject(Error("socket failed"));
          socket.onmessage = (e) => {
            if (e.data instanceof ArrayBuffer)
              events.push({ type: "bytes", size: e.data.byteLength });
            else {
              const v = JSON.parse(e.data);
              events.push(v);
              if (v.status === "joined") resolve();
            }
          };
        }),
      slot,
    );
  };
  const count = (p, type) =>
    p.evaluate((type) => events.filter((e) => e.type === type).length, type);
  const frame = (p, header, bytes = [1, 2]) =>
    p.evaluate(
      ({ header, bytes }) => {
        const json = new TextEncoder().encode(JSON.stringify(header)),
          packet = new Uint8Array(4 + json.length + bytes.length);
        new DataView(packet.buffer).setUint32(0, json.length);
        packet.set(json, 4);
        packet.set(bytes, 4 + json.length);
        socket.send(packet.buffer);
      },
      { header, bytes },
    );
  const waitCount = (p, type, n) =>
    p.waitForFunction(
      ({ type, n }) => events.filter((e) => e.type === type).length >= n,
      { type, n },
      { timeout: 8000 },
    );
  try {
    await h.goto(base + "/api/rooms");
    await g.goto(base + "/api/rooms");
    const rooms = (await call(h, "/rooms")).data;
    assert(!rooms.find((r) => r.slot === slot).open);
    const hid = (await call(h, "/session", {})).data.id,
      gid = (await call(g, "/session", {})).data.id;
    const created = await call(h, `/rooms/${slot}/create`, {
      name: "Relay ACL host",
      title: "Relay ACL",
      capacity: 2,
    });
    epoch = created.data.room?.session;
    assert.equal(created.code, 200);
    await call(g, `/rooms/${slot}/join`, { name: "Relay guest" });
    await cmd(h, { type: "accept", id: gid });
    await connect(h);
    await connect(g);
    const fileId = crypto.randomUUID();
    await cmd(h, {
      type: "file",
      mode: "start",
      generation: 0,
      file: { fileId, name: "acl.mp3", mime: "audio/mpeg", size: 4 },
    });
    const header = { session: epoch, fileId, to: gid, offset: 0 };
    await frame(g, { ...header, to: hid });
    await waitCount(g, "file-error", 1);
    assert.equal(await count(h, "bytes"), 0);
    await frame(h, header);
    await waitCount(h, "file-error", 1);
    assert.equal(await count(g, "bytes"), 0);
    await g.evaluate((msg) => socket.send(JSON.stringify(msg)), {
      type: "file-signal",
      session: epoch,
      fileId,
      to: hid,
      signal: { type: "relay-request" },
    });
    await waitCount(h, "file-signal", 1);
    await frame(h, header);
    await waitCount(g, "bytes", 1);
    await frame(h, header);
    await waitCount(h, "file-error", 2);
    assert.equal(await count(g, "bytes"), 1);
    await frame(h, { ...header, offset: 2 });
    await waitCount(g, "bytes", 2);
    await frame(h, { ...header, offset: 4 }, [3]);
    await waitCount(h, "file-error", 3);
    assert.equal(await count(g, "bytes"), 2);
    await cmd(h, { type: "next", generation: 1 });
    await frame(h, { ...header, offset: 4 }, [3]);
    await waitCount(h, "file-error", 4);
    const persisted = (await call(h, `/rooms/${slot}/state`)).data.room;
    assert.equal(persisted.current, null);
    assert(!JSON.stringify(persisted).includes(fileId));
    const closed = h.evaluate(
      () =>
        new Promise((resolve) => {
          socket.addEventListener("close", (e) => resolve(e.code), {
            once: true,
          });
          socket.send(new Uint8Array(20000));
        }),
    );
    assert.equal(await closed, 1009);
    console.log(
      "PASS relay ACL: viewer injection, unsolicited owner bytes, duplicate offset, overflow, stale file, persisted cleanup and oversized-frame close",
    );
  } finally {
    if (epoch) await cmd(h, { type: "close" }).catch(() => {});
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
