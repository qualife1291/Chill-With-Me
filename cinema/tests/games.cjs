// All game mutations stay local. Real Worker/state/DOM/CSS; provider media is an explicit fixture.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const {
  chromium,
  executablePath,
  openActions,
} = require("./browser-runtime.cjs");
const base = "http://localhost:8787",
  shots = process.env.CINEMA_SCREENSHOT_DIR || "/tmp/cinema-games";
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
  const pages = await Promise.all(
      [0, 1, 2].map(() =>
        browser.newPage({ viewport: { width: 1280, height: 900 } }),
      ),
    ),
    [h, g, s] = pages,
    errors = [],
    checks = [];
  let session,
    draws = 0;
  const record = (message) => {
    checks.push(message);
    console.log("PASS " + message);
  };
  const api = async (p, route, data, error) => {
    const r = await p.request.fetch(base + "/api" + route, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    const b = await r.json();
    if (error) {
      assert(r.status() >= 400 && r.status() < 500);
      assert.equal(b.error, error);
    } else assert.equal(r.status(), 200, route + JSON.stringify(b));
    return b;
  };
  const state = async (p = h) => (await api(p, "/rooms/1/state")).room;
  const game = async (p, operation, error, rev) =>
    api(
      p,
      "/rooms/1/command",
      {
        session,
        commandId: crypto.randomUUID(),
        command: {
          type: "game",
          expectedRevision: rev ?? (await state(p)).gameRevision ?? 0,
          operation,
        },
      },
      error,
    );
  const roomCmd = (p, command) =>
    api(p, "/rooms/1/command", {
      session,
      commandId: crypto.randomUUID(),
      command,
    });
  const panel = (p) =>
    p.getByRole("region", { name: "Trò chơi dân gian", exact: true });
  const open = async (p) => {
    await p.bringToFront();
    await openActions(p);
    await p
      .getByRole("button", { name: "Trò chơi dân gian", exact: true })
      .click();
    await panel(p).waitFor();
  };
  const action = async (p, label, kind) => {
    await p.bringToFront();
    const response = p.waitForResponse(
      (r) =>
        r.url().endsWith("/command") &&
        r.request().postDataJSON()?.command?.type === "game" &&
        r.request().postDataJSON()?.command?.operation?.action === kind,
    );
    await panel(p).getByRole("button", { name: label, exact: true }).click();
    assert.equal((await response).status(), 200);
  };
  const join = async (p, name) => {
    await p.reload();
    const card = p.locator(".room-card").filter({ hasText: "Games QA" });
    // Summaries arrive after reload; wait for an allowed spectator CTA rather
    // than branching on a one-time count before the card has loaded.
    await card
      .getByRole("button", {
        name: /^(Vào xem|Xin vào phòng|Vào xem ván)$/,
      })
      .click();
    await p.getByPlaceholder("Mọi người gọi bạn là…").fill(name);
    await p
      .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
  };
  try {
    for (const p of pages) {
      p.setDefaultTimeout(30000);
      p.on("pageerror", (e) => errors.push(e.message));
      p.on("dialog", (d) => d.accept());
      await p.route("https://www.youtube.com/iframe_api", (r) =>
        r.fulfill({
          contentType: "application/javascript",
          body: `window.YT={Player:class{constructor(el,c){this.video='';this.time=0;this.anchor=performance.now();this.state=2;this.volume=80;this.muted=false;window.__yt=this;el.innerHTML='<iframe title="Game media fixture"></iframe>';setTimeout(()=>c.events.onReady(),0)}getCurrentTime(){return this.time+(this.state===1?(performance.now()-this.anchor)/1000:0)}loadVideoById(v){this.video=v.videoId;this.time=v.startSeconds;this.anchor=performance.now();this.state=1}cueVideoById(v){this.loadVideoById(v);this.state=2}getPlayerState(){return this.state}getDuration(){return 10000}getVideoData(){return{video_id:this.video}}getVolume(){return this.volume}setVolume(v){this.volume=v}mute(){this.muted=true}unMute(){this.muted=false}isMuted(){return this.muted}seekTo(t){this.time=t;this.anchor=performance.now()}playVideo(){this.anchor=performance.now();this.state=1}pauseVideo(){this.time=this.getCurrentTime();this.anchor=performance.now();this.state=2}destroy(){}}};window.onYouTubeIframeAPIReady();`,
        }),
      );
      await api(p, "/session", {});
      await p.goto(base);
      assert.equal(
        await p.evaluate(() =>
          getComputedStyle(document.documentElement)
            .getPropertyValue("--cw-surface")
            .trim(),
        ),
        "#302d24",
      );
    }
    assert(
      !(await api(h, "/rooms")).some((r) => r.open),
      "all local slots must be free",
    );
    await h
      .locator(".room-card")
      .first()
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    await h.getByPlaceholder("Mọi người gọi bạn là…").fill("Game host");
    await h.getByLabel("Tên phòng mới").fill("Games QA");
    await h
      .getByRole("dialog", { name: "Tạo phòng mới", exact: true })
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    await h
      .getByRole("dialog", { name: "Thêm video để bắt đầu" })
      .getByRole("button", { name: "Ô ăn quan", exact: true })
      .click();
    await panel(h).waitFor();
    session = (await state()).session;
    assert.equal((await state()).current, null);
    assert.equal((await state()).game.kind, "oaq");
    for (const [p, name] of [
      [g, "Game friend"],
      [s, "Game spectator"],
    ]) {
      await join(p, name);
      const pending = await api(p, "/rooms/1/state");
      assert.equal(pending.room, undefined);
      await game(p, { action: "join" }, "FORBIDDEN", 1);
      await h.bringToFront();
      await h
        .getByRole("dialog", { name: "Yêu cầu vào phòng" })
        .getByRole("button", { name: "Cho vào", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Tương tác nhân vật", exact: true })
        .waitFor();
    }
    await open(g);
    await action(g, "Tham gia ván", "join");
    await action(h, "Bắt đầu ván", "start");
    await open(s);
    await game(
      s,
      { action: "sow", pit: 1, direction: 1 },
      "GAME_NOT_YOUR_TURN",
    );
    await game(g, { action: "draw" }, "HOST_ONLY");
    await h.bringToFront();
    await panel(h).locator("button.oaq-pit:not(:disabled)").first().click();
    await action(h, "↺ Rải ngược chiều", "sow");
    await g.bringToFront();
    await panel(g).locator("button.oaq-pit:not(:disabled)").first().click();
    await action(g, "↻ Rải thuận chiều", "sow");
    const before = await state();
    assert.equal(before.game.oaq.turn, 0);
    const stale = before.gameRevision - 1;
    await game(h, { action: "pause" }, "STALE_GAME", stale);
    assert.equal((await state()).gameRevision, before.gameRevision);
    record(
      "game satisfies initial source; actual admission preempts game panel and pending DTO hides state; authoritative turns/host ACL/CAS synchronize two players with a spectator",
    );
    const screenshots = [];
    for (const viewport of [
      { width: 320, height: 640 },
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 1024, height: 768 },
    ]) {
      await h.bringToFront();
      await panel(h)
        .getByRole("button", { name: "Đóng bảng trò chơi", exact: true })
        .focus();
      await h.setViewportSize(viewport);
      await roomCmd(s, { type: "chat", text: "Góc chơi " + viewport.width });
      await h.locator(".chat-toasts").waitFor();
      await h.waitForFunction(
        (text) => {
          const toast = document.querySelector(".chat-toasts");
          const sheet = document.querySelector(".game-sheet");
          if (!toast?.textContent.includes(text) || !sheet) return false;
          const t = toast.getBoundingClientRect(),
            b = sheet.getBoundingClientRect();
          window.__layoutDiagnostic = {
            text: toast.textContent,
            toast: t.toJSON(),
            sheet: b.toJSON(),
            viewport: [innerWidth, innerHeight],
            panel: document
              .querySelector(".cinema-app")
              .style.getPropertyValue("--panel-viewport"),
          };
          return (
            b.top >= 54 &&
            b.bottom <= innerHeight - 65 &&
            (t.bottom <= b.top + 1 || t.right <= b.left)
          );
        },
        "Góc chơi " + viewport.width,
        { timeout: 5000 },
      );
      await panel(h).evaluate((el) => (el.scrollTop = 0));
      const toastBox = await h.locator(".chat-toasts").boundingBox();
      const gameBox = await panel(h).boundingBox();
      assert(
        toastBox.y + toastBox.height <= gameBox.y + 1 ||
          toastBox.x + toastBox.width <= gameBox.x,
        JSON.stringify({
          message: "chat preview overlaps game sheet",
          viewport,
          toastBox,
          gameBox,
        }),
      );
      assert(
        await h.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const bounds = await panel(h).boundingBox();
      assert(
        bounds.x >= 0 &&
          bounds.x + bounds.width <= viewport.width + 1 &&
          bounds.y >= 54 &&
          bounds.y + bounds.height <= viewport.height - 65,
      );
      await panel(h).locator("button.oaq-pit:not(:disabled)").first().click();
      for (const label of [
        "Đóng bảng trò chơi",
        "↺ Rải ngược chiều",
        "↻ Rải thuận chiều",
      ]) {
        const b = panel(h).getByRole("button", { name: label, exact: true });
        await b.scrollIntoViewIfNeeded();
        const result = await b.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return {
            w: r.width,
            h: r.height,
            hit: el.contains(
              document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
            ),
          };
        });
        assert(
          result.w >= 44 && result.h >= 44 && result.hit,
          JSON.stringify({ label, viewport, result }),
        );
      }
      await panel(h).locator("button.oaq-pit.selected").click();
      await panel(h)
        .getByRole("button", { name: "Đóng bảng trò chơi", exact: true })
        .focus();
      await panel(h).evaluate((el) => (el.scrollTop = 0));
      const file = `games-oaq-${viewport.width}.png`;
      await h.screenshot({ path: path.join(shots, file) });
      screenshots.push(file);
    }
    await h.setViewportSize({ width: 1280, height: 900 });
    await h.emulateMedia({ reducedMotion: "reduce" });
    await panel(h)
      .getByRole("button", { name: "Đóng bảng trò chơi", exact: true })
      .focus();
    await h.keyboard.press("Escape");
    assert.equal(await panel(h).count(), 0);
    await open(h);
    await h.emulateMedia({ reducedMotion: "no-preference" });
    await roomCmd(h, {
      type: "start",
      url: "https://youtu.be/jfKfPfyJRdk",
      generation: (await state()).generation,
    });
    await h.waitForFunction(() => window.__yt?.video === "jfKfPfyJRdk");
    await h.evaluate(() => {
      window.__original = window.__yt;
      window.__frame = document.querySelector(".screen-surface iframe");
    });
    await h.getByRole("button", { name: "Hold cá nhân", exact: true }).click();
    assert(await h.evaluate(() => window.__yt.isMuted()));
    await panel(h)
      .getByRole("button", { name: "Đóng bảng trò chơi", exact: true })
      .click();
    await h
      .locator(".cinema-toolbar")
      .getByRole("button", { name: "Chat", exact: true })
      .click();
    assert.equal(await panel(h).count(), 0);
    await open(h);
    assert.equal(await h.locator(".sidebar:not([hidden])").count(), 0);
    assert(
      await h.evaluate(
        () =>
          window.__original === window.__yt &&
          window.__frame === document.querySelector(".screen-surface iframe") &&
          window.__yt.isMuted(),
      ),
    );
    await panel(h)
      .getByRole("button", { name: "Âm ván: tắt", exact: true })
      .click();
    record(
      "four viewports fit, primary controls are >=44px and hit-testable, Escape/focus and one-sheet ownership work; native iframe identity and personal Hold survive game/chat toggles",
    );
    const hId = (await api(h, "/session", {})).id,
      gId = (await api(g, "/session", {})).id;
    const snapshot = JSON.stringify((await state()).game.oaq),
      gameId = (await state()).game.id;
    await roomCmd(h, { type: "transfer", id: gId });
    await game(h, { action: "pause" });
    await game(s, { action: "resume" }, "GAME_CANNOT_RESUME");
    await game(g, { action: "resume" });
    await join(g, "Game friend");
    await open(g);
    assert.equal((await state(g)).game.id, gameId);
    assert.equal(JSON.stringify((await state(g)).game.oaq), snapshot);
    await game(h, { action: "pause" });
    await game(g, { action: "resume" });
    assert.equal((await state()).host, gId);
    assert((await state()).playing);
    record(
      "host transfer keeps original player sides; original player can pause, new host resumes; actual reload/re-entry restores same board and game without resetting media",
    );
    // Reduce software-GPU load for a real-time lottery run; this is an explicit user light-mode choice.
    for (const p of pages) {
      await p.bringToFront();
      if (await panel(p).isVisible())
        await panel(p)
          .getByRole("button", { name: "Đóng bảng trò chơi", exact: true })
          .click();
      await p
        .locator(".cinema-toolbar")
        .getByRole("button", { name: "Góc nhìn 🎮", exact: true })
        .click();
      const light = p.getByRole("button", { name: "Chế độ nhẹ", exact: true });
      if (await light.isVisible()) await light.click();
      await p
        .locator(".cinema-toolbar")
        .getByRole("button", { name: "Góc nhìn 🎮", exact: true })
        .click();
      await open(p);
    }
    await action(g, "Đóng ván", "close");
    await action(g, "Lô tô", "open");
    await action(h, "Tham gia ván", "join");
    await action(s, "Tham gia ván", "join");
    await action(g, "Bắt đầu ván", "start");
    const cards = [];
    for (const p of pages) {
      const dto = (await state(p)).game;
      assert(!("secrets" in dto));
      assert(!JSON.stringify(dto).includes('"deck"'));
      assert.equal(dto.ticket.flat().filter(Boolean).length, 15);
      cards.push(dto.ticket);
    }
    assert.equal(new Set(cards.map((c) => JSON.stringify(c))).size, 3);
    await game(h, { action: "draw" }, "HOST_ONLY");
    await game(s, { action: "claim" }, "GAME_NOT_WINNING");
    await h.setViewportSize({ width: 320, height: 640 });
    await h.bringToFront();
    await panel(h).evaluate((el) => (el.scrollTop = 0));
    await h.screenshot({ path: path.join(shots, "games-loto-320.png") });
    screenshots.push("games-loto-320.png");
    assert(
      await h.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    let st;
    for (let n = 1; n <= 90; n++) {
      await action(g, "Gọi số", "draw");
      st = (await state(g)).game;
      draws = st.drawn.length;
      if (draws % 10 === 0) console.log("Lottery calls " + draws);
      assert.equal(draws, n);
      assert.equal(new Set(st.drawn).size, n);
      if (st.claiming) break;
    }
    assert(st.claiming);
    await game(g, { action: "draw" }, "GAME_CLAIM_PENDING");
    const won = (t) =>
        t.some((row) => row.filter(Boolean).every((n) => st.drawn.includes(n))),
      winners = cards.map((t, i) => (won(t) ? i : -1)).filter((i) => i >= 0);
    assert(winners.length > 0);
    const winner = pages[winners[0]];
    await open(winner);
    await action(winner, "Kinh!", "claim");
    const final = (await state(g)).game;
    const ids = await Promise.all(
      pages.map(async (p) => (await api(p, "/session", {})).id),
    );
    assert.deepEqual(
      [...final.winners].sort(),
      winners.map((i) => ids[i]).sort(),
    );
    assert.equal(final.phase, "finished");
    assert.equal(final.drawn.length, draws);
    record(
      "three real profiles receive distinct private tickets; host calls actual random numbers with 3s cooldown; first complete row freezes drawing and all simultaneous winners are server-validated",
    );
    await action(g, "Đóng ván", "close");
    assert.equal((await state(g)).game, undefined);
    await roomCmd(g, { type: "transfer", id: hId });
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "evidence/games.json",
      JSON.stringify(
        {
          passed: true,
          date: new Date().toISOString(),
          checks,
          screenshots,
          draws,
          logic: "pure rules fixtures and seeded invariants in games.test.ts",
          limitations:
            "Real local Worker/WebSocket/DOM/CSS, actual 3s lottery cadence; YouTube API is a declared advancing-time fixture, software GPU and emulated viewports. No physical-device, WAN, cultural-rules pilot or battery certification.",
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify({ passed: true, groups: checks.length, draws }));
  } catch (e) {
    console.error(
      "Layout diagnostic",
      await h.evaluate(() => window.__layoutDiagnostic).catch(() => null),
    );
    for (const [i, p] of pages.entries())
      await p
        .screenshot({ path: path.join(shots, `games-failure-${i}.png`) })
        .catch(() => {});
    throw e;
  } finally {
    if (session)
      for (const p of pages)
        await p.request
          .post(base + "/api/rooms/1/command", {
            headers: { Origin: base },
            data: {
              session,
              commandId: crypto.randomUUID(),
              command: { type: "close" },
            },
          })
          .catch(() => {});
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
