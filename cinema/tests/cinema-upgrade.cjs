const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const {
  chromium,
  executablePath,
  openActions,
} = require("./browser-runtime.cjs");
const base = "http://localhost:8787",
  shots = process.env.CINEMA_SCREENSHOT_DIR || "/tmp/cinema-upgrade";
fs.mkdirSync(shots, { recursive: true });
const fixture = "/tmp/cinema-upgrade.mp4";
execFileSync("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "color=c=#151d25:s=320x180:r=12",
  "-f",
  "lavfi",
  "-i",
  "sine=frequency=240:sample_rate=44100",
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
  const checks = [],
    errors = [],
    requests = [];
  const api = async (p, route, data, expect = 200) => {
    const r = await p.request.fetch(base + "/api" + route, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    const body = await r.json();
    assert.equal(r.status(), expect, JSON.stringify(body));
    return body;
  };
  const cmd = (p, command, expect = 200) =>
    api(
      p,
      "/rooms/1/command",
      { session, commandId: crypto.randomUUID(), command },
      expect,
    );
  const toolbar = (p, name) =>
    p.locator(".cinema-toolbar").getByRole("button", { name, exact: true });
  const controls = async (p = h) => {
    await p.bringToFront();
    if (
      (await toolbar(p, "Góc nhìn 🎮").getAttribute("aria-pressed")) !== "true"
    )
      await toolbar(p, "Góc nhìn 🎮").click();
  };
  const prefs = async () => {
    await controls();
    if ((await h.locator(".cinema-preferences").getAttribute("open")) === null)
      await h.locator(".cinema-preferences > summary").click();
  };
  const state = async () => (await api(h, "/rooms/1/state")).room;
  const pause = async () =>
    cmd(h, { type: "pause", generation: (await state()).generation });
  const play = async () =>
    cmd(h, { type: "play", generation: (await state()).generation });
  const original = async () =>
    assert(
      await h.evaluate(
        () => document.querySelector("video") === window.__originalVideo,
      ),
      "native video remounted",
    );
  try {
    for (const p of [h, g]) {
      p.setDefaultTimeout(20000);
      p.on("pageerror", (e) => errors.push(e.message));
      p.on("request", (r) => {
        if (r.url().endsWith("/command"))
          requests.push(r.postDataJSON()?.command);
      });
      await p.addInitScript(() => {
        try {
          localStorage.setItem("cinema-audio-priority", "corrupt");
          localStorage.setItem("cinema-motion", "always");
          localStorage.setItem("cinema-wake-lock", "yes");
        } catch {}
        window.__mediaActions = {};
        window.__mediaMeta = {};
        Object.defineProperty(navigator, "mediaSession", {
          configurable: true,
          value: {
            setActionHandler: (a, f) => (window.__mediaActions[a] = f),
            set metadata(v) {
              window.__mediaMeta = v;
            },
            get metadata() {
              return window.__mediaMeta;
            },
            playbackState: "none",
          },
        });
        window.__locks = [];
        window.__wakeRequests = 0;
        window.__wakeMode = "ok";
        window.__pendingWake = [];
        window.__wake = {
          request: async () => {
            window.__wakeRequests++;
            if (window.__wakeMode === "reject") throw Error("denied");
            const lock = new (class extends EventTarget {
              released = false;
              releases = 0;
              async release() {
                this.releases++;
                this.released = true;
                this.dispatchEvent(new Event("release"));
              }
            })();
            window.__locks.push(lock);
            if (window.__wakeMode === "pending")
              await new Promise((r) => window.__pendingWake.push(r));
            return lock;
          },
        };
        Object.defineProperty(navigator, "wakeLock", {
          configurable: true,
          value: window.__wake,
        });
        window.__revoked = [];
        const revoke = URL.revokeObjectURL.bind(URL);
        URL.revokeObjectURL = (u) => {
          window.__revoked.push(u);
          revoke(u);
        };
        window.__utterances = [];
        Object.defineProperty(window, "speechSynthesis", {
          value: {
            getVoices: () => [
              { lang: "vi-VN", voiceURI: "fixture", default: true },
            ],
            resume() {},
            cancel() {},
            speak(u) {
              window.__utterances.push(u);
              u.onstart?.();
              setTimeout(() => u.onend?.(), 450);
            },
          },
        });
        Object.defineProperty(window, "SpeechSynthesisUtterance", {
          value: class {
            constructor(text) {
              this.text = text;
            }
          },
        });
        const connect = AudioNode.prototype.connect;
        AudioNode.prototype.connect = function (dest, ...args) {
          if (
            this instanceof GainNode &&
            dest instanceof DynamicsCompressorNode
          )
            window.__sfxBus = this;
          return connect.call(this, dest, ...args);
        };
      });
      const bytes = fs.readFileSync(fixture);
      await p.route("https://cinema-upgrade.example.test/clip.mp4", (route) => {
        const range = route
          .request()
          .headers()
          .range?.match(/bytes=(\d+)-(\d*)/);
        if (range) {
          const a = +range[1],
            b = range[2]
              ? Math.min(+range[2], bytes.length - 1)
              : bytes.length - 1;
          return route.fulfill({
            status: 206,
            headers: {
              "Content-Type": "video/mp4",
              "Accept-Ranges": "bytes",
              "Content-Range": `bytes ${a}-${b}/${bytes.length}`,
            },
            body: bytes.subarray(a, b + 1),
          });
        }
        return route.fulfill({
          contentType: "video/mp4",
          headers: { "Accept-Ranges": "bytes" },
          body: bytes,
        });
      });
      await p.route("https://www.youtube.com/iframe_api", (r) =>
        r.fulfill({
          contentType: "application/javascript",
          body: `window.YT={Player:class{constructor(el,c){this.video='';this.time=0;this.state=2;this.volume=80;window.__yt=this;el.innerHTML='<iframe title="Upgrade YouTube fixture" style="width:640px;height:360px"></iframe>';setTimeout(()=>c.events.onReady(),0)}loadVideoById(v){this.video=v.videoId;this.time=v.startSeconds;this.state=1}cueVideoById(v){this.video=v.videoId;this.time=v.startSeconds;this.state=2}getCurrentTime(){return this.time}getPlayerState(){return this.state}getDuration(){return 600}getVideoData(){return{video_id:this.video}}getVolume(){return this.volume}setVolume(v){this.volume=v}seekTo(t){this.time=t}playVideo(){this.state=1}pauseVideo(){this.state=2}destroy(){}}};window.onYouTubeIframeAPIReady();`,
        }),
      );
      await api(p, "/session", {});
      await p.goto(base + "/?diagnostics=1");
    }
    assert(
      !(await api(h, "/rooms")).some((r) => r.open),
      "all local slots must be free",
    );
    await h.bringToFront();
    await h
      .locator(".room-card")
      .first()
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    await h.getByPlaceholder("Mọi người gọi bạn là…").fill("Upgrade host");
    await h.getByLabel("Tên phòng mới").fill("Cinema upgrade QA");
    await h
      .getByRole("dialog", { name: "Tạo phòng mới", exact: true })
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    const start = h.getByRole("dialog", { name: "Thêm video để bắt đầu" });
    await start
      .getByLabel("Link video / nhạc để bắt đầu")
      .fill("https://cinema-upgrade.example.test/clip.mp4");
    await start.getByLabel("Link video / nhạc để bắt đầu").press("Enter");
    session = (await state()).session;
    await h.waitForFunction(
      () =>
        document.querySelector("video")?.readyState >= 3 &&
        document.querySelector(".scene canvas")?.dataset.maleModel === "ready",
    );
    await pause();
    await h.evaluate(
      () => (window.__originalVideo = document.querySelector("video")),
    );
    await g.reload();
    await g
      .locator(".room-card")
      .filter({ hasText: "Cinema upgrade QA" })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await g.getByPlaceholder("Mọi người gọi bạn là…").fill("Upgrade guest");
    await g
      .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await h.bringToFront();
    await h
      .getByRole("dialog", { name: "Yêu cầu vào phòng" })
      .getByRole("button", { name: "Cho vào", exact: true })
      .click();
    await g.waitForFunction(
      () => document.querySelector("video")?.readyState >= 3,
    );
    assert(
      await h.evaluate(() => typeof window.__mediaActions.play === "function"),
    );
    assert(
      await g.evaluate(() =>
        Object.values(window.__mediaActions).every((v) => v === null),
      ),
    );
    assert.equal(
      await h.evaluate(() => window.__mediaMeta.artist),
      "Cinema upgrade QA",
    );
    await h.evaluate(() => window.__mediaActions.seekto({ seekTime: 5 }));
    await h.waitForFunction(
      async () =>
        Math.abs(
          (await (await fetch("/api/rooms/1/state")).json()).room.position - 5,
        ) < 0.2,
    );
    const beforeBad = requests.length;
    await h.evaluate(() =>
      window.__mediaActions.seekto({ seekTime: Infinity }),
    );
    await h.waitForTimeout(80);
    assert.equal(requests.length, beforeBad);
    await cmd(g, { type: "play", generation: (await state()).generation }, 400);
    checks.push(
      "Media Session host seek uses authenticated generation commands; invalid seek ignored, viewer handlers cleared and server ACL retained; metadata set",
    );
    await prefs();
    assert.equal(
      await h.getByLabel("Ưu tiên âm thanh").inputValue(),
      "balanced",
    );
    assert.equal(await h.getByLabel("Chuyển động rạp").inputValue(), "off");
    await h
      .getByRole("button", { name: "Giữ sáng màn hình: Tắt", exact: true })
      .click();
    assert.equal(await h.evaluate(() => window.__wakeRequests), 0);
    await h.evaluate(() => window.__mediaActions.play({}));
    await h.waitForFunction(() => window.__locks.length === 1);
    await h
      .getByText("Đang giữ sáng khi phát video.", { exact: true })
      .waitFor();
    await h.evaluate(() => window.__mediaActions.pause({}));
    await h.waitForFunction(() => window.__locks[0].released);
    await h.evaluate(() => (window.__wakeMode = "pending"));
    await play();
    await h.waitForFunction(() => window.__pendingWake.length === 1);
    await pause();
    await h.waitForFunction(() => document.querySelector("video").paused);
    await h.evaluate(() => window.__pendingWake.shift()());
    await h.waitForFunction(() => window.__locks.at(-1).released);
    await h.evaluate(() => {
      window.__wakeMode = "ok";
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await h.waitForTimeout(40);
    await h.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await play();
    await h.waitForFunction(() => window.__locks.at(-1).released === false);
    await h.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await h.waitForFunction(() => window.__locks.every((l) => l.released));
    await h.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await h.waitForFunction(() => window.__locks.at(-1).released === false);
    await h
      .getByRole("button", { name: "Giữ sáng màn hình: Bật", exact: true })
      .click();
    await h.waitForFunction(() => window.__locks.every((l) => l.released));
    await pause();
    await h.evaluate(() =>
      Object.defineProperty(navigator, "wakeLock", {
        configurable: true,
        value: undefined,
      }),
    );
    await h
      .getByRole("button", { name: "Giữ sáng màn hình: Tắt", exact: true })
      .click();
    await play();
    await h
      .getByText(
        "Trình duyệt chưa hỗ trợ giữ sáng màn hình. Bạn vẫn xem bình thường.",
        { exact: true },
      )
      .waitFor();
    await h
      .getByRole("button", { name: "Giữ sáng màn hình: Bật", exact: true })
      .click();
    await pause();
    checks.push(
      "Wake Lock opt-in: no request when paused; acquire while playing; release on pause/hidden/off, reacquire on visible; stale async request released; unsupported warning",
    );
    await h.evaluate(() => {
      Object.defineProperty(navigator, "wakeLock", {
        configurable: true,
        value: window.__wake,
      });
      window.__wakeMode = "reject";
    });
    await h
      .getByRole("button", { name: "Giữ sáng màn hình: Tắt", exact: true })
      .click();
    await play();
    await h
      .getByText(
        "Chưa giữ sáng được màn hình. Thiết bị có thể đang tiết kiệm pin hoặc chưa cho phép.",
        { exact: true },
      )
      .waitFor();
    await h
      .getByRole("button", { name: "Giữ sáng màn hình: Bật", exact: true })
      .click();
    await pause();
    checks.push(
      "corrupt personal preferences fall back safely; denied Wake Lock shows a bounded warning without retry loop",
    );
    const caption = h.getByLabel("Chọn phụ đề VTT");
    await caption.setInputFiles({
      name: "bad.vtt",
      mimeType: "text/vtt",
      buffer: Buffer.from("WEBVTT\n\n00:05.000 --> 00:01.000\nBad"),
    });
    await h.getByRole("alert").filter({ hasText: "Mốc phụ đề" }).waitFor();
    assert.equal(await h.locator("video track").count(), 0);
    await caption.setInputFiles({
      name: "room.vtt",
      mimeType: "text/vtt",
      buffer: Buffer.from(
        "WEBVTT\n\n00:00.000 --> 00:59.000\nXin chào cả rạp 🎬\n",
      ),
    });
    await h.waitForFunction(
      () => document.querySelector("video")?.textTracks[0]?.cues?.length === 1,
    );
    await original();
    const captionURL = await h.locator("video track").getAttribute("src");
    assert(captionURL.startsWith("blob:"));
    await h.getByRole("button", { name: "Xóa phụ đề", exact: true }).click();
    assert(await h.evaluate((u) => window.__revoked.includes(u), captionURL));
    assert.equal(await h.locator("video track").count(), 0);
    await caption.setInputFiles({
      name: "private.vtt",
      mimeType: "text/vtt",
      buffer: Buffer.from(
        "WEBVTT\n\n00:00.000 --> 00:59.000\nRiêng trên máy tôi\n",
      ),
    });
    await h.waitForFunction(() => document.querySelector("video track"));
    assert.equal(await g.locator("video track").count(), 0);
    checks.push(
      "local UTF-8 WebVTT validates before mutation, real native text track decodes unicode; personal only; remove revokes Blob and preserves video identity",
    );
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 844, height: 390 },
      { width: 1280, height: 900 },
    ]) {
      await h.setViewportSize(viewport);
      await prefs();
      await h.getByLabel("Chọn phụ đề VTT").scrollIntoViewIfNeeded();
      const box = await h.locator(".room-controls").boundingBox();
      assert(
        box.x >= 0 &&
          box.x + box.width <= viewport.width &&
          box.y >= 56 &&
          box.y + box.height <= viewport.height - 76,
      );
      const close = h.getByRole("button", {
        name: "Đóng điều khiển",
        exact: true,
      });
      assert(
        await close.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return el.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
          );
        }),
      );
      await h.screenshot({
        path: path.join(shots, "upgrade-" + viewport.width + ".png"),
      });
    }
    await h.setViewportSize({ width: 1280, height: 900 });
    await h.getByLabel("Chuyển động rạp").selectOption("cinema");
    await h
      .getByRole("button", { name: "Thử chuyển động", exact: true })
      .click();
    await h.waitForFunction(
      () =>
        document.querySelector(".scene canvas")?.dataset.motionActive ===
        "true",
    );
    await original();
    await h.waitForFunction(
      () =>
        document.querySelector(".scene canvas")?.dataset.motionActive ===
        "false",
    );
    const frames = await h
      .locator(".scene canvas")
      .getAttribute("data-render-frame");
    await h.waitForTimeout(1200);
    assert.equal(
      await h.locator(".scene canvas").getAttribute("data-render-frame"),
      frames,
    );
    await h.emulateMedia({ reducedMotion: "reduce" });
    await h.waitForFunction(
      () =>
        Array.from(document.querySelectorAll("button")).find(
          (b) => b.textContent === "Thử chuyển động",
        )?.disabled,
    );
    await h.emulateMedia({ reducedMotion: "no-preference" });
    await h.getByLabel("Chuyển động rạp").selectOption("off");
    checks.push(
      "opt-in finite camera pulse preserves player, returns to zero idle frames, reduced motion disables it; mobile/landscape expanded preferences fit and close remains hit-testable",
    );
    await h.evaluate(() => (document.querySelector("video").volume = 0.8));
    await h.getByLabel("Ưu tiên âm thanh").selectOption("interaction");
    await cmd(g, { type: "reaction", kind: "applause" });
    await h.waitForFunction(
      () => Math.abs(document.querySelector("video").volume - 0.2) < 0.01,
    );
    await openActions(h);
    await h
      .getByRole("button", { name: "Âm thanh tương tác: Bật", exact: true })
      .click();
    await h.waitForFunction(
      () => Math.abs(document.querySelector("video").volume - 0.8) < 0.01,
    );
    await h
      .getByRole("button", { name: "Âm thanh tương tác: Tắt", exact: true })
      .click();
    await h.waitForTimeout(100);
    assert.equal(
      await h.locator("video").evaluate((v) => v.volume),
      0.8,
      "unmute must not replay or re-duck",
    );
    await prefs();
    await original();
    await h.getByLabel("Ưu tiên âm thanh").selectOption("video");
    await play();
    await h.locator(".room-reaction").waitFor({ state: "detached" });
    await cmd(h, { type: "reaction", kind: "sad" });
    await h.waitForFunction(
      () =>
        window.__sfxBus && Math.abs(window.__sfxBus.gain.value - 0.035) < 0.002,
    );
    await h.waitForTimeout(150);
    assert.equal(await h.locator("video").evaluate((v) => v.volume), 0.8);
    await pause();
    await h.waitForFunction(
      () => Math.abs(window.__sfxBus.gain.value - 0.14) < 0.002,
    );
    await h.getByLabel("Ưu tiên âm thanh").selectOption("interaction");
    await h.waitForTimeout(3300);
    await cmd(g, { type: "reaction", kind: "troll" });
    await h.waitForFunction(
      () => Math.abs(document.querySelector("video").volume - 0.2) < 0.01,
    );
    await h.locator("video").evaluate((v) => (v.volume = 0.55));
    await h.waitForTimeout(1200);
    assert(
      Math.abs((await h.locator("video").evaluate((v) => v.volume)) - 0.55) <
        0.01,
      "manual volume must survive restore",
    );
    checks.push(
      "interaction priority ducks actual native volume for effects, mute restores without unmute replay; video priority attenuates actual effects GainNode without ducking media; manual volume changes preserved",
    );
    await h.waitForTimeout(2000);
    await cmd(h, { type: "reaction", kind: "applause" });
    await h
      .locator(".reaction-floats i")
      .first()
      .waitFor({ state: "attached" });
    assert.equal(await h.locator(".reaction-floats i").count(), 24);
    const cloud = await h.locator(".reaction-floats").boundingBox();
    assert(
      Math.abs(cloud.x + cloud.width / 2 - 640) < 2 &&
        Math.abs(cloud.y + cloud.height / 2 - 450) < 2,
    );
    assert(
      await h
        .locator(".reaction-floats")
        .evaluate(
          (el) =>
            getComputedStyle(el).pointerEvents === "none" &&
            Number(getComputedStyle(el).zIndex) > 40,
        ),
    );
    await h.waitForTimeout(450);
    await h.screenshot({
      path: path.join(shots, "upgrade-central-reactions.png"),
    });
    await h.locator(".reaction-floats").waitFor({ state: "detached" });
    const retained = await h.locator("video track").getAttribute("src");
    await cmd(h, { type: "add", url: "https://youtu.be/jfKfPfyJRdk" });
    await cmd(h, { type: "next", generation: (await state()).generation });
    await h.waitForFunction(() => window.__yt?.video);
    assert(await h.evaluate((u) => window.__revoked.includes(u), retained));
    assert(await caption.isDisabled());
    await h.waitForTimeout(2100);
    await cmd(g, { type: "reaction", kind: "applause" });
    await h.waitForFunction(() => window.__yt.volume === 20);
    await h.waitForFunction(() => window.__yt.volume === 80);
    checks.push(
      "24 anonymous central emoji stay pointer-transparent above open sheets; subtitles revoke on provider change, iframe captions disabled; YouTube fixture volume ducks/restores with same audio priority",
    );
    await h.route("https://drive.usercontent.google.com/**", (r) =>
      r.abort("failed"),
    );
    await h.route("https://drive.google.com/file/d/*/preview**", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: "<p>Controlled Drive preview</p>",
      }),
    );
    await cmd(h, {
      type: "add",
      url: "https://drive.google.com/file/d/1TVTrleolsrLJUzch6QUHnhIdJ54klpBi/view",
    });
    await cmd(h, { type: "next", generation: (await state()).generation });
    await h
      .getByRole("button", { name: "Đóng điều khiển", exact: true })
      .click();
    await h
      .getByRole("button", { name: "Mở bản xem trước Drive", exact: true })
      .click();
    await h.getByTitle("Xem trước Google Drive · không đồng bộ").waitFor();
    await prefs();
    assert(
      await caption.isDisabled(),
      "Drive preview cannot accept a native text track",
    );
    checks.push(
      "Drive preview disables native caption upload; iframe and native capability changes retain single-sheet UX",
    );
    assert.deepEqual(errors, []);
    const report = {
      passed: true,
      date: new Date().toISOString(),
      checks,
      errors,
      limitations:
        "Native H.264/AAC decode, TextTrack, WebAudio and WebGL are real Chromium/SwiftShader. MediaSession/WakeLock/device speech/YouTube are fixtures; not OS keys, physical screen-lock, acoustic quality, Mac M1 or stereoscopic-video certification.",
    };
    fs.writeFileSync(
      "evidence/cinema-upgrade.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(
      "Upgrade failure state",
      await h
        .evaluate(() => ({
          priority: document.querySelector('[aria-label="Ưu tiên âm thanh"]')
            ?.value,
          bus: window.__sfxBus
            ? {
                gain: window.__sfxBus.gain.value,
                state: window.__sfxBus.context.state,
                time: window.__sfxBus.context.currentTime,
              }
            : null,
          video: document.querySelector("video")
            ? {
                volume: document.querySelector("video").volume,
                time: document.querySelector("video").currentTime,
                paused: document.querySelector("video").paused,
              }
            : null,
          visibility: document.visibilityState,
          errors: Array.from(document.querySelectorAll('[role="alert"]')).map(
            (e) => e.textContent,
          ),
        }))
        .catch(() => ({ unavailable: true })),
    );
    await h
      .screenshot({ path: path.join(shots, "upgrade-failure.png") })
      .catch(() => {});
    throw error;
  } finally {
    if (session) await cmd(h, { type: "close" }).catch(() => {});
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
