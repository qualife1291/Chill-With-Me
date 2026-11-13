const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium, executablePath } = require("./browser-runtime.cjs");
const base = "http://localhost:8787";
const shots = process.env.CINEMA_SCREENSHOT_DIR || "/tmp/cinema-hud-review";
fs.mkdirSync(shots, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  // DPR2 emulates desktop composition density, not an Apple GPU/OS.
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  page.setDefaultTimeout(15000);
  const errors = [],
    checks = [],
    screenshots = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const api = async (route, data) => {
    const r = await page.request.fetch(base + "/api" + route, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    assert(r.ok(), `${route}: ${r.status()}`);
    return r.json();
  };
  let epoch;
  const cmd = (command) =>
    api("/rooms/1/command", {
      session: epoch,
      commandId: crypto.randomUUID(),
      command,
    });
  const capture = async (name) => {
    const filename = "hud-" + name + ".png";
    await page.screenshot({ path: path.join(shots, filename) });
    screenshots.push(filename);
  };
  try {
    await page.route("https://www.youtube.com/iframe_api", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `window.YT={Player:class{constructor(el,c){this.video='';this.time=0;this.state=2;this.volume=80;window.__yt=this;el.innerHTML='<iframe title="HUD video fixture" style="width:640px;height:360px;background:#bb3333" srcdoc="<body style=margin:0;height:100vh;background:#bb3333;color:white>VIDEO</body>"></iframe>';setTimeout(()=>c.events.onReady(),0)}loadVideoById(v){this.video=v.videoId;this.time=v.startSeconds;this.state=1}cueVideoById(v){this.video=v.videoId;this.time=v.startSeconds;this.state=2}getCurrentTime(){return this.time}getPlayerState(){return this.state}getDuration(){return 600}getVideoData(){return{video_id:this.video}}getVolume(){return this.volume}setVolume(v){this.volume=v}seekTo(t){this.time=t}playVideo(){this.state=1}pauseVideo(){this.state=2}destroy(){}}};window.onYouTubeIframeAPIReady();`,
      }),
    );
    await page.goto(base + "/?diagnostics=1");
    assert(
      !(await api("/rooms")).find((r) => r.slot === 1).open,
      "local slot1 must be free",
    );
    await page
      .locator(".room-card")
      .first()
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    await page.getByPlaceholder("Mọi người gọi bạn là…").fill("HUD review");
    await page.getByLabel("Tên phòng mới").fill("Cinema · kiểm tra bố cục");
    await page
      .getByRole("dialog", { name: "Tạo phòng mới", exact: true })
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    const start = page.getByRole("dialog", { name: "Thêm video để bắt đầu" });
    await start
      .getByLabel("Link video / nhạc để bắt đầu")
      .fill("https://youtu.be/jfKfPfyJRdk");
    await start.getByLabel("Link video / nhạc để bắt đầu").press("Enter");
    await page.waitForFunction(
      () =>
        window.__yt?.video &&
        document.querySelector(".scene canvas")?.dataset.maleModel === "ready",
    );
    epoch = (await api("/rooms/1/state")).room.session;
    await page.evaluate(() => {
      window.__hudPlayer = window.__yt;
      window.__hudCanvas = document.querySelector(".scene canvas");
      window.__hudFrame = document.querySelector(".screen-surface iframe");
    });
    const surfaces = [
      ".sidebar:not([hidden])",
      ".room-controls",
      ".room-heading",
      ".action-choices:not([hidden])",
      ".readiness-body",
    ];
    const inspect = async (state, viewport) => {
      const result = await page.evaluate(
        ({ surfaces, state }) => {
          const visible = (el) =>
            el &&
            el.checkVisibility() &&
            el.getBoundingClientRect().width > 0 &&
            el.getBoundingClientRect().height > 0 &&
            getComputedStyle(el).visibility !== "hidden";
          const failures = [];
          const reactions = document.querySelector(".reaction-strip");
          if (
            visible(reactions) &&
            reactions.getBoundingClientRect().top < innerHeight - 80
          )
            failures.push("reaction strip covers scene lane");
          const panels = surfaces
            .map((s) => document.querySelector(s))
            .filter(visible);
          if (panels.length !== (state === "closed" ? 0 : 1))
            failures.push("panel count " + panels.length);
          const dock = document
            .querySelector(".actions-trigger")
            .getBoundingClientRect();
          for (const panel of panels) {
            if (getComputedStyle(panel).backdropFilter !== "none")
              failures.push("backdrop sampling remains on " + panel.className);
            const r = panel.getBoundingClientRect();
            if (
              r.left < 0 ||
              r.right > innerWidth + 1 ||
              r.top < 56 ||
              r.bottom > innerHeight - 76
            )
              failures.push(
                "sheet bounds " + panel.className + JSON.stringify(r.toJSON()),
              );
            if (
              r.left < dock.right &&
              r.right > dock.left &&
              r.top < dock.bottom &&
              r.bottom > dock.top
            )
              failures.push("sheet covers FAB");
            const close = panel.querySelector("header button,.close-panel");
            if (close) {
              const b = close.getBoundingClientRect();
              const hit = document.elementFromPoint(
                b.x + b.width / 2,
                b.y + b.height / 2,
              );
              if (!close.contains(hit))
                failures.push("close hit intercepted by " + hit?.className);
            }
          }
          for (const el of document.querySelectorAll(
            ".cinema-toolbar > button,.cinema-toolbar summary,.actions-trigger,.personal-hold,.reaction-strip button,.transport button,.touch-navigation button,.recenter-view,.composer #message,.composer button[aria-label='Gửi tin']",
          )) {
            if (!visible(el)) continue;
            const b = el.getBoundingClientRect();
            const scrollLane = el.closest(".reaction-options");
            if (scrollLane) {
              const lane = scrollLane.getBoundingClientRect();
              if (b.left < lane.left || b.right > lane.right) continue;
            }
            if (b.width < 44 || b.height < 44)
              failures.push(
                "touch target below 44px: " + (el.ariaLabel || el.textContent),
              );
            if (
              b.left < 0 ||
              b.right > innerWidth + 1 ||
              b.top < 0 ||
              b.bottom > innerHeight + 1
            )
              failures.push(
                "control outside " + (el.ariaLabel || el.textContent),
              );
            const hit = document.elementFromPoint(
              b.x + b.width / 2,
              b.y + b.height / 2,
            );
            if (!el.contains(hit))
              failures.push(
                "control covered " +
                  (el.ariaLabel || el.textContent) +
                  " by " +
                  hit?.className,
              );
          }
          if (document.documentElement.scrollWidth > innerWidth)
            failures.push("horizontal overflow");
          if (
            window.__yt !== window.__hudPlayer ||
            document.querySelector(".scene canvas") !== window.__hudCanvas ||
            document.querySelector(".screen-surface iframe") !==
              window.__hudFrame
          )
            failures.push("renderer or player remounted");
          if (
            document
              .querySelector(".scene canvas")
              .getContext("webgl2")
              .getContextAttributes().antialias
          )
            failures.push("MSAA unexpectedly enabled");
          return failures;
        },
        { surfaces, state },
      );
      await capture(viewport + "-" + state);
      assert.deepEqual(result, [], viewport + " " + state);
      checks.push(
        viewport +
          " " +
          state +
          " exclusive, in bounds, hit-testable, stable context/player",
      );
    };
    const toolbar = (label) =>
      page
        .locator(".cinema-toolbar")
        .getByRole("button", { name: label, exact: true });
    for (const [name, width, height] of [
      ["phone320", 320, 640],
      ["phone-short", 390, 480],
      ["phone390", 390, 844],
      ["phone430", 430, 932],
      ["landscape", 844, 390],
      ["tablet", 1024, 768],
      ["desktop", 1440, 900],
    ]) {
      await page.setViewportSize({ width, height });
      // Direct transitions are deliberately used to expose independently-open sheets.
      for (const [state, label] of [
        ["info", "Thông tin"],
        ["chat", "Chat"],
        ["queue", "Playlist"],
        ["people", "Mọi người"],
        ["view", "Góc nhìn 🎮"],
      ]) {
        await toolbar(label).click();
        await inspect(state, name);
        if (state === "view" && (width <= 1100 || height <= 500)) {
          const zoomOut = page.getByRole("button", {
            name: "Thu nhỏ góc nhìn",
            exact: true,
          });
          const zoomIn = page.getByRole("button", {
            name: "Phóng gần góc nhìn",
            exact: true,
          });
          await zoomOut.scrollIntoViewIfNeeded();
          const beforeZoom = Number(
            await page.locator(".screen-surface").getAttribute("data-zoom"),
          );
          for (const button of [zoomOut, zoomIn]) {
            const good = await button.evaluate((el) => {
              const r = el.getBoundingClientRect();
              return (
                r.width >= 44 &&
                r.height >= 44 &&
                el.contains(
                  document.elementFromPoint(
                    r.x + r.width / 2,
                    r.y + r.height / 2,
                  ),
                )
              );
            });
            assert(good, "one-hand zoom target covered or too small");
          }
          await zoomOut.click();
          await page.waitForFunction(
            (z) =>
              Number(document.querySelector(".screen-surface").dataset.zoom) >
              z + 2.5,
            beforeZoom,
          );
          await zoomIn.click();
          await page.waitForFunction(
            (z) =>
              Math.abs(
                Number(document.querySelector(".screen-surface").dataset.zoom) -
                  z,
              ) < 0.1,
            beforeZoom,
          );
          await inspect("view", name + "-one-hand-zoom");
        }
      }
      await page
        .getByRole("button", { name: "Tương tác nhân vật", exact: true })
        .click();
      await inspect("actions", name);
      await page.locator(".playback-readiness summary").click();
      await inspect("readiness", name);
      await page.locator(".playback-readiness summary").click();
      await inspect("closed", name);
      for (const [state, label] of [
        ["chat", "Chat"],
        ["view", "Góc nhìn 🎮"],
      ]) {
        await toolbar(label).click();
        await page
          .getByRole("button", { name: "Cảm xúc", exact: true })
          .click();
        await inspect(state, name + "-reactions");
        assert(
          await page
            .locator(".reaction-strip")
            .evaluate((el) => el.contains(document.activeElement)),
          "focus did not enter reaction strip",
        );
        for (const name of [
          "Thả tim",
          "Cười vui",
          "Bất ngờ",
          "Chúc mừng",
          "Cảm ơn",
        ]) {
          const button = page.getByRole("button", { name, exact: true });
          await button.scrollIntoViewIfNeeded();
          assert(
            await button.evaluate((el) => {
              const r = el.getBoundingClientRect(),
                lane = el.closest(".reaction-options").getBoundingClientRect();
              return (
                r.width >= 44 &&
                r.height >= 44 &&
                r.left >= lane.left - 1 &&
                r.right <= lane.right + 1 &&
                el.contains(
                  document.elementFromPoint(
                    r.x + r.width / 2,
                    r.y + r.height / 2,
                  ),
                )
              );
            }),
            "expanded emotion choice cannot be reached: " + name,
          );
        }
        await page.keyboard.press("End");
        assert.equal(
          await page.evaluate(() => document.activeElement.ariaLabel),
          "Đóng cảm xúc",
        );
        await page.keyboard.press("Home");
        assert(
          await page.getByRole("group", { name: "Cảm xúc cả rạp" }).isVisible(),
        );
        assert(!(await page.locator(".action-choices").isVisible()));
        if (state === "chat") await page.keyboard.press("Escape");
        else
          await page
            .getByRole("button", { name: "Đóng cảm xúc", exact: true })
            .click();
        await page.waitForFunction(
          () =>
            document.activeElement?.getAttribute("aria-label") === "Cảm xúc",
        );
        await toolbar(label).click();
      }
      // Reverse ordering, repeated opening/closing, and outside dismissal.
      for (let i = 0; i < 2; i++) {
        await page
          .getByRole("button", { name: "Tương tác nhân vật", exact: true })
          .click();
        await toolbar("Chat").click();
        await toolbar("Góc nhìn 🎮").click();
        await toolbar("Góc nhìn 🎮").click();
      }
      await inspect("closed", name + "-repeat");
    }
    // Auto-open of an interruption must also participate in sheet ownership.
    await toolbar("Góc nhìn 🎮").click();
    await cmd({
      type: "wait",
      generation: (await api("/rooms/1/state")).room.generation,
    });
    await page.locator(".playback-readiness[open]").waitFor();
    await inspect("readiness", "auto-wait");
    await toolbar("Chat").click();
    await inspect("chat", "waiting-chat");
    await page.locator(".voice-options summary").click();
    await page
      .getByRole("button", { name: "Nghe thử giọng", exact: true })
      .scrollIntoViewIfNeeded();
    await inspect("chat", "expanded-voice");
    await page.getByRole("button", { name: "Đóng bảng", exact: true }).click();
    await cmd({
      type: "ready",
      generation: (await api("/rooms/1/state")).room.generation,
    });
    // Opening HUDs must not change settled scene pixels or recreate video layers.
    await page.waitForTimeout(1500);
    const clip = { x: 300, y: 180, width: 650, height: 400 };
    const before = await page.screenshot({ clip });
    for (const label of ["Chat", "Góc nhìn 🎮", "Playlist"]) {
      await toolbar(label).click();
      for (let i = 0; i < 2; i++) {
        const current = await page.screenshot({ clip });
        assert(
          before.equals(current),
          "settled world/video pixels changed on HUD toggle: " + label,
        );
      }
    }
    await toolbar("Playlist").click();
    checks.push(
      "six pixel captures unchanged across HUD toggles; same native iframe and WebGL context",
    );
    // Inspect the actual interpolated stream at multiple points of its lifetime.
    await cmd({ type: "reaction", kind: "applause" });
    await page
      .locator(".reaction-floats i")
      .first()
      .waitFor({ state: "attached" });
    for (const delay of [180, 450, 650]) {
      await page.waitForTimeout(delay);
      const positions = await page
        .locator(".reaction-floats i")
        .evaluateAll((els) =>
          els
            .map((el) => ({
              r: el.getBoundingClientRect().toJSON(),
              opacity: Number(getComputedStyle(el).opacity),
            }))
            .filter((p) => p.opacity > 0.1),
        );
      assert(
        positions.length > 0 &&
          positions.every((p) => p.r.left >= 250 && p.r.right <= 1200),
        "reaction cloud stays in the central viewport",
      );
      await capture("stream-" + delay);
    }
    assert.equal(
      await page.locator(".room-reaction .reaction-symbol").isVisible(),
      false,
      "no large center emoji",
    );
    await page.locator(".reaction-floats").waitFor({ state: "detached" });
    // The independent geometry/pixel suites also verify projection and depth occlusion.
    assert.deepEqual(errors, []);
    const report = {
      passed: true,
      date: new Date().toISOString(),
      checks,
      screenshots,
      directory: shots,
      limitations:
        "Chromium/Linux SwiftShader at DPR2; YouTube fixture; not physical Chrome/macOS/M1 certification",
    };
    fs.writeFileSync(
      "evidence/hud-layout.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(
      JSON.stringify({
        passed: true,
        states: checks.length,
        screenshots: screenshots.length,
        directory: shots,
      }),
    );
  } finally {
    if (epoch) await cmd({ type: "close" }).catch(() => {});
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
