// Local-only lifecycle test. Native audio/video are real; YouTube/Drive use API fixtures.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process"),
  {
    chromium,
    executablePath,
    openActions,
    openReactions,
  } = require("./browser-runtime.cjs");
const base = "http://localhost:8787",
  shots = process.env.CINEMA_SCREENSHOT_DIR || "/tmp/cinema-hold";
fs.mkdirSync(shots, { recursive: true });
const fixture = "/tmp/cinema-hold.mp4";
execFileSync("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=#293329:s=320x180:r=12",
  "-f",
  "lavfi",
  "-i",
  "sine=frequency=240:sample_rate=44100",
  "-t",
  "120",
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
  fixture,
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
    g = await browser.newPage();
  let session;
  const errors = [],
    commands = [],
    checks = [];
  const api = async (p, route, data) => {
    const r = await p.request.fetch(base + "/api" + route, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    const value = await r.json();
    assert(r.ok(), route + " " + JSON.stringify(value));
    return value;
  };
  const state = async () => (await api(h, "/rooms/1/state")).room;
  const cmd = (p, command) =>
    api(p, "/rooms/1/command", {
      session,
      commandId: crypto.randomUUID(),
      command,
    });
  const next = async (url) => {
    await cmd(h, { type: "add", url });
    await cmd(h, { type: "next", generation: (await state()).generation });
  };
  const hold = async (p, on) => {
    await p.bringToFront();
    await p
      .getByRole("button", {
        name: on ? "Hold cá nhân" : "Bỏ Hold",
        exact: true,
      })
      .click();
  };
  const native = async (p) => {
    await p.waitForFunction(
      () => document.querySelector("video")?.readyState >= 3,
    );
  };
  const media = async (p) =>
    p.evaluate(() => {
      const v = document.querySelector("video");
      return {
        muted: v.muted,
        volume: v.volume,
        time: v.currentTime,
        paused: v.paused,
      };
    });
  const equalVolume = (a, b) =>
    assert(Math.abs(a - b) < 0.01, `volume ${a} != ${b}`);
  try {
    for (const p of [h, g]) {
      p.setDefaultTimeout(20000);
      p.on("pageerror", (e) => errors.push(e.message));
      p.on("request", (r) => {
        if (r.url().endsWith("/command"))
          commands.push(r.postDataJSON()?.command);
      });
      await p.addInitScript(() => {
        try {
          localStorage.setItem("cinema-audio-priority", "interaction");
        } catch {}
        window.__soundStarts = 0;
        for (const C of [window.OscillatorNode, window.AudioBufferSourceNode]) {
          if (!C) continue;
          const start = C.prototype.start;
          C.prototype.start = function (...args) {
            window.__soundStarts++;
            return start.apply(this, args);
          };
        }
      });
      const bytes = fs.readFileSync(fixture);
      await p.route("https://hold.example.test/**", (r) => {
        const range = r
          .request()
          .headers()
          .range?.match(/bytes=(\d+)-(\d*)/);
        if (range) {
          const a = +range[1],
            b = range[2]
              ? Math.min(+range[2], bytes.length - 1)
              : bytes.length - 1;
          return r.fulfill({
            status: 206,
            headers: {
              "Content-Type": "video/mp4",
              "Accept-Ranges": "bytes",
              "Content-Range": `bytes ${a}-${b}/${bytes.length}`,
            },
            body: bytes.subarray(a, b + 1),
          });
        }
        return r.fulfill({ contentType: "video/mp4", body: bytes });
      });
      await p.route("https://www.youtube.com/iframe_api", (r) =>
        r.fulfill({
          contentType: "application/javascript",
          body: `window.YT={Player:class{constructor(el,c){this.video='';this.time=0;this.state=2;this.volume=80;this.muted=false;window.__yt=this;el.innerHTML='<iframe title="Hold YouTube fixture"></iframe>';setTimeout(()=>c.events.onReady(),0)}loadVideoById(v){this.video=v.videoId;this.time=v.startSeconds;this.state=1}cueVideoById(v){this.video=v.videoId;this.time=v.startSeconds;this.state=2}getCurrentTime(){return this.time}getPlayerState(){return this.state}getDuration(){return 600}getVideoData(){return{video_id:this.video}}getVolume(){return this.volume}setVolume(v){this.volume=v}mute(){this.muted=true}unMute(){this.muted=false}isMuted(){return this.muted}seekTo(t){this.time=t}playVideo(){this.state=1}pauseVideo(){this.state=2}destroy(){}}};window.onYouTubeIframeAPIReady();`,
        }),
      );
      await p.route("https://drive.usercontent.google.com/**", (r) =>
        r.abort("failed"),
      );
      await p.route("https://drive.google.com/file/d/*/preview**", (r) =>
        r.fulfill({
          contentType: "text/html",
          body: "<p>Controlled Drive preview; no mute API</p>",
        }),
      );
      await api(p, "/session", {});
      await p.goto(base);
    }
    assert(
      !(await api(h, "/rooms")).some((r) => r.open),
      "local rooms must be free",
    );
    await h.bringToFront();
    await h
      .locator(".room-card")
      .first()
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    await h.getByPlaceholder("Mọi người gọi bạn là…").fill("Hold host");
    await h.getByLabel("Tên phòng mới").fill("Hold QA");
    await h
      .getByRole("dialog", { name: "Tạo phòng mới", exact: true })
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    const start = h.getByRole("dialog", { name: "Thêm video để bắt đầu" });
    await start
      .getByLabel("Link video / nhạc để bắt đầu")
      .fill("https://hold.example.test/clip.mp4");
    await start.getByLabel("Link video / nhạc để bắt đầu").press("Enter");
    session = (await state()).session;
    await native(h);
    // Stop scene rendering while checking transport/audio on a second page.
    await h.locator('.cinema-toolbar button[aria-label="Góc nhìn 🎮"]').click();
    await h.getByRole("button", { name: "Chế độ nhẹ", exact: true }).click();
    await h.locator('.cinema-toolbar button[aria-label="Góc nhìn 🎮"]').click();
    await g.reload();
    await g
      .locator(".room-card")
      .filter({ hasText: "Hold QA" })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await g.getByPlaceholder("Mọi người gọi bạn là…").fill("Hold guest");
    await g
      .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await h.bringToFront();
    await h
      .getByRole("dialog", { name: "Yêu cầu vào phòng" })
      .getByRole("button", { name: "Cho vào", exact: true })
      .click();
    await native(g);
    await h.evaluate(() => {
      window.__video = document.querySelector("video");
      window.__video.volume = 0.63;
    });
    await g.evaluate(() => {
      window.__video = document.querySelector("video");
      window.__video.volume = 0.47;
    });
    const before = (await state()).revision,
      count = commands.length;
    await hold(h, true);
    await h.waitForFunction(() => document.querySelector("video").muted);
    assert.equal((await media(g)).muted, false);
    const at = (await media(h)).time;
    await h.waitForTimeout(650);
    assert((await media(h)).time > at + 0.25, "host Hold paused media");
    assert.equal((await media(h)).paused, false);
    assert.equal(commands.length, count, "Hold sent a room command");
    assert.equal((await state()).revision, before, "Hold changed room state");
    assert(
      await h.evaluate(
        () => document.querySelector("video") === window.__video,
      ),
    );
    equalVolume((await media(h)).volume, 0.63);
    await hold(g, true);
    await g.waitForFunction(() => document.querySelector("video").muted);
    await h.evaluate(() => {
      const v = document.querySelector("video");
      v.muted = false;
      v.volume = 0.52;
    });
    await h.waitForFunction(() => document.querySelector("video").muted);
    await hold(h, false);
    assert.equal((await media(h)).muted, false);
    equalVolume((await media(h)).volume, 0.52);
    assert.equal((await media(g)).muted, true);
    await hold(g, false);
    equalVolume((await media(g)).volume, 0.47);
    await g.evaluate(() => (document.querySelector("video").muted = true));
    await hold(g, true);
    await hold(g, false);
    assert.equal((await media(g)).muted, true, "prior manual mute lost");
    await g.evaluate(() => (document.querySelector("video").muted = false));
    checks.push(
      "host/viewer Hold independently mutes real native media without pause, remount or room commands; volume changes and previous manual mute restore",
    );
    await hold(h, true);
    await hold(g, true);
    await cmd(g, { type: "chat", text: "Chat while holding" });
    await h
      .locator(".chat-toast")
      .getByText("Chat while holding", { exact: true })
      .waitFor();
    await h.bringToFront();
    await openActions(h);
    await h
      .getByLabel("Chọc bạn", { exact: true })
      .selectOption((await api(g, "/session", {})).id);
    await g.getByText("Hold host vừa chọc bạn 👋", { exact: true }).waitFor();
    await g.waitForFunction(() => window.__soundStarts >= 2);
    await openReactions(h);
    await h.getByRole("button", { name: "Vỗ tay", exact: true }).click();
    await g.getByRole("status", { name: "Vỗ tay", exact: true }).waitFor();
    await h.waitForFunction(
      () => Math.abs(document.querySelector("video").volume - 0.13) < 0.01,
    );
    await g.waitForFunction(() => window.__soundStarts >= 11);
    assert((await media(g)).muted);
    assert((await media(h)).muted);
    await h.locator(".room-reaction").waitFor({ state: "detached" });
    await h.waitForFunction(
      () => Math.abs(document.querySelector("video").volume - 0.52) < 0.01,
    );
    await g.waitForFunction(
      () => Math.abs(document.querySelector("video").volume - 0.47) < 0.01,
    );
    await openActions(h);
    await h.getByRole("button", { name: "Vẫy tay", exact: true }).click();
    await h.evaluate(
      () => (window.__retiredVideo = document.querySelector("video")),
    );
    await next("https://hold.example.test/second.mp4");
    await native(h);
    await native(g);
    assert((await media(h)).muted);
    assert((await media(g)).muted);
    assert(
      await h.evaluate(
        () =>
          window.__retiredVideo.muted &&
          window.__retiredVideo.paused &&
          !window.__retiredVideo.isConnected,
      ),
      "retired held video must stay muted and release playback",
    );
    checks.push(
      "held members retain chat, targeted poke audio, shared reaction audio with duck/restore, wave and host Next; replacing native source stays muted",
    );
    await next("https://youtu.be/jfKfPfyJRdk");
    for (const p of [h, g])
      await p.waitForFunction(
        () => window.__yt?.video && window.__yt.isMuted(),
      );
    await hold(h, false);
    assert.equal(
      await h.evaluate(() => window.__yt.isMuted()),
      false,
      "YouTube first-ready snapshot must restore unmuted",
    );
    await h.evaluate(() => (window.__yt.volume = 61));
    await hold(h, true);
    await h.evaluate(() => window.__yt.unMute());
    await h.waitForFunction(() => window.__yt.isMuted());
    await hold(h, false);
    assert.equal(await h.evaluate(() => window.__yt.getVolume()), 61);
    await h.evaluate(() => window.__yt.mute());
    await hold(h, true);
    await hold(h, false);
    assert(await h.evaluate(() => window.__yt.isMuted()));
    await hold(h, true);
    await next("https://youtu.be/5qap5aO4i9A");
    await h.waitForFunction(
      () => window.__yt?.video === "5qap5aO4i9A" && window.__yt.isMuted(),
    );
    await hold(h, false);
    assert(
      await h.evaluate(() => window.__yt.isMuted()),
      "prior YouTube mute lost",
    );
    checks.push(
      "YouTube API fixture holds before first load and across generations, enforces mute for either role and restores prior mute/volume",
    );
    await hold(h, true);
    await next(
      "https://drive.google.com/file/d/1TVTrleolsrLJUzch6QUHnhIdJ54klpBi/view",
    );
    const preview = h.getByRole("button", {
      name: "Mở bản xem trước Drive",
      exact: true,
    });
    await preview.waitFor();
    assert(await preview.isDisabled());
    await h
      .getByText(
        "Bỏ Hold trước khi mở Drive preview; iframe này không có API tắt tiếng.",
        { exact: true },
      )
      .waitFor();
    await hold(h, false);
    await preview.click();
    assert(
      await h
        .getByRole("button", { name: "Hold cá nhân", exact: true })
        .isDisabled(),
    );
    await h
      .getByRole("button", { name: "Thử phát đồng bộ lại", exact: true })
      .click();
    assert(
      await h
        .getByRole("button", { name: "Hold cá nhân", exact: true })
        .isEnabled(),
    );
    checks.push(
      "unsupported Drive preview explicitly blocks Hold, and Hold blocks opening its unmuteable iframe; native recovery restores capability",
    );
    await next("https://hold.example.test/return.mp4");
    await native(h);
    await native(g);
    assert((await media(g)).muted, "guest Hold lost across provider changes");
    await hold(h, true);
    await h.evaluate(
      () =>
        (window.__oldSession =
          document.querySelector(".personal-hold").ariaPressed),
    );
    await cmd(h, { type: "close" });
    session = undefined;
    await h.locator(".room-card").first().waitFor();
    await h
      .locator(".room-card")
      .first()
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    await h.getByLabel("Tên phòng mới").fill("Fresh Hold QA");
    await h
      .getByRole("dialog", { name: "Tạo phòng mới", exact: true })
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    const fresh = h.getByRole("dialog", { name: "Thêm video để bắt đầu" });
    await fresh.waitFor();
    session = (await state()).session;
    await fresh
      .getByLabel("Link video / nhạc để bắt đầu")
      .fill("https://hold.example.test/fresh.mp4");
    await fresh.getByLabel("Link video / nhạc để bắt đầu").press("Enter");
    await native(h);
    assert.equal(
      await h.locator(".personal-hold").getAttribute("aria-pressed"),
      "false",
    );
    assert.equal((await media(h)).muted, false);
    checks.push(
      "room close/new session resets personal Hold; no old-room preference leaks into the next session",
    );
    await h.screenshot({ path: path.join(shots, "hold-native-desktop.png") });
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "evidence/hold-emotions.json",
      JSON.stringify(
        {
          passed: true,
          date: new Date().toISOString(),
          checks,
          limitations:
            "Native Chromium codecs/WebAudio real; provider APIs controlled fixtures. Mobile geometry covered separately by hud-layout; physical iOS/Android/macOS audio and YouTube remain open.",
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify({ passed: true, groups: checks.length }));
  } catch (e) {
    await h
      .screenshot({ path: path.join(shots, "hold-failure.png") })
      .catch(() => {});
    throw e;
  } finally {
    if (session) await cmd(h, { type: "close" }).catch(() => {});
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
