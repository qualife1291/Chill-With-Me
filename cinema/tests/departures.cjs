// LOCAL only. Real browser sockets/tab closes; silent transport leases use API-only pages.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { chromium, executablePath } = require("./browser-runtime.cjs");
const base = "http://localhost:8787";
(async () => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const checks = [],
    errors = [],
    owned = [];
  const api = async (page, route, data) => {
    const r = await page.request.fetch(base + "/api" + route, {
      method: data === undefined ? "GET" : "POST",
      data,
      headers: { Origin: base },
    });
    return { code: r.status(), data: await r.json() };
  };
  const wait = async (fn, ms = 40000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await fn()) return;
      await new Promise((r) => setTimeout(r, 500));
    }
    throw Error("Timed out waiting for lifecycle condition");
  };
  const client = async () => {
    const context = await browser.newContext(),
      page = await context.newPage();
    await page.goto(base + "/api/rooms");
    const id = (await api(page, "/session", {})).data.id;
    return { context, page, id };
  };
  const command = (c, slot, session, cmd, id = crypto.randomUUID()) =>
    api(c.page, `/rooms/${slot}/command`, {
      session,
      commandId: id,
      command: cmd,
    });
  const attach = async (c, slot, heartbeat = true) =>
    c.page.evaluate(
      async ({ slot, heartbeat }) => {
        window.__frames = [];
        const ws = (window.__ws = new WebSocket(
          `ws://${location.host}/api/rooms/${slot}/ws`,
        ));
        ws.onmessage = (e) => window.__frames.push(JSON.parse(e.data));
        await new Promise((resolve, reject) => {
          ws.onopen = resolve;
          ws.onerror = reject;
        });
        if (heartbeat)
          window.__pulse = setInterval(() => {
            if (ws.readyState === 1)
              ws.send(
                JSON.stringify({ type: "clock", nonce: crypto.randomUUID() }),
              );
          }, 15000);
      },
      { slot, heartbeat },
    );
  const make = async (slot, successor = false) => {
    const h = await client(),
      g = await client();
    const created = await api(h.page, `/rooms/${slot}/create`, {
      name: `Host ${slot}`,
      title: `Departure ${slot}`,
      capacity: 3,
    });
    assert.equal(created.code, 200);
    const epoch = created.data.room.session;
    owned.push({ h, g, slot, epoch });
    await attach(h, slot, slot !== 2);
    await api(g.page, `/rooms/${slot}/join`, { name: `Guest ${slot}` });
    await command(h, slot, epoch, { type: "accept", id: g.id });
    await attach(g, slot);
    if (successor)
      await command(h, slot, epoch, { type: "successor", id: g.id });
    return { h, g, epoch };
  };
  try {
    const probe = await client();
    assert((await api(probe.page, "/rooms")).data.every((r) => !r.open));
    // Start bounded silent-host and real browser-close successor cases together.
    const silent = await make(2);
    const transfer = await make(3, true);
    await transfer.h.page.close();
    // A real app exercises backoff, recovery and a closed host tab.
    const context = await browser.newContext();
    let h = await context.newPage();
    const g = await browser.newPage({ viewport: { width: 1000, height: 800 } });
    for (const p of [h, g]) {
      p.setDefaultTimeout(30000);
      p.on("pageerror", (e) => errors.push(e.message));
      await p.addInitScript(() => {
        const Native = window.WebSocket;
        window.WebSocket = class extends Native {
          constructor(...args) {
            super(...args);
            window.__socket = this;
          }
        };
      });
      await p.route("https://www.youtube.com/iframe_api", (r) =>
        r.fulfill({
          contentType: "application/javascript",
          body: `window.YT={Player:class{constructor(el,c){this.video='';this.state=2;this.time=0;this.volume=80;window.__yt=this;el.innerHTML='<iframe title="Departure fixture"></iframe>';setTimeout(()=>c.events.onReady(),0)}loadVideoById(v){this.video=v.videoId;this.state=1}cueVideoById(v){this.video=v.videoId;this.state=2}getCurrentTime(){return this.time}getPlayerState(){return this.state}getDuration(){return 600}getVideoData(){return{video_id:this.video}}getVolume(){return this.volume}setVolume(v){this.volume=v}seekTo(t){this.time=t}playVideo(){this.state=1}pauseVideo(){this.state=2}destroy(){}}};window.onYouTubeIframeAPIReady();`,
        }),
      );
      await p.goto(base);
    }
    await h
      .locator(".room-card")
      .first()
      .getByRole("button", { name: "Tạo phòng" })
      .click();
    await h.getByPlaceholder("Mọi người gọi bạn là…").fill("Abrupt host");
    await h.getByLabel("Tên phòng mới").fill("Sudden close UI");
    await h
      .getByRole("dialog", { name: "Tạo phòng mới", exact: true })
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    const epoch = (await api(h, "/rooms/1/state")).data.room.session;
    owned.push({ h: { page: h }, g: { page: g }, slot: 1, epoch });
    const quick = h.getByRole("dialog", { name: "Thêm video để bắt đầu" });
    await quick
      .getByLabel("Link video / nhạc để bắt đầu")
      .fill("https://youtu.be/jfKfPfyJRdk");
    await quick.getByLabel("Link video / nhạc để bắt đầu").press("Enter");
    await h.waitForFunction(() => !!window.__yt?.video);
    await g.reload();
    await g
      .locator(".room-card")
      .filter({ hasText: "Sudden close UI" })
      .getByRole("button", { name: "Xin vào phòng" })
      .click();
    await g.getByPlaceholder("Mọi người gọi bạn là…").fill("Abrupt guest");
    await g
      .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await h
      .getByRole("dialog", { name: "Yêu cầu vào phòng" })
      .getByRole("button", { name: "Cho vào", exact: true })
      .click();
    await g.waitForFunction(
      () =>
        document.querySelector(".cinema-app")?.dataset.clockCalibrated ===
        "true",
    );
    for (const p of [h, g]) {
      await p.getByRole("button", { name: "Góc nhìn 🎮", exact: true }).click();
      await p.getByRole("button", { name: "Chế độ nhẹ", exact: true }).click();
    }
    // Keep the player identity while a real network outage initially makes HTTP recovery fail.
    await g.evaluate(() => {
      window.__playerBeforeOutage = window.__yt;
    });
    await g.context().setOffline(true);
    await g.evaluate(() => window.__socket.close());
    await g.waitForFunction(
      () =>
        document.querySelector(".cinema-app")?.dataset.clockCalibrated ===
        "false",
    );
    await g.waitForTimeout(4000);
    await g.context().setOffline(false);
    await g.waitForFunction(
      () =>
        document.querySelector(".cinema-app")?.dataset.clockCalibrated ===
        "true",
    );
    assert(await g.evaluate(() => window.__yt === window.__playerBeforeOutage));
    checks.push(
      "real app offline/online recovers after failed requests without remounting player",
    );
    // A second tab must terminate the replaced tab, not poll or reclaim its socket.
    const replacement = await context.newPage();
    await replacement.goto(base + "/api/rooms");
    await replacement.evaluate(async () => {
      window.__replacement = new WebSocket(
        `ws://${location.host}/api/rooms/1/ws`,
      );
      await new Promise((r) => (window.__replacement.onopen = r));
    });
    await h
      .getByText("Phòng đã được mở ở tab khác. Tab này đã ngắt kết nối.", {
        exact: true,
      })
      .waitFor();
    let oldPolls = 0;
    const listener = (r) => {
      if (r.url().endsWith("/rooms/1/state")) oldPolls++;
    };
    h.on("request", listener);
    await h.waitForTimeout(5500);
    assert.equal(oldPolls, 0);
    h.off("request", listener);
    checks.push(
      "replacement tab ends old UI with a friendly message and zero room-state polling",
    );
    await replacement.close();
    await g.getByText(/Chủ phòng đang mất kết nối/).waitFor();
    assert.equal(
      (await api(probe.page, "/rooms/1/join", { name: "Blocked outsider" }))
        .data.error,
      "HOST_RECONNECTING",
    );
    await wait(
      async () =>
        !(await api(probe.page, "/rooms")).data.find((r) => r.slot === 1).open,
    );
    await g
      .getByText("Phòng đã đóng do chủ rời phòng hoặc phiên chiếu kết thúc.", {
        exact: true,
      })
      .waitFor();
    const ended = await api(probe.page, "/rooms/1/state");
    assert.equal(ended.data.error, "ROOM_CLOSED");
    checks.push(
      "actual host tab close blocks new joins during grace, then closes room and returns viewer to lobby",
    );
    await wait(
      async () =>
        (await api(transfer.g.page, "/rooms/3/state")).data.room?.host ===
        transfer.g.id,
    );
    assert.equal(
      (
        await command(transfer.g, 3, transfer.epoch, {
          type: "chat",
          text: "New host alive",
        })
      ).code,
      200,
    );
    checks.push(
      "designated live successor takes over a closed host tab without losing room",
    );
    await wait(
      async () =>
        !(await api(probe.page, "/rooms")).data.find((r) => r.slot === 2).open,
      100000,
    );
    await silent.g.page.waitForFunction(() =>
      window.__frames.some(
        (f) => f.status === "removed" && f.reason === "ROOM_CLOSED",
      ),
    );
    checks.push(
      "socket left open without heartbeat expires server-side within lease and closes orphan room",
    );
    // A guest dying does not close a healthy host room.
    const lateGuest = await client();
    await api(lateGuest.page, "/rooms/3/join", { name: "Closing guest" });
    await command(transfer.g, 3, transfer.epoch, {
      type: "accept",
      id: lateGuest.id,
    });
    await attach(lateGuest, 3);
    await lateGuest.page.close();
    await wait(
      async () =>
        (await api(transfer.g.page, "/rooms/3/state")).data.room?.members
          .length === 1,
    );
    assert.equal(
      (await api(transfer.g.page, "/rooms/3/state")).data.room.host,
      transfer.g.id,
    );
    checks.push(
      "guest tab expiry removes its seat while the live host room stays open",
    );
    const recreated = await api(probe.page, "/rooms/1/create", {
      name: "New host",
      title: "Fresh epoch",
      capacity: 2,
    });
    assert.equal(recreated.code, 200);
    owned.push({
      h: probe,
      g: probe,
      slot: 1,
      epoch: recreated.data.room.session,
    });
    assert.equal(
      (
        await api(probe.page, "/rooms/1/command", {
          session: epoch,
          commandId: crypto.randomUUID(),
          command: { type: "close" },
        })
      ).data.error,
      "STALE_SESSION",
    );
    await api(probe.page, "/rooms/1/command", {
      session: recreated.data.room.session,
      commandId: crypto.randomUUID(),
      command: { type: "close" },
    });
    checks.push(
      "reused slot has a fresh epoch; stale close cannot delete the new room",
    );
    await transfer.g.page.evaluate(() => {
      window.__ws.close();
    });
    await wait(
      async () =>
        !(await api(probe.page, "/rooms")).data.find((r) => r.slot === 3).open,
    );
    assert.deepEqual(errors, []);
    const report = {
      passed: true,
      checks,
      pageErrors: errors,
      limits:
        "Local real sockets, tab closes, silent heartbeat expiry and offline emulation; not a WAN or operating-system power-loss certification.",
    };
    fs.writeFileSync(
      path.join(__dirname, "../evidence/departures.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    for (const r of owned)
      for (const c of [r.h, r.g])
        if (!c.page.isClosed())
          await command(c, r.slot, r.epoch, { type: "close" }).catch(() => {});
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
