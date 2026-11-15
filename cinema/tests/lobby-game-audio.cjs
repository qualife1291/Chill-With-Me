// Local Worker, genuine WebAudio; Vietnamese synthesis/visibility are declared lifecycle fixtures.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const {
  chromium,
  executablePath,
  openActions,
} = require("./browser-runtime.cjs");
const base = "http://localhost:8787",
  shots = process.env.CINEMA_SCREENSHOT_DIR || "/tmp/cinema-lobby-audio";
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
    g = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const checks = [],
    screenshots = [],
    errors = [];
  let session;
  const api = async (p, route, data) => {
    const r = await p.request.fetch(base + "/api" + route, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    const body = await r.json();
    assert.equal(r.status(), 200, JSON.stringify(body));
    return body;
  };
  const state = async (p = h) => (await api(p, "/rooms/3/state")).room;
  const cmd = (p, command) =>
    api(p, "/rooms/3/command", {
      session,
      commandId: crypto.randomUUID(),
      command,
    });
  const game = async (operation, p = h) =>
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
  const record = (s) => {
    checks.push(s);
    console.log("PASS " + s);
  };
  const shot = async (name) => {
    await h.screenshot({ path: path.join(shots, name), fullPage: true });
    screenshots.push(name);
  };
  const stopped = async () =>
    h.waitForFunction(() => window.__buffers.every((n) => n.stopped));
  const playing = async () =>
    h.waitForFunction(() => window.__buffers.some((n) => n.loop && !n.stopped));
  try {
    for (const p of [h, g]) {
      p.setDefaultTimeout(30000);
      p.on("pageerror", (e) => errors.push(e.message));
      p.on("dialog", (d) => d.accept());
      await p.addInitScript(() => {
        window.__buffers = [];
        window.__gains = [];
        window.__osc = [];
        window.__contexts = [];
        window.__hidden = false;
        Object.defineProperty(document, "hidden", {
          configurable: true,
          get: () => window.__hidden,
        });
        const AC = window.AudioContext;
        window.AudioContext = class extends AC {
          constructor(...a) {
            super(...a);
            window.__contexts.push(this);
          }
          createBufferSource() {
            const n = super.createBufferSource(),
              stop = n.stop.bind(n);
            n.stopped = false;
            n.stop = (...a) => {
              n.stopped = true;
              return stop(...a);
            };
            window.__buffers.push(n);
            return n;
          }
          createGain() {
            const n = super.createGain();
            window.__gains.push(n);
            return n;
          }
          createOscillator() {
            const n = super.createOscillator();
            window.__osc.push(n);
            return n;
          }
        };
        window.SpeechSynthesisUtterance = class {
          constructor(text) {
            this.text = text;
          }
        };
        Object.defineProperty(window, "speechSynthesis", {
          configurable: true,
          value: {
            getVoices: () => [
              {
                lang: "vi-VN",
                voiceURI: "fixture",
                name: "Vietnamese fixture",
                default: true,
              },
            ],
            addEventListener() {},
            removeEventListener() {},
            resume() {},
            speak(u) {
              window.__voice = u;
              setTimeout(() => u.onstart?.(new Event("start")), 5);
            },
            cancel() {
              const old = window.__voice;
              window.__voice = null;
              old?.onerror?.(new Event("error"));
            },
          },
        });
        window.__finishVoice = () => {
          const old = window.__voice;
          window.__voice = null;
          old?.onend?.(new Event("end"));
        };
      });
      await api(p, "/session", {});
      await p.goto(base);
    }
    assert(
      (await api(h, "/rooms")).every((r) => !r.open),
      "Preserve occupied rooms",
    );
    const invalid = await h.request.post(base + "/api/rooms/3/create", {
      headers: { Origin: base },
      data: { name: "Host", title: "Bad", capacity: 6, activity: "casino" },
    });
    assert.equal(invalid.status(), 400);
    assert((await api(h, "/rooms")).every((r) => !r.open));
    assert.equal(await h.getByRole("dialog").count(), 0);
    for (const v of [
      { width: 1280, height: 900 },
      { width: 320, height: 640 },
      { width: 844, height: 390 },
    ]) {
      await h.setViewportSize(v);
      await h.locator(".lobby-activities").scrollIntoViewIfNeeded();
      assert(
        await h.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const boxes = await h
        .locator(".lobby-activities .activity-option")
        .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
      assert(boxes.every((b) => b.width >= 44 && b.height >= 44));
      await shot(`lobby-activity-${v.width}.png`);
    }
    await h
      .getByRole("button", { name: "Khám phá phòng 03", exact: true })
      .click();
    await h
      .getByRole("button", { name: "Chơi Ô ăn quan", exact: true })
      .click();
    const dialog = h.getByRole("dialog", {
      name: "Tạo phòng mới",
      exact: true,
    });
    assert.equal(
      await dialog.locator("input").count(),
      1,
      "quick entry mounts only the name input",
    );
    assert.equal(
      await dialog.locator("canvas").count(),
      0,
      "optional avatar renderer stays unmounted",
    );
    await h.setViewportSize({ width: 320, height: 640 });
    await shot("lobby-create-game-320.png");
    await h.getByPlaceholder("Mọi người gọi bạn là…").fill("Lobby host");
    await dialog
      .locator("summary")
      .filter({ hasText: "Tùy chọn phòng" })
      .click();
    await h.getByLabel("Tên phòng mới").fill("Game night");
    await dialog
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    await panel(h).waitFor();
    session = (await state()).session;
    assert.equal((await state()).game.kind, "oaq");
    assert.equal((await state()).game.phase, "lobby");
    assert.equal((await state()).current, null);
    assert.equal(await h.getByLabel("Link video / nhạc để bắt đầu").count(), 0);
    const summary = (await api(g, "/rooms"))[2];
    assert.equal(summary.activity, "oaq");
    await g.reload();
    await g
      .locator(".room-card")
      .nth(2)
      .getByRole("button", { name: "Chơi cùng", exact: true })
      .click();
    assert.equal(await g.locator('input[name="entry-activity"]').count(), 0);
    await g.getByPlaceholder("Mọi người gọi bạn là…").fill("Lobby guest");
    await g
      .getByRole("dialog", { name: "Thông tin vào phòng" })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    const pending = await api(g, "/rooms/3/state");
    assert.equal(pending.status, "pending");
    assert(!pending.room);
    await h
      .getByRole("dialog", { name: "Yêu cầu vào phòng" })
      .getByRole("button", { name: "Cho vào", exact: true })
      .click();
    await panel(g).waitFor();
    assert.equal(
      (await state(g)).game.players.length,
      2,
      "approval atomically joins the chosen game",
    );
    assert.equal(
      await panel(g)
        .getByRole("button", { name: "Tham gia ván", exact: true })
        .count(),
      0,
    );
    record(
      "one-click lobby game creation, compact optional setup; invalid activity creates nothing; one create request opens host game lobby; approval atomically enrolls play intent",
    );
    await h.setViewportSize({ width: 1280, height: 900 });
    await panel(h)
      .getByRole("button", { name: "Âm ván: tắt", exact: true })
      .click();
    const before = await h.evaluate(() => window.__osc.length);
    await panel(h)
      .getByRole("button", { name: "Bắt đầu ván", exact: true })
      .click();
    await h.waitForFunction((n) => window.__osc.length >= n + 4, before);
    await panel(h).locator(".game-music>summary").click();
    await h.getByLabel("Nhạc nền trò chơi").selectOption("garden");
    await playing();
    const audio = await h.evaluate(() => ({
      contexts: window.__contexts.length,
      buffers: window.__buffers.length,
      rate: window.__buffers.at(-1).buffer.sampleRate,
      length: window.__buffers.at(-1).buffer.length,
      channels: window.__buffers.at(-1).buffer.numberOfChannels,
    }));
    assert.deepEqual(audio, {
      contexts: 1,
      buffers: 1,
      rate: 24000,
      length: 288000,
      channels: 1,
    });
    await h.getByLabel("Âm lượng nhạc game").fill("24");
    await h.waitForTimeout(300);
    assert.equal(await h.evaluate(() => window.__buffers.length), 1);
    await panel(g).locator(".game-music>summary").click();
    assert.equal(await g.getByLabel("Nhạc nền trò chơi").inputValue(), "off");
    await panel(h)
      .getByRole("button", { name: "Ô A1, 5 dân", exact: true })
      .click();
    const selected = await h.evaluate(() => window.__osc.length);
    await panel(h)
      .getByRole("button", { name: "↺ Rải ngược chiều", exact: true })
      .click();
    await h.waitForFunction((n) => window.__osc.length > n, selected);
    await shot("game-music-desktop.png");
    await h.setViewportSize({ width: 320, height: 640 });
    await h.getByLabel("Nhạc nền trò chơi").scrollIntoViewIfNeeded();
    await shot("game-music-320.png");
    assert(
      await h.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await h.setViewportSize({ width: 1280, height: 900 });
    await h.getByRole("button", { name: "Hold cá nhân", exact: true }).click();
    await playing();
    await game({ action: "pause" });
    await stopped();
    await game({ action: "resume" });
    await playing();
    await h.evaluate(() => {
      window.__hidden = true;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await stopped();
    await h.evaluate(() => {
      window.__hidden = false;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await playing();
    record(
      "game start/selection/capture use real WebAudio; personal music shares one context and one mono 12s loop; volume does not restart; Hold preserves music; pause/hidden stop and resume cleanly",
    );
    await game({ action: "close" });
    await stopped();
    await game({ action: "open", kind: "loto" });
    await game({ action: "join" }, g);
    await game({ action: "start" });
    await h.waitForFunction(() =>
      document
        .querySelector(".game-sheet header")
        ?.textContent.includes("Lô tô"),
    );
    assert.equal(await h.getByLabel("Nhạc nền trò chơi").inputValue(), "off");
    if (!(await h.getByLabel("Nhạc nền trò chơi").isVisible()))
      await panel(h).locator(".game-music>summary").click();
    await h.getByLabel("Nhạc nền trò chơi").selectOption("festival");
    await playing();
    await panel(h).locator(".loto-voice>summary").click();
    await h.getByLabel("Hô số lô tô").selectOption("number");
    await game({ action: "draw" });
    await h.waitForFunction(() => window.__voice?.text.startsWith("Số"));
    await h.waitForTimeout(350);
    assert(
      await h.evaluate(() =>
        window.__gains.some((g) => Math.abs(g.gain.value - 0.09) < 0.005),
      ),
      "music ducks to quarter at voice start",
    );
    await h.evaluate(() => window.__finishVoice());
    await h.waitForTimeout(500);
    assert(
      await h.evaluate(() =>
        window.__gains.some((g) => Math.abs(g.gain.value - 0.36) < 0.005),
      ),
      "music restores after speech",
    );
    await openActions(h);
    await h
      .getByRole("button", { name: "Âm thanh tương tác: Bật", exact: true })
      .click();
    await stopped();
    await h
      .getByRole("button", { name: "Âm thanh tương tác: Tắt", exact: true })
      .click();
    await playing();
    await open(h);
    if (!(await h.getByLabel("Nhạc nền trò chơi").isVisible()))
      await panel(h).locator(".game-music>summary").click();
    await h.evaluate(async () => {
      const ctx = window.__contexts[0];
      window.__realResume = ctx.resume.bind(ctx);
      await ctx.suspend();
      ctx.resume = () => new Promise(() => {});
    });
    await h.getByLabel("Nhạc nền trò chơi").selectOption("garden");
    await h
      .getByRole("button", { name: "Thử bật nhạc lại", exact: true })
      .waitFor();
    assert(
      await h
        .getByRole("status")
        .filter({ hasText: "Thiết bị chưa bật được âm thanh" })
        .isVisible(),
    );
    await stopped();
    await h.evaluate(() => {
      window.__contexts[0].resume = window.__realResume;
    });
    await h
      .getByRole("button", { name: "Thử bật nhạc lại", exact: true })
      .click();
    await playing();
    record(
      "pending audio resume is bounded; explicit retry recovers on the same context without queued or duplicated music",
    );
    await cmd(h, { type: "close" });
    session = undefined;
    await stopped();
    assert.deepEqual(errors, []);
    record(
      "new game resets music off; fresh lottery call ducks/restores native loop; master mute and room close stop all sources; zero page errors",
    );
    fs.writeFileSync(
      "evidence/lobby-game-audio.json",
      JSON.stringify(
        {
          passed: true,
          date: new Date().toISOString(),
          checks,
          screenshots,
          audio,
          limitations:
            "Real local Worker/WebAudio, software GPU and emulated viewports; Vietnamese synthesis/visibility are lifecycle fixtures, not acoustic quality, physical battery or hardware certification.",
        },
        null,
        2,
      ) + "\n",
    );
  } catch (e) {
    await h
      .screenshot({ path: path.join(shots, "lobby-audio-failure.png") })
      .catch(() => {});
    console.error(e, errors);
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
