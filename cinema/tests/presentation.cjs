// LOCAL only. Real PDF.js workers, canvas rasterization and authenticated byte relay.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const {
  chromium,
  executablePath,
  openActions,
  openReactions,
} = require("./browser-runtime.cjs");
const base = "http://localhost:8787",
  shots = process.env.CINEMA_SCREENSHOT_DIR || "/tmp/cinema-presentation";
fs.mkdirSync(shots, { recursive: true });
execFileSync("python3", ["tests/presentation-fixtures.py"]);
execFileSync("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=#28384a:s=320x180:r=12",
  "-f",
  "lavfi",
  "-i",
  "sine=frequency=200:sample_rate=44100",
  "-t",
  "60",
  "-c:v",
  "libx264",
  "-preset",
  "ultrafast",
  "-pix_fmt",
  "yuv420p",
  "-c:a",
  "aac",
  "-movflags",
  "+faststart",
  "/tmp/cinema-presentation/movie.mp4",
  "-loglevel",
  "error",
]);
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
    g = await browser.newPage({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
  const errors = [],
    checks = [],
    playbackCommands = [];
  let session;
  const api = async (p, route, data, code = 200) => {
    const r = await p.request.fetch(base + "/api" + route, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    const body = await r.json();
    assert.equal(r.status(), code, route + JSON.stringify(body));
    return body;
  };
  const state = async () => (await api(h, "/rooms/1/state")).room;
  const cmd = (p, command, code = 200) =>
    api(
      p,
      "/rooms/1/command",
      { session, commandId: crypto.randomUUID(), command },
      code,
    );
  const toolbar = (p, name) =>
    p.locator(".cinema-toolbar").getByRole("button", { name, exact: true });
  const controls = async (p) => {
    await p.bringToFront();
    await openActions(p);
    await p
      .getByRole("button", { name: "Trình chiếu PDF / ảnh", exact: true })
      .click();
    await p
      .getByRole("region", { name: "Trình chiếu tài liệu", exact: true })
      .waitFor();
  };
  const render = async (p, page) =>
    p.waitForFunction(
      (n) =>
        document.querySelector(".presentation-screen")?.dataset.page ===
        String(n),
      page,
    );
  const stopped = () =>
    Promise.all(
      [h, g].map((p) =>
        p.locator(".presentation-screen").waitFor({ state: "detached" }),
      ),
    );
  const original = async (p) =>
    assert(
      await p.evaluate(
        () =>
          window.__original === window.__yt &&
          window.__frame === document.querySelector(".screen-surface iframe"),
      ),
      "movie iframe recreated",
    );
  try {
    for (const p of [h, g]) {
      p.setDefaultTimeout(25000);
      p.on("pageerror", (e) => errors.push(e.message));
      p.on("request", (r) => {
        if (
          r.url().endsWith("/command") &&
          ["play", "pause", "seek", "next"].includes(
            r.postDataJSON()?.command?.type,
          )
        )
          playbackCommands.push(r.postDataJSON().command);
      });
      await p.addInitScript(() => {
        window.__alerts = [];
        new MutationObserver(() => {
          for (const el of document.querySelectorAll('[role="alert"]')) {
            const text = el.textContent;
            if (text && !window.__alerts.includes(text))
              window.__alerts.push(text);
          }
        }).observe(document, { subtree: true, childList: true });
        window.__soundStarts = 0;
        for (const C of [window.OscillatorNode, window.AudioBufferSourceNode]) {
          if (!C) continue;
          const start = C.prototype.start;
          C.prototype.start = function (...a) {
            window.__soundStarts++;
            return start.apply(this, a);
          };
        }
        // Exercise the explicit relay fallback, not unverified Internet STUN/TURN.
        window.RTCPeerConnection = undefined;
        window.__workers = [];
        const Worker = window.Worker;
        window.Worker = class extends Worker {
          constructor(...a) {
            super(...a);
            const item = { url: String(a[0]), terminated: false };
            window.__workers.push(item);
            this.__item = item;
          }
          terminate() {
            this.__item.terminated = true;
            return super.terminate();
          }
        };
      });
      await p.route("https://www.youtube.com/iframe_api", (r) =>
        r.fulfill({
          contentType: "application/javascript",
          body: `window.YT={Player:class{constructor(el,c){this.video='';this.time=0;this.state=2;this.volume=80;this.muted=false;window.__yt=this;el.innerHTML='<iframe title="Presentation movie fixture"></iframe>';setTimeout(()=>c.events.onReady(),0)}loadVideoById(v){this.video=v.videoId;this.time=v.startSeconds;this.state=1}cueVideoById(v){this.video=v.videoId;this.time=v.startSeconds;this.state=2}getCurrentTime(){return this.time}getPlayerState(){return this.state}getDuration(){return 600}getVideoData(){return{video_id:this.video}}getVolume(){return this.volume}setVolume(v){this.volume=v}mute(){this.muted=true}unMute(){this.muted=false}isMuted(){return this.muted}seekTo(t){this.time=t}playVideo(){this.state=1}pauseVideo(){this.state=2}destroy(){}}};window.onYouTubeIframeAPIReady();`,
        }),
      );
      await api(p, "/session", {});
      await p.goto(base);
    }
    assert(
      !(await api(h, "/rooms")).some((r) => r.open),
      "all local rooms must be free",
    );
    await h.bringToFront();
    await h
      .locator(".room-card")
      .first()
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    await h.getByPlaceholder("Mọi người gọi bạn là…").fill("Slides host");
    await h.getByLabel("Tên phòng mới").fill("Slides QA");
    await h
      .getByRole("dialog", { name: "Tạo phòng mới", exact: true })
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    const start = h.getByRole("dialog", { name: "Thêm video để bắt đầu" });
    await start
      .getByLabel("Link video / nhạc để bắt đầu")
      .fill("https://youtu.be/jfKfPfyJRdk");
    await start.getByLabel("Link video / nhạc để bắt đầu").press("Enter");
    session = (await state()).session;
    await h.waitForFunction(() => window.__yt?.video);
    await h.evaluate(() => {
      window.__original = window.__yt;
      window.__frame = document.querySelector(".screen-surface iframe");
    });
    await toolbar(h, "Góc nhìn 🎮").click();
    await h.getByRole("button", { name: "Chế độ nhẹ", exact: true }).click();
    await toolbar(h, "Góc nhìn 🎮").click();
    await g.reload();
    await g
      .locator(".room-card")
      .filter({ hasText: "Slides QA" })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await g.getByPlaceholder("Mọi người gọi bạn là…").fill("Slides guest");
    await g
      .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await h.bringToFront();
    await h
      .getByRole("dialog", { name: "Yêu cầu vào phòng" })
      .getByRole("button", { name: "Cho vào", exact: true })
      .click();
    await g.waitForFunction(() => window.__yt?.video);
    await g.evaluate(() => {
      window.__original = window.__yt;
      window.__frame = document.querySelector(".screen-surface iframe");
    });
    // No PDF worker/code is loaded for ordinary film viewing.
    assert.equal(await h.evaluate(() => window.__workers.length), 0);
    await controls(h);
    for (const [filename, message] of [
      ["locked.pdf", "PDF có mật khẩu"],
      ["too-many.pdf", "PDF tối đa 200 trang"],
      ["broken.pdf", "PDF"],
    ]) {
      await h
        .getByLabel("Chọn tài liệu trình chiếu", { exact: true })
        .setInputFiles("/tmp/cinema-presentation/" + filename);
      const notice = h.getByRole("alert").filter({ hasText: message }).first();
      await notice.waitFor();
      if (filename === "locked.pdf") {
        const reconciliation = h.waitForResponse((r) =>
          r.url().endsWith("/command") &&
          r.request().postDataJSON()?.command?.type === "seek",
        );
        await h.evaluate(() => (window.__yt.time += 10));
        assert.equal((await reconciliation).status(), 200);
        assert(
          await notice.isVisible(),
          "background movie reconciliation dismissed document warning",
        );
      }
      assert.equal((await state()).presentation, undefined);
      if (
        await h
          .getByRole("button", { name: "Đóng thông báo", exact: true })
          .isVisible()
      )
        await h
          .getByRole("button", { name: "Đóng thông báo", exact: true })
          .click();
    }
    const before = (await state()).generation;
    await h
      .getByLabel("Chọn tài liệu trình chiếu", { exact: true })
      .setInputFiles("/tmp/cinema-presentation/slides.pdf");
    await render(h, 1);
    const beforeDrift = playbackCommands.length;
    await h.evaluate(() => (window.__yt.time += 10));
    await h.waitForTimeout(1700);
    assert.equal(
      playbackCommands.length,
      beforeDrift,
      "movie sampling sent commands while presentation owns screen",
    );
    await h.evaluate((t) => (window.__yt.time = t), (await state()).position);
    let p = (await state()).presentation;
    assert.equal(p.source.pages, 3);
    assert.equal((await state()).playing, false);
    assert.equal((await state()).generation, before);
    assert(
      await h
        .locator(".screen-media")
        .evaluate((e) => getComputedStyle(e).visibility === "hidden"),
    );
    await original(h);
    const bitmap = await h
      .locator(".presentation-canvas canvas")
      .evaluate((c) => ({
        width: c.width,
        height: c.height,
        pixel: Array.from(c.getContext("2d").getImageData(10, 10, 1, 1).data),
      }));
    assert(bitmap.width * bitmap.height <= 2_073_600);
    assert.deepEqual(bitmap.pixel, [38, 76, 64, 255]);
    await controls(g);
    await g
      .getByRole("button", { name: "Nhận qua phòng", exact: true })
      .click();
    await render(g, 1);
    await original(g);
    const guest = await api(g, "/rooms/1/state");
    assert.equal(guest.room.presentation.source.fileId, p.source.fileId);
    await cmd(
      g,
      {
        type: "slide",
        fileId: p.source.fileId,
        page: 2,
        expectedRevision: p.revision,
      },
      400,
    );
    checks.push(
      "real three-page PDF validates/rasterizes; password/201-page/corrupt files reject before mutation and warnings survive background movie reconciliation; lazy worker, host-only controls, pixel budget, native player/timeline preserved; authenticated document relay reaches viewer",
    );
    await h.bringToFront();
    await h.getByRole("button", { name: "Trang tiếp", exact: true }).click();
    await render(h, 2);
    await render(g, 2);
    await cmd(
      h,
      {
        type: "slide",
        fileId: p.source.fileId,
        page: 3,
        expectedRevision: p.revision,
      },
      400,
    );
    assert.equal((await state()).presentation.page, 2);
    await original(h);
    await original(g);
    // Leave/rejoin after presentation started: approval still gates the document.
    await cmd(g, { type: "leave" });
    await g.goto(base);
    await g.locator(".room-card").first().waitFor();
    await g
      .locator(".room-card")
      .filter({ hasText: "Slides QA" })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await g.getByPlaceholder("Mọi người gọi bạn là…").fill("Slides late guest");
    await g
      .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    assert.equal((await api(g, "/rooms/1/state")).room, undefined);
    await h.bringToFront();
    await h
      .getByRole("dialog", { name: "Yêu cầu vào phòng" })
      .getByRole("button", { name: "Cho vào", exact: true })
      .click();
    await controls(g);
    await g
      .getByRole("button", { name: "Nhận qua phòng", exact: true })
      .click();
    await render(g, 2);
    await g.evaluate(() => {
      window.__original = window.__yt;
      window.__frame = document.querySelector(".screen-surface iframe");
    });
    checks.push(
      "late rejoin requires approval, hides document from pending profile and follows the current page after authenticated transfer",
    );
    for (const viewport of [
      { width: 320, height: 640 },
      { width: 844, height: 390 },
      { width: 1024, height: 768 },
    ]) {
      await g.bringToFront();
      await g.setViewportSize(viewport);
      const bad = await g.locator(".activity-sheet").evaluate((el) => {
        const r = el.getBoundingClientRect(),
          close = el.querySelector("header button"),
          b = close.getBoundingClientRect();
        return (
          r.left < 0 ||
          r.right > innerWidth + 1 ||
          r.bottom > innerHeight - 76 ||
          b.width < 44 ||
          b.height < 44 ||
          !close.contains(
            document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2),
          )
        );
      });
      assert.equal(bad, false);
      await g.screenshot({
        path: path.join(shots, `slides-${viewport.width}.png`),
      });
    }
    await g.setViewportSize({ width: 390, height: 844 });
    await h.bringToFront();
    await h.getByRole("button", { name: "Hold cá nhân", exact: true }).click();
    assert(await h.evaluate(() => window.__yt.isMuted()));
    await h
      .getByRole("button", { name: "Đóng trình chiếu", exact: true })
      .click();
    await openReactions(h);
    await h
      .getByRole("button", { name: "Thả tim", exact: true })
      .scrollIntoViewIfNeeded();
    await h.getByRole("button", { name: "Thả tim", exact: true }).click();
    await g.getByRole("status", { name: "Thả tim", exact: true }).waitFor();
    await g.waitForFunction(() => window.__soundStarts >= 3);
    assert.equal(await g.locator(".reaction-floats i").count(), 12);
    await g.locator(".room-reaction").waitFor({ state: "detached" });
    checks.push(
      "page CAS rejects stale updates, both clients follow current page; 320px/landscape/tablet sheet hit testing passes; Hold and new emotion sound work during presentation",
    );
    await controls(h);
    await h
      .getByRole("button", { name: "Dừng trình chiếu", exact: true })
      .click();
    await h.locator(".presentation-screen").waitFor({ state: "detached" });
    await g.locator(".presentation-screen").waitFor({ state: "detached" });
    await original(h);
    await original(g);
    assert.equal((await state()).presentation, undefined);
    assert.equal((await state()).playing, false);
    await h.waitForFunction(() => window.__workers.every((w) => w.terminated));
    await g.waitForFunction(() => window.__workers.every((w) => w.terminated));
    // Keep a local movie's Blob and decoder while an independent document transfer runs.
    await h.bringToFront();
    await toolbar(h, "Playlist").click();
    await h
      .getByLabel("Thêm file vào playlist", { exact: true })
      .setInputFiles("/tmp/cinema-presentation/movie.mp4");
    await h.waitForFunction(
      async () =>
        (await (await fetch("/api/rooms/1/state")).json()).room.queue.length ===
        1,
    );
    await cmd(h, { type: "next", generation: (await state()).generation });
    await h.waitForFunction(
      () => document.querySelector("video")?.readyState >= 3,
    );
    await toolbar(h, "Playlist").click();
    await g.bringToFront();
    if (
      await g
        .getByRole("button", { name: "Đóng trình chiếu", exact: true })
        .isVisible()
    )
      await g
        .getByRole("button", { name: "Đóng trình chiếu", exact: true })
        .click();
    const nativeRelay = g.getByRole("button", {
      name: "Nhận qua phòng · tối đa 25 MB",
      exact: true,
    });
    await nativeRelay.click();
    await g.waitForFunction(
      () => document.querySelector("video")?.readyState >= 3,
    );
    for (const page of [h, g])
      await page.evaluate(() => {
        window.__native = document.querySelector("video");
        window.__nativeURL = window.__native.currentSrc;
      });
    await controls(h);
    await h
      .getByLabel("Chọn tài liệu trình chiếu", { exact: true })
      .setInputFiles("/tmp/cinema-presentation/slides.pdf");
    await render(h, 1);
    await controls(g);
    await g
      .getByRole("button", { name: "Nhận qua phòng", exact: true })
      .click();
    await render(g, 1);
    for (const page of [h, g])
      assert(
        await page.evaluate(
          () =>
            window.__native === document.querySelector("video") &&
            window.__native.currentSrc === window.__nativeURL &&
            !window.__native.error,
        ),
        "document transfer replaced local movie blob/decoder",
      );
    await h.bringToFront();
    await h
      .getByRole("button", { name: "Dừng trình chiếu", exact: true })
      .click();
    await stopped();
    for (const page of [h, g])
      assert(
        await page.evaluate(
          () =>
            window.__native === document.querySelector("video") &&
            window.__native.currentSrc === window.__nativeURL,
        ),
      );
    checks.push(
      "content-selected authenticated relay preserves both local movie Blobs and real native decoders across document start/stop",
    );
    for (const extension of ["png", "jpg", "webp"]) {
      await h.bringToFront();
      await h
        .getByLabel("Chọn tài liệu trình chiếu", { exact: true })
        .setInputFiles("/tmp/cinema-presentation/slide." + extension);
      await render(h, 1);
      await controls(g);
      await g
        .getByRole("button", { name: "Nhận qua phòng", exact: true })
        .click();
      await render(g, 1);
      const pixels = await g
        .locator(".presentation-canvas canvas")
        .evaluate((c) => ({
          width: c.width,
          height: c.height,
          pixel: Array.from(c.getContext("2d").getImageData(10, 10, 1, 1).data),
        }));
      assert(pixels.width * pixels.height <= 1_048_576);
      assert(
        Math.abs(pixels.pixel[1] - 109) < 10 && pixels.pixel[3] === 255,
        "raster image bytes or decoder changed",
      );
      await h.bringToFront();
      await h
        .getByRole("button", { name: "Dừng trình chiếu", exact: true })
        .click();
      await stopped();
      for (const page of [h, g])
        assert(
          await page.evaluate(
            () =>
              window.__native === document.querySelector("video") &&
              window.__native.currentSrc === window.__nativeURL,
          ),
        );
    }
    checks.push(
      "PNG/JPEG/WebP decode and relay real raster pixels under the economical canvas cap, preserving the local movie across replacement/stop",
    );
    // Ownership outlives host role: the original sender can restore after succession/reload.
    await h
      .getByLabel("Chọn tài liệu trình chiếu", { exact: true })
      .setInputFiles("/tmp/cinema-presentation/slides.pdf");
    await render(h, 1);
    const originalHostId = (await state()).host,
      newHostId = (await api(g, "/session", {})).id;
    await cmd(h, { type: "transfer", id: newHostId });
    assert.equal((await state()).host, newHostId);
    await h.reload();
    await h
      .locator(".room-card")
      .filter({ hasText: "Slides QA" })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await h.getByPlaceholder("Mọi người gọi bạn là…").fill("Slides owner");
    await h
      .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await controls(h);
    await h
      .getByLabel("Chọn lại tài liệu", { exact: true })
      .setInputFiles("/tmp/cinema-presentation/slides.pdf");
    await render(h, 1);
    await controls(g);
    await g
      .getByRole("button", { name: "Nhận qua phòng", exact: true })
      .click();
    await render(g, 1);
    assert.equal((await state()).presentation.source.ownerId, originalHostId);
    assert.equal(
      await h.getByRole("button", { name: "Trang tiếp", exact: true }).count(),
      0,
    );
    await g
      .getByRole("button", { name: "Dừng trình chiếu", exact: true })
      .click();
    await stopped();
    await cmd(g, { type: "transfer", id: originalHostId });
    checks.push(
      "original document owner restores and relays after host transfer and reload without gaining host page controls",
    );
    // A new deck can be the first source in a freshly created room.
    await cmd(h, { type: "close" });
    session = undefined;
    await h.locator(".room-card").first().waitFor();
    await h
      .locator(".room-card")
      .first()
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    await h.getByLabel("Tên phòng mới").fill("Slides first source");
    await h
      .getByRole("dialog", { name: "Tạo phòng mới", exact: true })
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    await h.getByRole("dialog", { name: "Thêm video để bắt đầu" }).waitFor();
    session = (await state()).session;
    await h
      .getByLabel("Chọn tài liệu để bắt đầu", { exact: true })
      .setInputFiles("/tmp/cinema-presentation/slides.pdf");
    await render(h, 1);
    assert.equal(
      await h.getByRole("dialog", { name: "Thêm video để bắt đầu" }).count(),
      0,
    );
    await h.screenshot({ path: path.join(shots, "slides-first-source.png") });
    checks.push(
      "stop prunes metadata, terminates PDF workers and preserves paused movie; PDF can satisfy initial source without a fake video or seek",
    );
    // Hold a real decoded bitmap until after room exit to exercise late native decode completion.
    await h.evaluate((size) => {
      const decode = window.createImageBitmap.bind(window);
      window.__bitmapClosed = 0;
      window.__bitmapReady = false;
      window.createImageBitmap = async (...args) => {
        const bitmap = await decode(...args);
        if (
          args[0] instanceof Blob &&
          args[0].type === "image/png" &&
          args[0].size === size
        ) {
          window.createImageBitmap = decode;
          const close = bitmap.close.bind(bitmap);
          bitmap.close = () => {
            window.__bitmapClosed++;
            close();
          };
          window.__bitmapReady = true;
          return new Promise((resolve) => {
            window.__releaseBitmap = () => resolve(bitmap);
          });
        }
        return bitmap;
      };
    }, fs.statSync("/tmp/cinema-presentation/slide.png").size);
    await controls(h);
    await h
      .getByLabel("Chọn tài liệu trình chiếu", { exact: true })
      .setInputFiles("/tmp/cinema-presentation/slide.png");
    await h.waitForFunction(() => window.__bitmapReady);
    await cmd(h, { type: "close" });
    session = undefined;
    await h.locator(".room-card").first().waitFor();
    await h.waitForFunction(() => window.__workers.every((w) => w.terminated));
    await h.evaluate(() => window.__releaseBitmap());
    await h.waitForFunction(() => window.__bitmapClosed === 1);
    await h.waitForFunction(() => window.__workers.every((w) => w.terminated));
    assert((await api(h, "/rooms")).every((r) => !r.open));
    checks.push(
      "late real image decode closes its bitmap exactly once after exit, with no reopened room or retained PDF worker",
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "evidence/presentation.json",
      JSON.stringify(
        {
          passed: true,
          date: new Date().toISOString(),
          checks,
          bitmap,
          limitations:
            "Real PDF.js/canvas/WebSocket relay and gated real bitmap completion; generated owned PDFs; YouTube API and absent RTC are explicit fixtures. Physical mobile/GPU/network/thermal and WAN direct transfer remain open.",
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify({ passed: true, groups: checks.length }));
  } catch (e) {
    console.error(
      "Presentation diagnostics",
      { playbackCommands: playbackCommands.slice(-4) },
      await h
        .evaluate(() => ({
          alerts: window.__alerts,
          visible: Array.from(document.querySelectorAll('[role="alert"]')).map(
            (e) => e.textContent,
          ),
          workers: window.__workers,
          source: document.querySelector(".presentation-screen")?.dataset.page,
        }))
        .catch(() => ({ unavailable: true })),
    );
    await h
      .screenshot({ path: path.join(shots, "slides-failure.png") })
      .catch(() => {});
    throw e;
  } finally {
    if (session)
      for (const page of [h, g])
        await cmd(page, { type: "close" }).catch(() => {});
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
