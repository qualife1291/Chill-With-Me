// Local app, actual WebAudio/WebGL; YouTube and device speech fixtures only.
const { chromium, executablePath } = require("./browser-runtime.cjs");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const base = "http://localhost:8787",
  shots = process.env.CINEMA_SCREENSHOT_DIR || "/tmp/cinema-experience-review";
fs.mkdirSync(shots, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const h = await browser.newPage({ viewport: { width: 1280, height: 900 } }),
    other = await browser.newPage();
  const checks = [],
    errors = [];
  let session;
  const api = async (route, data) => {
    const r = await h.request.fetch(base + "/api" + route, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    const v = await r.json();
    assert.equal(r.status(), 200, JSON.stringify(v));
    return v;
  };
  const cmd = (c) =>
    api("/rooms/1/command", {
      session,
      commandId: crypto.randomUUID(),
      command: c,
    });
  const controls = () =>
    h.getByRole("button", { name: "Góc nhìn 🎮", exact: true });
  const openControls = async () => {
    if ((await controls().getAttribute("aria-pressed")) !== "true")
      await controls().click();
  };
  const audioValue = () =>
    h.evaluate(() => {
      const src = window.__loops.at(-1);
      const gain = window.__gains.find((g) => g.context === src?.context);
      return gain?.gain.value;
    });
  try {
    await h.addInitScript(() => {
      const connection = new EventTarget();
      connection.saveData = false;
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: connection,
      });
      window.__contexts = [];
      window.__gains = [];
      window.__loops = [];
      const AC = window.AudioContext;
      window.AudioContext = class extends AC {
        constructor(...a) {
          super(...a);
          window.__contexts.push(this);
        }
        createGain() {
          const g = super.createGain();
          window.__gains.push(g);
          return g;
        }
      };
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...a) {
        if (this.loop) window.__loops.push(this);
        return start.apply(this, a);
      };
      Object.defineProperty(window, "speechSynthesis", {
        value: {
          getVoices: () => [
            { lang: "vi-VN", name: "Vietnamese fixture", voiceURI: "fixture" },
          ],
          resume() {},
          cancel() {},
          speak(u) {
            window.__utterance = u;
            u.onstart?.();
            setTimeout(() => u.onend?.(), 2500);
          },
        },
      });
      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        value: class {
          constructor(t) {
            this.text = t;
          }
        },
      });
    });
    await h.route("https://www.youtube.com/iframe_api", (r) =>
      r.fulfill({
        contentType: "application/javascript",
        body: `window.YT={Player:class{constructor(el,c){this.state=2;this.time=0;this.volume=80;this.video='';window.__yt=this;const f=document.createElement('iframe');f.srcdoc='<body style="background:#111;color:white">EXPERIENCE SCREEN</body>';el.replaceWith(f);setTimeout(()=>c.events.onReady(),0)}loadVideoById(v){this.video=v.videoId;this.state=1;this.time=v.startSeconds}cueVideoById(v){this.video=v.videoId;this.state=2;this.time=v.startSeconds}get time(){return this._time+(this.state===1?(Date.now()-this._clock)/1000:0)}set time(t){this._time=t;this._clock=Date.now()}getCurrentTime(){return this.time}getPlayerState(){return this.state}getDuration(){return 600}getVideoData(){return{video_id:this.video}}getVolume(){return this.volume}setVolume(v){this.volume=v}seekTo(t){this.time=t}playVideo(){const t=this.time;this.state=1;this.time=t}pauseVideo(){const t=this.time;this.state=2;this.time=t}destroy(){}}};window.onYouTubeIframeAPIReady();`,
      }),
    );
    h.on("pageerror", (e) => errors.push(e.message));
    h.setDefaultTimeout(30000);
    await h.goto(base);
    await other.goto(base + "/api/rooms");
    await h.bringToFront();
    assert(!(await api("/rooms")).some((r) => r.open));
    await h
      .locator(".room-card")
      .first()
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    await h.getByPlaceholder("Mọi người gọi bạn là…").fill("Experience host");
    await h.getByLabel("Tên phòng mới").fill("Experience QA");
    await h
      .getByRole("dialog", { name: "Tạo phòng mới" })
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    await h
      .getByLabel("Link video / nhạc để bắt đầu")
      .fill("https://music.youtube.com/watch?v=jfKfPfyJRdk");
    await h.getByLabel("Link video / nhạc để bắt đầu").press("Enter");
    session = (await api("/rooms/1/state")).room.session;
    await cmd({ type: "sit", instant: true });
    await h.waitForFunction(
      () =>
        document.querySelector(".screen-surface")?.dataset.transitioning ===
          "false" && window.__yt?.video,
    );
    await h.evaluate(() => {
      window.__originalPlayer = window.__yt;
      window.__originalFrame = document.querySelector(".screen-surface iframe");
    });
    await openControls();
    const lighting = h.getByLabel("Đèn trong rạp", { exact: true });
    await h.locator(".ambience-controls > summary").click();
    const wall = async (name) => {
      const bytes = await h.screenshot({
        path: path.join(shots, name + ".png"),
      });
      return h.evaluate(async (b) => {
        const im = new Image();
        im.src = "data:image/png;base64," + b;
        await im.decode();
        const c = document.createElement("canvas");
        c.width = im.width;
        c.height = im.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(im, 0, 0);
        const data = ctx.getImageData(24, 350, 70, 100).data;
        let total = 0;
        for (let i = 0; i < data.length; i += 4)
          total += data[i] + data[i + 1] + data[i + 2];
        return total / (data.length / 4);
      }, bytes.toString("base64"));
    };
    const normal = await wall("lighting-normal");
    await lighting.selectOption("dim");
    await h.waitForTimeout(1600);
    const dim = await wall("lighting-dim");
    assert(dim < normal - 5, JSON.stringify({ normal, dim }));
    await lighting.selectOption("warm");
    await h.waitForTimeout(1200);
    await wall("lighting-warm");
    assert(
      await h.evaluate(
        () =>
          window.__yt === window.__originalPlayer &&
          document.querySelector(".screen-surface iframe") ===
            window.__originalFrame,
      ),
    );
    checks.push(
      "normal/dim lighting changes actual scene pixels; warm selectable; player/iframe identity preserved",
    );
    const sound = h.getByLabel("Âm thanh nền", { exact: true });
    await sound.selectOption("rain");
    await h.waitForFunction(
      () => window.__loops.at(-1)?.context.state === "running",
    );
    await h.waitForTimeout(300);
    assert(Math.abs((await audioValue()) - 0.03) < 0.001);
    await h
      .locator(".cinema-toolbar")
      .getByRole("button", { name: "Chat", exact: true })
      .click();
    assert.equal(
      await controls().getAttribute("aria-pressed"),
      "false",
      "chat replaces the view sheet",
    );
    assert.equal(await h.locator(".voice-options").getAttribute("open"), null);
    assert(
      !(await h.getByLabel("Giọng tiếng Việt", { exact: true }).isVisible()),
    );
    await h.locator(".voice-options > summary").click();
    await h
      .getByRole("button", { name: "Nghe thử giọng", exact: true })
      .click();
    await h.waitForFunction(() => window.__yt.volume === 20);
    await h.waitForTimeout(400);
    assert(Math.abs((await audioValue()) - 0.0075) < 0.001);
    await h.waitForFunction(() => window.__yt.volume === 80);
    await h.waitForTimeout(300);
    assert(Math.abs((await audioValue()) - 0.03) < 0.001);
    assert(await h.getByLabel("Giọng tiếng Việt", { exact: true }).isVisible());
    checks.push(
      "speech settings collapsed by default; native speech signal ducks/restores both video and real ambient GainNode",
    );
    await h
      .locator(".cinema-toolbar")
      .getByRole("button", { name: "Chat", exact: true })
      .click();
    await openControls();
    await sound.selectOption("wind");
    await h.waitForTimeout(200);
    assert(
      await h.evaluate(() => window.__loops.at(-2).context.state === "closed"),
    );
    await sound.selectOption("off");
    await h.waitForTimeout(150);
    assert(
      await h.evaluate(() =>
        window.__loops.every((s) => s.context.state === "closed"),
      ),
    );
    await sound.selectOption("rain");
    await h.waitForTimeout(200);
    // Headless Chromium keeps background targets visible even with focus emulation off.
    // Exercise the actual visibility handler with a declared lifecycle fixture.
    await h.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await h.waitForFunction(
      () => window.__loops.at(-1).context.state === "closed",
    );
    await h.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await h.bringToFront();
    assert.equal(await sound.inputValue(), "off");
    checks.push(
      "mode switch closes previous source/context; off/emulated hidden lifecycle stops ambient audio; returning tab never auto-starts",
    );
    const presetBefore = (await api("/rooms/1/state")).room;
    for (const [label, mode] of [
      ["Toàn rạp", "orbit"],
      ["Từ ghế", "first"],
      ["Chính diện", "orbit"],
    ]) {
      await h.getByRole("button", { name: label, exact: true }).click();
      await h.waitForFunction(
        (mode) =>
          document.querySelector(".screen-surface")?.dataset.camera === mode &&
          document.querySelector(".screen-surface")?.dataset.transitioning ===
            "false",
        mode,
      );
    }
    const presetAfter = (await api("/rooms/1/state")).room;
    assert.equal(presetAfter.generation, presetBefore.generation);
    assert.equal(presetAfter.anchor, presetBefore.anchor);
    assert(
      await h.evaluate(
        () =>
          window.__yt === window.__originalPlayer &&
          document.querySelector(".screen-surface iframe") ===
            window.__originalFrame,
      ),
    );
    checks.push(
      "three camera presets settle in supported modes without remounting video or changing room playback",
    );
    if (!(await h.getByLabel("Mức hiệu ứng", { exact: true }).isVisible()))
      await h.locator(".ambience-controls > summary").click();
    await h.getByLabel("Mức hiệu ứng", { exact: true }).selectOption("auto");
    await cmd({ type: "reaction", kind: "flowers" });
    await h.waitForFunction(
      () => document.querySelectorAll(".firework-spark").length === 90,
    );
    await h.evaluate(() => {
      navigator.connection.saveData = true;
      navigator.connection.dispatchEvent(new Event("change"));
    });
    await h.waitForFunction(
      () => document.querySelectorAll(".firework-spark").length === 36,
    );
    await h.getByLabel("Mức hiệu ứng", { exact: true }).selectOption("quiet");
    assert.equal(await h.locator(".fireworks-show").count(), 0);
    assert.equal(
      await h
        .locator(".reaction-symbol")
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
    assert(
      await h
        .getByRole("status", {
          name: "Pháo bông",
          exact: true,
        })
        .isVisible(),
    );
    assert.equal(
      await h.evaluate(() => localStorage.getItem("cinema-effects-v1")),
      "quiet",
    );
    await h.getByLabel("Mức hiệu ứng", { exact: true }).selectOption("full");
    await h.waitForFunction(
      () => document.querySelectorAll(".firework-spark").length === 90,
    );
    await h.evaluate(() => {
      navigator.connection.saveData = false;
      navigator.connection.dispatchEvent(new Event("change"));
    });
    checks.push(
      "Save-Data Auto caps fireworks at 36 sparks; Quiet retains status without particles; explicit Full overrides hint and preferences persist",
    );
    await h.keyboard.press("Escape");
    assert.equal(await controls().getAttribute("aria-pressed"), "false");
    assert(await controls().evaluate((el) => document.activeElement === el));
    await h.setViewportSize({ width: 390, height: 844 });
    await h
      .locator(".cinema-toolbar")
      .getByRole("button", { name: "Chat", exact: true })
      .click();
    await openControls();
    assert(!(await h.locator(".sidebar").isVisible()));
    await h.locator(".room-controls").evaluate((el) => {
      el.scrollTop = 0;
    });
    const closeBox = await h
      .getByRole("button", { name: "Đóng điều khiển", exact: true })
      .boundingBox();
    assert(closeBox.width >= 44 && closeBox.width <= 45);
    const resetBox = await h
      .getByRole("button", { name: "Nhìn màn chiếu", exact: true })
      .boundingBox();
    assert(resetBox.width >= 44 && resetBox.width <= 45);
    const bounds = await h.locator(".room-controls").boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    await h.screenshot({ path: path.join(shots, "controls-mobile.png") });
    await h
      .locator(".cinema-toolbar")
      .getByRole("button", { name: "Playlist", exact: true })
      .click();
    assert.equal(await controls().getAttribute("aria-pressed"), "false");
    checks.push(
      "Escape closes and restores focus; mobile sheets are exclusive; 390px controls fit viewport",
    );
    await h.setViewportSize({ width: 1280, height: 900 });
    await openControls();
    if (!(await sound.isVisible()))
      await h.locator(".ambience-controls > summary").click();
    await sound.selectOption("wind");
    await h.waitForTimeout(200);
    await cmd({ type: "close" });
    await h.waitForFunction(() =>
      window.__loops.every((s) => s.context.state === "closed"),
    );
    session = undefined;
    checks.push("leaving room disposes every ambient context/source");
    assert.deepEqual(errors, []);
    const report = {
      passed: true,
      checks,
      lightingPixels: { normal, dim },
      pageErrors: errors,
      limitations:
        "Real Chromium WebAudio nodes and scene pixels, mocked YouTube/device speech and emulated tab visibility; no acoustic, hearing, physical GPU or voice-quality certification.",
    };
    fs.writeFileSync(
      path.join(__dirname, "../evidence/experience.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (session) await cmd({ type: "close" }).catch(() => {});
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
