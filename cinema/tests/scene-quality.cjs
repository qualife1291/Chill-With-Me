// Local backend + real WebGL drawing buffers; YouTube is mocked, no GPU/FPS claim.
const { chromium, executablePath } = require("./browser-runtime.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = "http://localhost:8787";
const checks = [];
const measurements = {};
(async () => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const contexts = [];
  const owned = [];
  const errors = [];
  const api = async (request, route, data) => {
    const r = await request.fetch(base + "/api" + route, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    const v = await r.json();
    assert(r.ok(), JSON.stringify(v));
    return v;
  };
  const command = (request, slot, session, c) =>
    api(request, `/rooms/${slot}/command`, {
      session,
      commandId: crypto.randomUUID(),
      command: c,
    });
  const enter = async (p, title) => {
    await p
      .locator(".room-card")
      .filter({ hasText: title })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await p.getByPlaceholder("Mọi người gọi bạn là…").fill("Quality host");
    await p
      .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
  };
  const makeRoom = async (slot, mobile = false, low = false) => {
    const context = await browser.newContext({
      viewport: mobile
        ? { width: 390, height: 844 }
        : { width: 1280, height: 900 },
      deviceScaleFactor: 2,
      hasTouch: mobile,
      isMobile: mobile,
    });
    contexts.push(context);
    await context.addInitScript(
      ({ blocked, low }) => {
        if (low) {
          Object.defineProperty(navigator, "deviceMemory", {
            value: 1,
            configurable: true,
          });
          Object.defineProperty(navigator, "hardwareConcurrency", {
            value: 2,
            configurable: true,
          });
        }
        const connection = new EventTarget();
        connection.saveData = false;
        Object.defineProperty(navigator, "connection", {
          value: connection,
          configurable: true,
        });
        window.__qualityConnection = connection;
        if (blocked) {
          Storage.prototype.getItem = () => {
            throw new Error("storage blocked");
          };
          Storage.prototype.setItem = () => {
            throw new Error("storage blocked");
          };
        }
      },
      { blocked: mobile, low },
    );
    const p = await context.newPage();
    p.setDefaultTimeout(30000);
    p.on("pageerror", (e) => errors.push(e.message));
    await p.route("https://www.youtube.com/iframe_api", (r) =>
      r.fulfill({
        contentType: "application/javascript",
        body: `window.YT={Player:class{constructor(el,c){this.config=c;this.state=2;this.volume=80;this.video='';this.time=0;window.__yt=this;el.innerHTML='<iframe title="Quality fixture" srcdoc="<body style=background:black;color:white>Video</body>"></iframe>';setTimeout(()=>c.events.onReady(),10)}get time(){return this._time+(this.state===1?(Date.now()-this._clock)/1000:0)}set time(t){this._time=t;this._clock=Date.now()}loadVideoById(v){this.video=v.videoId;this.state=1;this.time=v.startSeconds}cueVideoById(v){this.video=v.videoId;this.state=2;this.time=v.startSeconds}getCurrentTime(){return this.time}getPlayerState(){return this.state}getDuration(){return 600}getVideoData(){return{video_id:this.video}}getVolume(){return this.volume}setVolume(v){this.volume=v}seekTo(t){this.time=t}playVideo(){this.state=1}pauseVideo(){this.state=2}destroy(){}}};window.onYouTubeIframeAPIReady();`,
      }),
    );
    await api(p.request, "/session", {});
    assert(
      !(await api(p.request, "/rooms")).find((r) => r.slot === slot).open,
      "Local slot occupied; preserve it",
    );
    const title = "Scene quality " + slot + " " + Date.now();
    const created = await api(p.request, `/rooms/${slot}/create`, {
      name: "Quality host",
      title,
      capacity: 2,
    });
    const session = created.room.session;
    owned.push({ request: p.request, slot, session });
    await p.goto(base);
    await enter(p, title);
    await p
      .getByLabel("Link video / nhạc để bắt đầu")
      .fill("https://youtu.be/jfKfPfyJRdk");
    await p.getByLabel("Link video / nhạc để bắt đầu").press("Enter");
    await p.waitForFunction(
      () =>
        window.__yt?.video &&
        document.querySelector(".scene canvas")?.dataset.maleModel === "ready",
    );
    await p.evaluate(() => {
      window.__qualityPlayer = window.__yt;
      window.__qualityFrame = document.querySelector(".screen-surface iframe");
    });
    await p.getByRole("button", { name: "Góc nhìn 🎮", exact: true }).click();
    return { p, title };
  };
  const ratio = (p) =>
    p
      .locator(".scene canvas")
      .evaluate((c) => c.width / c.getBoundingClientRect().width);
  const expectRatio = async (p, target) =>
    p.waitForFunction((t) => {
      const c = document.querySelector(".scene canvas");
      return (
        c && Math.abs(c.width / c.getBoundingClientRect().width - t) < 0.01
      );
    }, target);
  const samePlayer = async (p) =>
    assert(
      await p.evaluate(
        () =>
          window.__yt === window.__qualityPlayer &&
          document.querySelector(".screen-surface iframe") ===
            window.__qualityFrame,
      ),
      "Quality/recovery must keep player AND iframe identity",
    );
  try {
    const lobby = await browser.newPage();
    await lobby.addInitScript(() => {
      window.__qaHidden = true;
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => window.__qaHidden,
      });
    });
    let lobbyPolls = 0;
    lobby.on("request", (r) => {
      if (r.url().endsWith("/api/rooms")) lobbyPolls++;
    });
    await lobby.goto(base);
    await lobby.waitForFunction(
      () => document.querySelectorAll(".room-card").length === 3,
    );
    const initialPolls = lobbyPolls;
    await lobby.waitForTimeout(5500);
    assert.equal(lobbyPolls, initialPolls);
    const refresh = lobby.waitForResponse((r) =>
      r.url().endsWith("/api/rooms"),
    );
    await lobby.evaluate(() => {
      window.__qaHidden = false;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await refresh;
    await lobby.close();
    checks.push(
      "hidden lobby skips periodic room requests and refreshes when visible",
    );
    const { p, title } = await makeRoom(1);
    const select = p.getByRole("combobox", {
      name: "Độ nét cảnh 3D",
      exact: true,
    });
    await expectRatio(p, 1.3);
    measurements.detailDpr = await ratio(p);
    await select.selectOption("economy");
    await expectRatio(p, 0.75);
    measurements.economyDpr = await ratio(p);
    await samePlayer(p);
    assert.equal(
      await p.evaluate(() => localStorage.getItem("cinema-scene-quality-v1")),
      "economy",
    );
    checks.push(
      "economy reduces actual drawing-buffer pixels without replacing native player or iframe",
    );
    await p.reload();
    await enter(p, title);
    await p.waitForFunction(() => window.__yt?.video);
    await expectRatio(p, 0.75);
    checks.push("quality preference survives a real reload/rejoin");
    await p.evaluate(() => {
      window.__qualityPlayer = window.__yt;
      window.__qualityFrame = document.querySelector(".screen-surface iframe");
    });
    await p.getByRole("button", { name: "Góc nhìn 🎮", exact: true }).click();
    await select.selectOption("auto");
    await expectRatio(p, 1.3);
    await p.evaluate(() => {
      window.__qualityConnection.saveData = true;
      window.__qualityConnection.dispatchEvent(new Event("change"));
    });
    await expectRatio(p, 0.75);
    await select.selectOption("detail");
    await expectRatio(p, 1.3);
    await samePlayer(p);
    checks.push(
      "auto follows Save-Data changes; explicit detail overrides device hint",
    );
    await p.bringToFront();
    await p.waitForTimeout(5500);
    const idle = await p
      .locator(".scene canvas")
      .getAttribute("data-render-frame");
    await p.waitForTimeout(1200);
    assert.equal(
      await p.locator(".scene canvas").getAttribute("data-render-frame"),
      idle,
    );
    checks.push("settled scene remains demand-rendered after quality changes");
    const time = await p.evaluate(() => window.__yt.getCurrentTime());
    await p.evaluate(() => {
      window.__hiddenForQA = true;
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => window.__hiddenForQA,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await p.waitForTimeout(300);
    const hiddenFrame = await p
      .locator(".scene canvas")
      .getAttribute("data-render-frame");
    await command(p.request, 1, owned[0].session, { type: "wave" });
    await p.waitForTimeout(400);
    assert.equal(
      await p.locator(".scene canvas").getAttribute("data-render-frame"),
      hiddenFrame,
    );
    await p.evaluate(() => {
      window.__hiddenForQA = false;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await p.waitForFunction(
      (f) => document.querySelector(".scene canvas")?.dataset.renderFrame !== f,
      hiddenFrame,
    );
    await samePlayer(p);
    checks.push(
      "hidden scenes do not draw for incoming actions; visible resumes with the same player",
    );
    const lost = await p.locator(".scene canvas").evaluate((c) => {
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      const extension = gl.getExtension("WEBGL_lose_context");
      if (!extension) return false;
      extension.loseContext();
      return true;
    });
    assert(lost, "This QA renderer must support actual context loss");
    await p
      .getByRole("status")
      .filter({ hasText: "Thiết bị vừa dừng cảnh 3D" })
      .waitFor();
    assert.equal(await p.locator(".scene canvas").count(), 0);
    await samePlayer(p);
    await p.waitForTimeout(300);
    assert(await p.evaluate((t) => window.__yt.getCurrentTime() > t, time));
    checks.push(
      "real WebGL context loss switches to flat mode while same player keeps advancing",
    );
    await p.getByRole("button", { name: "Thử lại 3D", exact: true }).click();
    await expectRatio(p, 1.3);
    await p.waitForFunction(
      () =>
        document.querySelector(".scene canvas")?.dataset.maleModel === "ready",
    );
    await samePlayer(p);
    checks.push(
      "explicit retry recreates only the renderer and retains the chosen quality",
    );
    const { p: mobile } = await makeRoom(2, true);
    await expectRatio(mobile, 0.75);
    await mobile.setViewportSize({ width: 1024, height: 1366 });
    await expectRatio(mobile, 0.75);
    await mobile.setViewportSize({ width: 844, height: 390 });
    await expectRatio(mobile, 0.75);
    await mobile
      .getByRole("combobox", { name: "Độ nét cảnh 3D", exact: true })
      .selectOption("detail");
    await expectRatio(mobile, 1.3);
    await samePlayer(mobile);
    checks.push(
      "portrait and landscape touch viewports default to economy; manual choice works with blocked storage",
    );
    const { p: weak } = await makeRoom(3, false, true);
    await expectRatio(weak, 0.75);
    assert.equal(
      await weak
        .locator(".scene canvas")
        .evaluate(
          (c) => c.getContext("webgl2").getContextAttributes().antialias,
        ),
      false,
    );
    await weak
      .getByRole("combobox", { name: "Độ nét cảnh 3D", exact: true })
      .selectOption("detail");
    await expectRatio(weak, 1.3);
    await samePlayer(weak);
    checks.push(
      "low-resource desktop defaults to economy/no MSAA but explicit detail retains player",
    );
    assert.deepEqual(errors, []);
    const report = {
      passed: true,
      date: new Date().toISOString(),
      checks,
      measurements,
      errors,
      limitations:
        "Local Chromium SwiftShader, real drawing buffers/context loss; YouTube mocked. No hardware FPS, battery, physical device or real media certification.",
    };
    fs.writeFileSync(
      path.join(__dirname, "../evidence/scene-quality.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    for (const r of owned)
      await command(r.request, r.slot, r.session, { type: "close" }).catch(
        () => {},
      );
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
