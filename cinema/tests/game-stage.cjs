// Local Worker and actual Three/WebAudio. YouTube and Vietnamese speech are declared fixtures.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const {
  chromium,
  executablePath,
  openActions,
} = require("./browser-runtime.cjs");
const base = "http://localhost:8787",
  shots = process.env.CINEMA_SCREENSHOT_DIR || "/tmp/cinema-game-stage";
fs.mkdirSync(shots, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
      "--autoplay-policy=no-user-gesture-required",
    ],
  });
  const h = await browser.newPage({ viewport: { width: 1280, height: 900 } }),
    g = await browser.newPage({ viewport: { width: 1280, height: 900 } }),
    pages = [h, g],
    checks = [],
    errors = [],
    screenshots = [];
  let session;
  const api = async (p, route, data) => {
    const r = await p.request.fetch(base + "/api" + route, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    const b = await r.json();
    assert.equal(r.status(), 200, JSON.stringify(b));
    return b;
  };
  const state = async (p = h) => (await api(p, "/rooms/1/state")).room;
  const cmd = (p, command) =>
    api(p, "/rooms/1/command", {
      session,
      commandId: crypto.randomUUID(),
      command,
    });
  const game = async (p, operation) =>
    cmd(p, {
      type: "game",
      expectedRevision: (await state(p)).gameRevision || 0,
      operation,
    });
  const panel = (p) =>
    p.getByRole("region", { name: "Trò chơi dân gian", exact: true });
  const open = async (p) => {
    if (!(await panel(p).isVisible())) {
      await openActions(p);
      await p
        .getByRole("button", { name: "Trò chơi dân gian", exact: true })
        .click();
      await panel(p).waitFor();
    }
  };
  const record = (c) => {
    checks.push(c);
    console.log("PASS " + c);
  };
  const shot = async (name) => {
    await h.screenshot({ path: path.join(shots, name) });
    screenshots.push(name);
  };
  try {
    for (const p of pages) {
      p.setDefaultTimeout(30000);
      p.on("pageerror", (e) => errors.push(e.message));
      p.on("dialog", (d) => d.accept());
      await p.addInitScript(() => {
        window.SpeechSynthesisUtterance = class {
          constructor(text) {
            this.text = text;
          }
        };
        const voice = {
          lang: "vi-VN",
          name: "Vietnamese voice fixture",
          voiceURI: "fixture",
          default: true,
        };
        window.__spoken = [];
        window.__voice = null;
        window.__hidden = false;
        window.__oscillators = [];
        window.__contexts = [];
        window.__sockets = [];
        Object.defineProperty(document, "hidden", {
          configurable: true,
          get: () => window.__hidden,
        });
        Object.defineProperty(window, "speechSynthesis", {
          configurable: true,
          value: {
            getVoices: () => [voice],
            addEventListener() {},
            removeEventListener() {},
            resume() {},
            speak(u) {
              window.__voice = u;
              window.__spoken.push(u.text);
              setTimeout(() => u.onstart?.(new Event("start")), 5);
            },
            cancel() {
              const old = window.__voice;
              window.__voice = null;
              const callback = old?.onerror;
              setTimeout(() => callback?.(new Event("error")), 20);
            },
          },
        });
        window.__finishVoice = () => {
          const u = window.__voice;
          window.__voice = null;
          u?.onend?.(new Event("end"));
        };
        const AC = window.AudioContext;
        window.AudioContext = class extends AC {
          constructor(...args) {
            super(...args);
            window.__contexts.push(this);
          }
          createOscillator() {
            const o = super.createOscillator();
            window.__oscillators.push(o);
            return o;
          }
        };
        const WS = window.WebSocket;
        window.WebSocket = class extends WS {
          constructor(...a) {
            super(...a);
            window.__sockets.push(this);
          }
        };
      });
      await p.route("https://www.youtube.com/iframe_api", (r) =>
        r.fulfill({
          contentType: "application/javascript",
          body: `window.YT={Player:class{constructor(el,c){this.v='';this.t=0;this.at=performance.now();this.s=2;this.vol=80;this.m=false;window.__yt=this;el.innerHTML='<iframe title="3D game media fixture"></iframe>';setTimeout(()=>c.events.onReady(),0)}getCurrentTime(){return this.t+(this.s===1?(performance.now()-this.at)/1000:0)}loadVideoById(v){this.v=v.videoId;this.t=v.startSeconds;this.at=performance.now();this.s=1}cueVideoById(v){this.loadVideoById(v);this.s=2}getPlayerState(){return this.s}getDuration(){return 10000}getVideoData(){return{video_id:this.v}}getVolume(){return this.vol}setVolume(v){this.vol=v}mute(){this.m=true}unMute(){this.m=false}isMuted(){return this.m}seekTo(t){this.t=t;this.at=performance.now()}playVideo(){this.t=this.getCurrentTime();this.at=performance.now();this.s=1}pauseVideo(){this.t=this.getCurrentTime();this.at=performance.now();this.s=2}destroy(){}}};window.onYouTubeIframeAPIReady();`,
        }),
      );
      await api(p, "/session", {});
      await p.goto(base);
    }
    assert(
      (await api(h, "/rooms")).every((r) => !r.open),
      "Preserve occupied local rooms",
    );
    await h
      .locator(".room-card")
      .first()
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    await h.getByPlaceholder("Mọi người gọi bạn là…").fill("3D host");
    await h.getByLabel("Tên phòng mới").fill("3D experience QA");
    await h
      .getByRole("dialog", { name: "Tạo phòng mới", exact: true })
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    await h
      .getByLabel("Link video / nhạc để bắt đầu")
      .fill("https://youtu.be/jfKfPfyJRdk");
    await h.getByLabel("Link video / nhạc để bắt đầu").press("Enter");
    session = (await state()).session;
    await g.reload();
    await g
      .locator(".room-card")
      .first()
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await g.getByPlaceholder("Mọi người gọi bạn là…").fill("3D guest");
    await g
      .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await h
      .getByRole("dialog", { name: "Yêu cầu vào phòng" })
      .getByRole("button", { name: "Cho vào", exact: true })
      .click();
    await cmd(h, { type: "sit", instant: true });
    await cmd(g, { type: "sit", instant: true });
    await h.waitForFunction(
      () => window.__yt?.v && document.querySelector(".scene canvas"),
    );
    await h.getByRole("button", { name: "Hold cá nhân", exact: true }).click();
    await h.waitForFunction(() => window.__yt.isMuted());
    await h.evaluate(() => {
      window.__originalCanvas = document.querySelector(".scene canvas");
      window.__originalFrame = document.querySelector(".screen-surface iframe");
      window.__originalYT = window.__yt;
    });
    for (const p of pages) {
      await p
        .locator(".cinema-toolbar")
        .getByRole("button", { name: "Chat", exact: true })
        .click();
      if (
        (await p.locator(".tts-toggle").getAttribute("aria-pressed")) === "true"
      )
        await p.locator(".tts-toggle").click();
      await p
        .locator(".cinema-toolbar")
        .getByRole("button", { name: "Chat", exact: true })
        .click();
    }
    await open(h);
    await panel(h)
      .getByRole("button", { name: "Ô ăn quan", exact: true })
      .click();
    await open(g);
    await panel(g)
      .getByRole("button", { name: "Tham gia ván", exact: true })
      .click();
    await panel(h)
      .getByRole("button", { name: "Bắt đầu ván", exact: true })
      .click();
    await panel(h).getByRole("button", { name: "Bàn 3D", exact: true }).click();
    await h.waitForFunction(
      () => document.querySelector(".scene canvas")?.dataset.gamePitTargets,
    );
    await h.waitForTimeout(1800);
    assert(
      await h.evaluate(
        () =>
          document.querySelector(".scene canvas") === window.__originalCanvas &&
          window.__yt === window.__originalYT &&
          window.__yt.isMuted() &&
          document.querySelector(".screen-surface iframe") ===
            window.__originalFrame,
      ),
    );
    const frames = () =>
      h.evaluate(() =>
        Number(document.querySelector(".scene canvas").dataset.gameFrame),
      );
    let start = await frames(),
      at = Date.now();
    await h.getByLabel("Ô muốn rải").selectOption("2");
    await h.waitForTimeout(1200);
    const selection = {
      frames: (await frames()) - start,
      windowMs: Date.now() - at,
    };
    assert(selection.frames <= 3, JSON.stringify(selection));
    start = await frames();
    at = Date.now();
    await g.evaluate(async (session) => {
      for (let i = 0; i < 16; i++) {
        window.__sockets
          .at(-1)
          .send(
            JSON.stringify({
              type: "look",
              session,
              yaw: i % 2 ? 35 : -35,
              pitch: 0,
              bodyYaw: 0,
            }),
          );
        await new Promise((r) => setTimeout(r, 125));
      }
    }, session);
    await h.waitForTimeout(1200);
    const peerLook = {
      frames: (await frames()) - start,
      windowMs: Date.now() - at,
    };
    assert(peerLook.frames <= 2, JSON.stringify(peerLook));
    fs.writeFileSync(
      "evidence/game-performance.json",
      JSON.stringify(
        {
          passed: true,
          date: new Date().toISOString(),
          baseline: {
            selection: { frames: 22, windowMs: 1219 },
            peerLook: { frames: 65, windowMs: 3389 },
          },
          after: { selection, peerLook },
          scenario:
            "Two real profiles; selected Oaq pit; 16 peer WS gaze updates at 125ms, 1200ms settle. Reproduce: tests/game-stage.cjs.",
          limitations:
            "Local SwiftShader frame counter, not physical FPS, battery, thermal or M1 certification. Baseline captured before optimization on 15 November 2026.",
        },
        null,
        2,
      ) + "\n",
    );
    record(
      "pit selection is static; 16 live peer gaze updates do not animate the hidden cinema or game GPU",
    );
    const revision = (await state()).gameRevision;
    const pick = await h.evaluate(() =>
      JSON.parse(
        document.querySelector(".scene canvas").dataset.gamePitTargets,
      ).find((p) => p.pit === 1),
    );
    const box = await h.locator(".scene canvas").boundingBox();
    await h.mouse.click(box.x + pick.x, box.y + pick.y);
    await h.waitForFunction(
      () => document.querySelector('[aria-label="Ô muốn rải"]')?.value === "1",
    );
    await panel(h)
      .getByRole("button", { name: "↺ Rải ngược chiều", exact: true })
      .click();
    assert((await state()).gameRevision > revision);
    await g.waitForFunction(() =>
      document.querySelector(".game-turn")?.textContent.includes("3D guest"),
    );
    record(
      "actual shared-context 3D picking issues a valid server move; second profile receives turn; native iframe/renderer identity preserved",
    );
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 320, height: 640 },
      { width: 844, height: 390 },
    ]) {
      await h.setViewportSize(viewport);
      await h.waitForTimeout(1600);
      const layout = await h.evaluate(() => {
        const c = document
            .querySelector(".scene canvas")
            .getBoundingClientRect(),
          p = document.querySelector(".game-sheet").getBoundingClientRect();
        return {
          c: c.toJSON(),
          p: p.toJSON(),
          width: document.documentElement.scrollWidth,
          ctx: document.querySelectorAll(".scene canvas").length,
        };
      });
      assert(
        layout.ctx === 1 &&
          layout.width <= viewport.width &&
          layout.c.width > 180 &&
          layout.c.height > 120,
        JSON.stringify(layout),
      );
      assert(
        layout.c.right <= layout.p.left + 1 ||
          layout.c.bottom <= layout.p.top + 1,
        JSON.stringify(layout),
      );
      await shot(`game3d-oaq-${viewport.width}.png`);
    }
    await h.setViewportSize({ width: 1280, height: 900 });
    await h.locator(".game-angle>summary").click();
    await h.getByLabel("Xoay bàn 3D").fill("20");
    await h.waitForTimeout(1600);
    const idle = await h
      .locator(".scene canvas")
      .getAttribute("data-game-frame");
    await h.waitForTimeout(1200);
    assert.equal(
      await h.locator(".scene canvas").getAttribute("data-game-frame"),
      idle,
    );
    await h.emulateMedia({ reducedMotion: "reduce" });
    await h.getByLabel("Xoay bàn 3D").fill("0");
    await h.waitForTimeout(400);
    const quiet = await h
      .locator(".scene canvas")
      .getAttribute("data-game-frame");
    await h.waitForTimeout(500);
    assert.equal(
      await h.locator(".scene canvas").getAttribute("data-game-frame"),
      quiet,
    );
    await h.emulateMedia({ reducedMotion: "no-preference" });
    await panel(h)
      .getByRole("button", { name: "Bàn phẳng", exact: true })
      .click();
    await panel(h).locator(".oaq-board").waitFor();
    assert(
      await h.evaluate(
        () =>
          document.querySelector(".scene canvas") === window.__originalCanvas,
      ),
    );
    await h.waitForTimeout(2000);
    const released = [];
    for (let i = 0; i < 2; i++) {
      await panel(h)
        .getByRole("button", { name: "Bàn 3D", exact: true })
        .click();
      await h.waitForFunction(
        () =>
          document.querySelector(".scene canvas")?.dataset.gameKind === "oaq",
      );
      await h.waitForTimeout(1000);
      await panel(h)
        .getByRole("button", { name: "Bàn phẳng", exact: true })
        .click();
      await h.waitForTimeout(2000);
      released.push(
        await h.evaluate(() =>
          JSON.parse(
            document.querySelector(".scene canvas").dataset.renderStats,
          ),
        ),
      );
    }
    assert(
      released[1].textures <= released[0].textures + 1 &&
        released[1].geometries <= released[0].geometries + 1,
      JSON.stringify(released),
    );
    assert(await h.evaluate(() => window.__yt.isMuted()));
    record(
      "320px/landscape/desktop fit; finite motion and reduced motion settle to zero idle frames; two 3D/flat cycles release resources and preserve Hold/context",
    );
    await game(h, { action: "close" });
    await game(h, { action: "open", kind: "loto" });
    await game(g, { action: "join" });
    await game(h, { action: "start" });
    await panel(h).getByRole("button", { name: "Bàn 3D", exact: true }).click();
    await h.waitForFunction(
      () =>
        document.querySelector(".scene canvas")?.dataset.gameKind === "loto",
    );
    await h.waitForTimeout(1500);
    await shot("game3d-loto-1280.png");
    await panel(h).locator(".loto-voice>summary").click();
    await h.getByLabel("Hô số lô tô").selectOption("festive");
    await h
      .getByRole("button", { name: "Nghe thử hô số", exact: true })
      .click();
    await h.waitForFunction(
      () => window.__voice && window.__oscillators.length >= 6,
    );
    assert.equal((await state()).game.drawn.length, 0);
    assert.match(await h.evaluate(() => window.__voice.text), /Số bảy!/);
    await h.evaluate(() => window.__finishVoice());
    await g.bringToFront();
    await open(g);
    await panel(g).locator(".loto-voice>summary").click();
    await g.getByLabel("Hô số lô tô").selectOption("number");
    await h.bringToFront();
    await game(h, { action: "draw" });
    await h.waitForFunction(() => window.__voice?.text.includes("Số"));
    await g.waitForFunction(() => window.__voice?.text.startsWith("Số"));
    await h.waitForFunction(() => window.__yt.vol === 20);
    const st = await state(),
      gt = await state(g);
    assert(!st.game.secrets && !gt.game.secrets);
    assert.notDeepEqual(st.game.ticket, gt.game.ticket);
    const count = await h.evaluate(() => window.__spoken.length);
    await cmd(g, { type: "chat", text: "chat does not replay lottery" });
    await h.waitForTimeout(300);
    assert.equal(await h.evaluate(() => window.__spoken.length), count);
    await game(h, { action: "pause" });
    await h.waitForFunction(() => window.__voice === null);
    await g.waitForFunction(() => window.__voice === null);
    await game(h, { action: "resume" });
    await h.waitForFunction(() => window.__yt.vol === 80);
    await h.waitForTimeout(200);
    assert.equal(await h.evaluate(() => window.__spoken.length), count);
    record(
      "loto 3D shows only own ticket; opt-in voice/finite real WebAudio cue; latest draw speaks once on both profiles, chat revisions and pause/resume never replay",
    );
    await h
      .getByRole("button", { name: "Đóng bảng trò chơi", exact: true })
      .click();
    await h
      .locator(".cinema-toolbar")
      .getByRole("button", { name: "Chat", exact: true })
      .click();
    await h.locator(".tts-toggle").click();
    await h.waitForFunction(() => window.__voice);
    await h.evaluate(() => window.__finishVoice());
    await cmd(g, { type: "chat", text: "Lời chat trước khi gọi số" });
    await h.waitForFunction(() => window.__voice?.text.includes("Lời chat"));
    await h.waitForTimeout(3100);
    await game(h, { action: "draw" });
    await h.waitForFunction(() => window.__voice?.text.includes("Số"));
    await cmd(g, { type: "chat", text: "Lời chat chờ sau tiếng hô" });
    await h.waitForTimeout(200);
    assert(
      !(await h.evaluate(() =>
        window.__spoken.some((t) => t.includes("Lời chat chờ")),
      )),
    );
    const queuedAt = await h.evaluate(() => window.__spoken.length);
    await h.waitForTimeout(3100);
    await game(h, { action: "draw" });
    await h.waitForFunction((n) => window.__spoken.length > n, queuedAt);
    assert(
      !(await h.evaluate(() =>
        window.__spoken.some((t) => t.includes("Lời chat chờ")),
      )),
    );
    await h.evaluate(() => window.__finishVoice());
    await h.waitForFunction(() =>
      window.__voice?.text.includes("Lời chat chờ"),
    );
    await h.evaluate(() => window.__finishVoice());
    record(
      "lottery voice preempts active chat safely; replacement draw preserves deferred chat without briefly starting it; resumes after final call, no stale cancellation",
    );
    const beforeSnapshot = await h.evaluate(() => window.__spoken.length);
    const socketCount = await h.evaluate(() => window.__sockets.length);
    await h.evaluate(() => window.__sockets.at(-1).close());
    await h.waitForFunction(
      (n) =>
        window.__sockets.length > n && window.__sockets.at(-1).readyState === 1,
      socketCount,
    );
    await h.waitForTimeout(600);
    assert.equal(
      await h.evaluate(() => window.__spoken.length),
      beforeSnapshot,
    );
    await h.evaluate(() => {
      window.__hidden = true;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await h.waitForTimeout(3100);
    await game(h, { action: "draw" });
    await h.waitForTimeout(250);
    assert.equal(
      await h.evaluate(() => window.__spoken.length),
      beforeSnapshot,
    );
    await h.evaluate(() => {
      window.__hidden = false;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await h.waitForTimeout(200);
    assert.equal(
      await h.evaluate(() => window.__spoken.length),
      beforeSnapshot,
    );
    await game(h, { action: "pause" });
    await g.evaluate(() => window.__finishVoice());
    assert.deepEqual(errors, []);
    record(
      "reconnect baseline and hidden/visible updates do not replay missed calls; pause/close ownership cleanup has zero page errors",
    );
    fs.writeFileSync(
      "evidence/game-stage.json",
      JSON.stringify(
        {
          passed: true,
          date: new Date().toISOString(),
          checks,
          screenshots,
          limitations:
            "Actual local Worker/Three/WebGL/context and WebAudio nodes; software GPU/emulated viewports. YouTube and Vietnamese speech are explicit fixtures, visibility override is a lifecycle fixture; not physical device, acoustic quality or recorded singing certification.",
        },
        null,
        2,
      ) + "\n",
    );
  } catch (e) {
    for (const [i, p] of pages.entries())
      if (!p.isClosed())
        await p
          .screenshot({ path: path.join(shots, `game3d-failure-${i}.png`) })
          .catch(() => {});
    console.error(e);
    console.error(errors);
    console.error(
      await h
        .locator("body")
        .innerText()
        .catch(() => ""),
    );
    process.exitCode = 1;
  } finally {
    if (session) await cmd(h, { type: "close" }).catch(() => {});
    await browser.close();
  }
})();
