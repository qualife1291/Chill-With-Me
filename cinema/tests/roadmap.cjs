const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { chromium, executablePath } = require("./browser-runtime.cjs");
const base = "http://localhost:8787",
  slot = 2;
(async () => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const h = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
    g = await browser.newPage(),
    outsider = await browser.newPage(),
    pending = await browser.newPage();
  let epoch;
  const checks = [],
    errors = [];
  const api = async (p, route, data) => {
    const r = await p.request.fetch(base + "/api" + route, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    return { code: r.status(), data: await r.json() };
  };
  const cmd = (p, command, commandId = crypto.randomUUID()) =>
    api(p, `/rooms/${slot}/command`, { session: epoch, commandId, command });
  const ytFixture = `window.YT={Player:class{constructor(el,c){window.__yt=this;this.video='';this.time=0;this.state=2;this.volume=80;el.innerHTML='<iframe title="YouTube fixture"></iframe>';setTimeout(()=>c.events.onReady(),0)}loadVideoById(v){this.video=v.videoId;this.time=v.startSeconds;this.state=1}cueVideoById(v){this.video=v.videoId;this.time=v.startSeconds;this.state=2}get time(){return this._t+(this.state===1?(performance.now()-this._at)/1000:0)}set time(v){this._t=v;this._at=performance.now()}getCurrentTime(){return this.time}getPlayerState(){return this.state}getDuration(){return 600}getVideoData(){return{video_id:this.video}}getVolume(){return this.volume}setVolume(v){this.volume=v}seekTo(t){this.time=t}playVideo(){const t=this.time;this.state=1;this.time=t}pauseVideo(){const t=this.time;this.state=2;this.time=t}destroy(){}}};window.onYouTubeIframeAPIReady();`;
  const panel = async (p, name) => {
    const b = p
      .locator(".cinema-toolbar")
      .getByRole("button", { name, exact: true });
    if ((await b.getAttribute("aria-pressed")) !== "true") await b.click();
  };
  try {
    for (const p of [h, g, outsider, pending]) {
      p.setDefaultTimeout(30000);
      p.on("pageerror", (e) => errors.push(e.message));
      await p.route("https://www.youtube.com/iframe_api", (r) =>
        r.fulfill({
          contentType: "application/javascript",
          body: ytFixture,
        }),
      );
      await p.goto(base);
    }
    const rooms = (await api(h, "/rooms")).data;
    assert(!rooms.find((r) => r.slot === slot).open);
    await h.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async () => {
            throw new DOMException("Blocked", "NotAllowedError");
          },
        },
      }),
    );
    await h.getByPlaceholder("Mọi người gọi bạn là…").fill("Private host");
    await h.getByLabel("Tên phòng mới").fill("Do not disclose " + Date.now());
    await h.getByLabel("Quyền riêng tư").selectOption("private");
    await h.getByLabel("Số ghế").selectOption("4");
    await h
      .locator(".room-card")
      .nth(slot - 1)
      .getByRole("button", { name: "Tạo phòng" })
      .click();
    const state = (await api(h, `/rooms/${slot}/state`)).data.room;
    epoch = state.session;
    const key = state.inviteKey;
    assert(key);
    const summary = (await api(outsider, "/rooms")).data.find(
      (r) => r.slot === slot,
    );
    assert.deepEqual(summary, { slot, open: true, private: true });
    assert.deepEqual(
      (await api(outsider, `/rooms/${slot}/state`)).data.status,
      "removed",
    );
    assert(!JSON.stringify(summary).includes(state.title));
    checks.push(
      "private lobby/state hide title, capacity, member count, epoch and capability",
    );
    const denied = await api(outsider, `/rooms/${slot}/join`, {
      name: "Denied",
    });
    assert.equal(denied.data.error, "INVITE_REQUIRED");
    const quick = h.getByRole("dialog", { name: "Thêm video để bắt đầu" });
    await quick.locator("summary").click();
    const list = quick.getByRole("textbox", {
      name: "Danh sách link · mỗi dòng một link",
    });
    await list.focus();
    await h.keyboard.press("Shift+Tab");
    assert(
      await quick
        .locator("summary")
        .evaluate((el) => el === document.activeElement),
    );
    await h.keyboard.press("Tab");
    assert(await list.evaluate((el) => el === document.activeElement));
    checks.push("bulk start textarea participates in modal keyboard loop");
    await list.fill("https://youtu.be/jfKfPfyJRdk\nnot-a-link");
    await quick.getByRole("alert").filter({ hasText: "Dòng 2" }).waitFor();
    assert(
      await quick
        .getByRole("button", { name: "Thêm danh sách", exact: true })
        .isDisabled(),
    );
    assert.equal(
      (await api(h, `/rooms/${slot}/state`)).data.room.current,
      null,
    );
    checks.push("invalid batch retains input and cannot partially publish");
    await quick.getByLabel("Đọc từ file TXT / M3U").setInputFiles({
      name: "playlist.m3u",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "#EXTM3U\n#EXTINF:10,Fixture\nhttps://youtu.be/jfKfPfyJRdk\nhttps://youtu.be/5qap5aO4i9A\nhttps://youtu.be/dQw4w9WgXcQ\nhttps://youtube.com/watch?v=jfKfPfyJRdk",
      ),
    });
    await quick
      .getByText("3 mục hợp lệ · bỏ 1 link trùng", { exact: true })
      .waitFor();
    await quick
      .getByRole("button", { name: "Thêm danh sách", exact: true })
      .click();
    await h.waitForFunction(() => window.__yt?.video === "jfKfPfyJRdk");
    await h.waitForFunction(
      () =>
        document.querySelector(".cinema-app")?.dataset.clockCalibrated ===
        "true",
    );
    checks.push(
      "atomic bulk start deduplicates and calibrates authenticated RTT probes",
    );
    // A link fragment reaches the join body, never the HTTP navigation URL or Referer.
    const seen = [];
    g.on("request", (r) =>
      seen.push({ url: r.url(), referer: r.headers().referer || "" }),
    );
    await g.goto(`${base}/?room=${slot}&session=${epoch}#invite=${key}`);
    await g.getByPlaceholder("Mọi người gọi bạn là…").fill("Private guest");
    await g
      .locator(".room-card")
      .filter({ hasText: "Phòng riêng tư" })
      .getByRole("button", { name: "Vào phòng riêng" })
      .click();
    assert.equal((await api(g, `/rooms/${slot}/state`)).data.status, "pending");
    assert(!seen.some((r) => r.url.includes(key) || r.referer.includes(key)));
    checks.push(
      "private fragment capability admits only to pending; never sent in navigation/referrer",
    );
    await h
      .getByRole("dialog", { name: "Yêu cầu vào phòng" })
      .getByRole("button", { name: "Cho vào", exact: true })
      .click();
    await g.waitForFunction(() => window.__yt?.video === "jfKfPfyJRdk");
    const guestState = (await api(g, `/rooms/${slot}/state`)).data.room;
    assert(!("inviteKey" in guestState));
    await panel(g, "Thông tin");
    assert(
      await g
        .getByRole("button", { name: "Mời bạn", exact: true })
        .isDisabled(),
    );
    checks.push(
      "approved viewer sees no invitation capability or host invitation control",
    );
    await api(pending, `/rooms/${slot}/join`, {
      name: "Revoked pending",
      inviteKey: key,
      session: epoch,
    });
    await h.getByRole("dialog", { name: "Yêu cầu vào phòng" }).press("Escape");
    await panel(h, "Thông tin");
    await h.getByRole("button", { name: "Mời bạn", exact: true }).click();
    const manual = h.getByLabel("Link mời để sao chép");
    await manual.waitFor();
    assert((await manual.inputValue()).endsWith("#invite=" + key));
    await manual.focus();
    assert(
      await manual.evaluate(
        (el) => el.selectionStart === 0 && el.selectionEnd === el.value.length,
      ),
    );
    await h.getByRole("button", { name: "Đổi link mời", exact: true }).click();
    await manual.waitFor({ state: "detached" });
    const rotated = (await api(h, `/rooms/${slot}/state`)).data.room;
    assert.notEqual(rotated.inviteKey, key);
    assert.equal(rotated.pending.length, 0);
    assert.equal(
      (await api(pending, `/rooms/${slot}/state`)).data.status,
      "removed",
    );
    assert.equal(
      (
        await api(pending, `/rooms/${slot}/join`, {
          name: "Old link",
          inviteKey: key,
          session: epoch,
        })
      ).data.error,
      "INVITE_REQUIRED",
    );
    assert.equal((await api(g, `/rooms/${slot}/state`)).data.status, "joined");
    checks.push(
      "host rotates invitation, revokes pending/old links and keeps approved membership",
    );
    assert.equal(
      (await cmd(g, { type: "rotate-invite" })).data.error,
      "HOST_ONLY",
    );
    await panel(h, "Playlist");
    await h.waitForFunction(() => document.activeElement?.id === "url");
    await h.keyboard.press("Escape");
    assert.equal(
      await h
        .locator(".cinema-toolbar")
        .getByRole("button", { name: "Playlist", exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    checks.push(
      "nonmodal panel focuses composer; Escape restores its toolbar opener",
    );
    let hostSeeks = 0;
    h.on("request", (request) => {
      if (request.url().endsWith("/command")) {
        try {
          if (request.postDataJSON()?.command?.type === "seek") hostSeeks++;
        } catch {}
      }
    });
    await h.waitForTimeout(1500);
    const originalSeeks = hostSeeks;
    await h.evaluate(() => {
      window.__wallNow = Date.now;
      Date.now = () => window.__wallNow() + 120000;
      window.dispatchEvent(new Event("focus"));
    });
    await h.waitForTimeout(2200);
    assert.equal(hostSeeks, originalSeeks);
    await h.evaluate(() => {
      Date.now = window.__wallNow;
      delete window.__wallNow;
      window.dispatchEvent(new Event("focus"));
    });
    checks.push(
      "a two-minute client wall-clock step does not generate a spurious host seek",
    );
    await panel(h, "Playlist");
    const before = (await api(h, `/rooms/${slot}/state`)).data.room;
    await h
      .locator(".queue-item")
      .nth(1)
      .dragTo(h.locator(".queue-item").nth(0));
    await h.waitForFunction(
      async (slot) =>
        (await (await fetch(`/api/rooms/${slot}/state`)).json()).room.queue[0]
          .videoId === "dQw4w9WgXcQ",
      slot,
    );
    const after = (await api(h, `/rooms/${slot}/state`)).data.room;
    assert.deepEqual(after.current, before.current);
    assert.equal(after.generation, before.generation);
    assert.equal(after.anchor, before.anchor);
    checks.push(
      "drag queue order synchronizes without replacing current native iframe or timeline",
    );
    await h
      .locator(".queue-item")
      .nth(0)
      .dragTo(h.locator(".queue-item").nth(1));
    await h.waitForFunction(
      async (slot) =>
        (await (await fetch(`/api/rooms/${slot}/state`)).json()).room.queue.at(
          -1,
        ).videoId === "dQw4w9WgXcQ",
      slot,
    );
    const stale = await cmd(h, {
      type: "move",
      id: after.queue[0].id,
      beforeId: null,
      expectedQueueRevision: before.queueRevision,
    });
    assert.equal(stale.data.error, "STALE_QUEUE");
    checks.push("last-position drag works and stale revision is rejected");
    const importPanel = h.locator(".playlist-import");
    await importPanel.locator("summary").click();
    await importPanel
      .getByRole("textbox")
      .fill(
        "https://media.example.com/music.mp3\nhttps://drive.google.com/file/d/abcdefghijk/view",
      );
    await importPanel
      .getByRole("button", { name: "Thêm danh sách", exact: true })
      .click();
    await h.getByRole("status").filter({ hasText: "Đã thêm 2 mục" }).waitFor();
    const queued = (await api(g, `/rooms/${slot}/state`)).data.room;
    assert.equal(queued.queue.length, 4);
    assert.equal(queued.current.id, before.current.id);
    checks.push(
      "mixed-provider bulk append reaches the viewer without resetting playback",
    );
    const bootstrapRoom = (await api(h, `/rooms/${slot}/state`)).data.room;
    const resumeContext = await browser.newContext({
      storageState: await h.context().storageState(),
    });
    const resume = await resumeContext.newPage();
    resume.on("pageerror", (e) => errors.push(e.message));
    try {
      await resume.route("https://www.youtube.com/iframe_api", (r) =>
        r.fulfill({ contentType: "application/javascript", body: ytFixture }),
      );
      await resume.addInitScript(() => {
        const realNow = Date.now;
        Date.now = () => realNow() + 120000;
        window.WebSocket = class extends EventTarget {
          static OPEN = 1;
          static CLOSED = 3;
          readyState = 3;
          constructor() {
            super();
            setTimeout(() => this.onclose?.({ code: 1006 }), 20);
          }
          close() {}
          send() {
            throw Error("Controlled offline fixture");
          }
        };
      });
      await resume.goto(`${base}/?room=${slot}`);
      await resume
        .getByPlaceholder("Mọi người gọi bạn là…")
        .fill("Resume host");
      await resume
        .getByRole("button", { name: "Vào phòng riêng", exact: true })
        .click();
      await resume.waitForFunction(() => !!window.__yt?.video);
      const actual = await resume.evaluate(() => window.__yt.getCurrentTime());
      const expected =
        bootstrapRoom.position + (Date.now() - bootstrapRoom.anchor) / 1000;
      assert(
        Math.abs(actual - expected) < 2,
        "HTTP bootstrap must survive a new-room render when WS is offline and the client clock is skewed",
      );
      checks.push(
        "room resume bootstraps time from HTTP before WS, even with a skewed client clock",
      );
    } finally {
      await resumeContext.close();
      await h.bringToFront();
    }
    const screenshots =
      process.env.CINEMA_SCREENSHOT_DIR ||
      fs.mkdtempSync(path.join(require("node:os").tmpdir(), "cinema-roadmap-"));
    fs.mkdirSync(screenshots, { recursive: true });
    await h.screenshot({ path: path.join(screenshots, "roadmap-desktop.png") });
    await h.setViewportSize({ width: 390, height: 844 });
    assert(
      !(await h.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
    );
    await h.screenshot({ path: path.join(screenshots, "roadmap-mobile.png") });
    checks.push("private room and importer remain within a 390px viewport");
    assert.deepEqual(errors, []);
    const report = {
      passed: true,
      checks,
      pageErrors: errors,
      limits:
        "YouTube mocked; local authenticated sessions. RTT unit tests cover monotonic timing, not WAN drift guarantees.",
    };
    fs.writeFileSync(
      path.join(__dirname, "../evidence/roadmap.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (epoch) await cmd(h, { type: "close" }).catch(() => {});
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
