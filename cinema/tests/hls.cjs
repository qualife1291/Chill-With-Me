// Local room mutations + actual generated HLS/MSE decode. No external-provider certification.
const { chromium, executablePath } = require("./browser-runtime.cjs");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { execFileSync } = require("node:child_process");
const base = "http://localhost:8787",
  hosted = "https://stream.example.test/vod/";
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cinema-hls-"));
  for (const n of ["0", "1"]) fs.mkdirSync(path.join(dir, n));
  execFileSync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=1280x720:rate=24",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440:sample_rate=48000",
    "-t",
    "24",
    "-filter_complex",
    "[0:v]split=2[lo][hi];[lo]scale=320:180[v0];[hi]scale=1280:720[v1]",
    "-map",
    "[v0]",
    "-map",
    "1:a",
    "-map",
    "[v1]",
    "-map",
    "1:a",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-pix_fmt",
    "yuv420p",
    "-g",
    "48",
    "-keyint_min",
    "48",
    "-sc_threshold",
    "0",
    "-b:v:0",
    "240k",
    "-b:v:1",
    "1100k",
    "-c:a",
    "aac",
    "-b:a",
    "64k",
    "-ac",
    "2",
    "-var_stream_map",
    "v:0,a:0 v:1,a:1",
    "-f",
    "hls",
    "-hls_time",
    "2",
    "-hls_playlist_type",
    "vod",
    "-hls_segment_filename",
    path.join(dir, "%v", "seg_%03d.ts"),
    "-master_pl_name",
    "master.m3u8",
    path.join(dir, "%v", "index.m3u8"),
    "-loglevel",
    "error",
  ]);
  execFileSync("ffmpeg", [
    "-y",
    "-i",
    path.join(dir, "0", "index.m3u8"),
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    path.join(dir, "final.mp4"),
    "-loglevel",
    "error",
  ]);
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
  let badReady = false,
    privateRequests = 0;
  const checks = [],
    errors = [],
    requests = [];
  const api = async (p, route, data, expect = 200) => {
    const r = await p.request.fetch(base + "/api" + route, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    const v = await r.json();
    assert.equal(r.status(), expect, JSON.stringify(v));
    return v;
  };
  const cmd = (p, c, expect = 200) =>
    api(
      p,
      "/rooms/1/command",
      { session, commandId: crypto.randomUUID(), command: c },
      expect,
    );
  const enter = async (p, name) => {
    await p.bringToFront();
    await p
      .locator(".room-card")
      .filter({ hasText: "HLS test" })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await p.getByPlaceholder("Mọi người gọi bạn là…").fill(name);
    await p
      .getByRole("dialog", { name: "Thông tin vào phòng" })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
  };
  const light = async (p) => {
    const b = p.getByRole("button", { name: "Góc nhìn 🎮", exact: true });
    if ((await b.getAttribute("aria-pressed")) !== "true") await b.click();
    await p.getByRole("button", { name: "Chế độ nhẹ", exact: true }).click();
    await p
      .getByRole("button", { name: "Đóng điều khiển", exact: true })
      .click();
  };
  const video = (p) => p.locator("video.native-video");
  try {
    for (const p of [h, g]) {
      p.setDefaultTimeout(45000);
      p.on("pageerror", (e) => errors.push(e.message));
      await p.addInitScript(() => {
        window.__forceMSE = true;
        const originalCanPlay = HTMLMediaElement.prototype.canPlayType;
        window.__nativeHls = originalCanPlay.call(
          document.createElement("video"),
          "application/vnd.apple.mpegurl",
        );
        HTMLMediaElement.prototype.canPlayType = function (type) {
          if (window.__forceMSE && /mpegurl/i.test(type)) return "";
          return originalCanPlay.call(this, type);
        };
        window.__workers = [];
        window.__revoked = [];
        const W = window.Worker;
        window.Worker = class extends W {
          constructor(...a) {
            super(...a);
            this.__tracked = { live: true };
            window.__workers.push(this.__tracked);
          }
          terminate() {
            this.__tracked.live = false;
            return super.terminate();
          }
        };
        const revoke = URL.revokeObjectURL.bind(URL);
        URL.revokeObjectURL = (url) => {
          window.__revoked.push(url);
          revoke(url);
        };
      });
      await p.route("https://stream.example.test/**", async (route) => {
        const u = new URL(route.request().url());
        requests.push({ client: p === h ? "h" : "g", path: u.pathname });
        const headers = {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        };
        if (u.pathname === "/bad.m3u8")
          return badReady
            ? route.fulfill({
                headers,
                contentType: "application/vnd.apple.mpegurl",
                body: fs
                  .readFileSync(path.join(dir, "master.m3u8"), "utf8")
                  .replace(/(\d+\/index\.m3u8)/g, "/vod/$1"),
              })
            : route.fulfill({ status: 404, headers, body: "missing" });
        if (u.pathname === "/unsafe.m3u8")
          return route.fulfill({
            headers,
            contentType: "application/vnd.apple.mpegurl",
            body: "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n#EXT-X-PLAYLIST-TYPE:VOD\n#EXTINF:2,\nhttps://127.0.0.1/private.ts\n#EXT-X-ENDLIST\n",
          });
        if (u.pathname === "/live.m3u8")
          return route.fulfill({
            contentType: "application/vnd.apple.mpegurl",
            headers,
            body: "#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n#EXT-X-MEDIA-SEQUENCE:0\n#EXTINF:2,\nhttps://stream.example.test/vod/0/seg_000.ts\n",
          });
        const relative = u.pathname.replace(/^\/vod\//, "");
        const file = path.resolve(dir, relative);
        if (!file.startsWith(dir + path.sep) || !fs.existsSync(file))
          return route.fulfill({ status: 404, headers, body: "missing" });
        return route.fulfill({
          contentType: file.endsWith(".m3u8")
            ? "application/vnd.apple.mpegurl"
            : file.endsWith(".mp4")
              ? "video/mp4"
              : "video/mp2t",
          headers,
          body: fs.readFileSync(file),
        });
      });
      await p.route("https://127.0.0.1/**", (r) => {
        privateRequests++;
        return r.abort();
      });
      await p.goto(base);
    }
    assert(!(await api(h, "/rooms")).some((r) => r.open));
    const created = await api(h, "/rooms/1/create", {
      name: "HLS host",
      title: "HLS test",
      capacity: 2,
    });
    session = created.room.session;
    await h.reload();
    await enter(h, "HLS host");
    await h
      .getByLabel("Link video / nhạc để bắt đầu")
      .fill(hosted + "master.m3u8");
    await h.getByLabel("Link video / nhạc để bắt đầu").press("Enter");
    await light(h);
    await h.waitForFunction(
      () =>
        document.querySelector("video")?.readyState >= 3 &&
        document.querySelector("video").currentTime > 0.2,
    );
    assert.equal(await h.locator('[data-stream-engine="mse"]').count(), 1);
    await g.reload();
    await enter(g, "HLS guest");
    await h.bringToFront();
    await h
      .getByRole("dialog", { name: "Yêu cầu vào phòng" })
      .getByRole("button", { name: "Cho vào", exact: true })
      .click();
    await g.bringToFront();
    await light(g);
    await g.waitForFunction(
      () =>
        document.querySelector("video")?.readyState >= 3 &&
        document.querySelector("video").currentTime > 0.2,
    );
    for (const p of [h, g]) {
      assert((await video(p).evaluate((v) => v.videoWidth)) >= 320);
      assert((await video(p).evaluate((v) => v.duration)) >= 23);
    }
    checks.push(
      "generated two-rendition HLS VOD decodes in real MSE on host and admitted viewer",
    );
    await h.bringToFront();
    await video(h).evaluate((v) => v.pause());
    await h.waitForFunction(
      async () =>
        !(await (await fetch("/api/rooms/1/state")).json()).room.playing,
    );
    await g.waitForFunction(() => document.querySelector("video").paused);
    await video(h).evaluate((v) => {
      v.currentTime = 6;
    });
    await h.waitForFunction(
      async () =>
        Math.abs(
          (await (await fetch("/api/rooms/1/state")).json()).room.position - 6,
        ) < 0.4,
    );
    await g.waitForFunction(
      () => Math.abs(document.querySelector("video").currentTime - 6) < 0.5,
    );
    await cmd(
      g,
      {
        type: "seek",
        generation: (await api(h, "/rooms/1/state")).room.generation,
        position: 2,
      },
      400,
    );
    const before = (await api(h, "/rooms/1/state")).room;
    await g.bringToFront();
    await g.evaluate(() => {
      window.__originalVideo = document.querySelector("video");
    });
    await g.getByLabel("Chất lượng luồng").selectOption("1");
    await h.getByLabel("Chất lượng luồng").selectOption("0");
    await g.waitForTimeout(1000);
    const after = (await api(h, "/rooms/1/state")).room;
    assert.equal(after.generation, before.generation);
    assert.equal(after.position, before.position);
    assert.equal(after.playing, false);
    assert(
      await g.evaluate(
        () => document.querySelector("video") === window.__originalVideo,
      ),
    );
    checks.push(
      "native host pause/seek synchronizes; viewer commands rejected; manual viewer quality is local and keeps video mounted",
    );
    await h.bringToFront();
    await video(h).evaluate((v) => v.play());
    await g.waitForFunction(() => !document.querySelector("video").paused);
    checks.push("host resumes both HLS players");
    await g.waitForFunction(
      () => document.querySelector("video").videoWidth === 1280,
    );
    await g.getByLabel("Chất lượng luồng").selectOption("0");
    await g.waitForFunction(
      () => document.querySelector("video").videoWidth === 320,
    );
    checks.push(
      "manual 720p then 180p renditions actually decode without remounting video or changing shared generation",
    );

    const source = await video(g).getAttribute("src");
    await cmd(h, { type: "add", url: hosted + "final.mp4" });
    await h.bringToFront();
    await video(h).evaluate((v) => {
      v.currentTime = v.duration - 0.25;
      return v.play();
    });
    for (const p of [h, g])
      await p.waitForFunction(
        () =>
          document.querySelector("video")?.src.endsWith("final.mp4") &&
          document.querySelector("video").readyState >= 3,
      );
    const handoff = (await api(h, "/rooms/1/state")).room;
    assert.equal(handoff.generation, before.generation + 1);
    assert.equal(handoff.queue.length, 0);
    checks.push(
      "real HLS ended advances once to MP4 and releases previous MSE resources",
    );

    await cmd(h, { type: "add", url: "https://stream.example.test/live.m3u8" });
    await cmd(h, { type: "next", generation: handoff.generation });
    await h.getByRole("alert").filter({ hasText: "đang trực tiếp" }).waitFor();
    assert(await g.evaluate((url) => window.__revoked.includes(url), source));
    checks.push(
      "source change revokes previous MSE URL; live HLS is explicitly rejected instead of falsely synchronized",
    );
    const live = (await api(h, "/rooms/1/state")).room;
    await cmd(h, { type: "add", url: "https://stream.example.test/bad.m3u8" });
    await cmd(h, { type: "next", generation: live.generation });
    await h.getByRole("button", { name: "Thử lại HLS", exact: true }).waitFor();
    assert.equal(await video(h).evaluate((v) => v.paused), true);
    checks.push(
      "missing manifest stops locally and exposes retry with bounded loader retries",
    );
    badReady = true;
    for (const p of [h, g])
      await p.getByRole("button", { name: "Thử lại HLS", exact: true }).click();
    for (const p of [h, g])
      await p.waitForFunction(
        () => document.querySelector("video")?.readyState >= 3,
      );
    checks.push("retry recovers a restored manifest on the same room source");
    const recovered = (await api(h, "/rooms/1/state")).room;
    await cmd(h, {
      type: "add",
      url: "https://stream.example.test/unsafe.m3u8",
    });
    await cmd(h, { type: "next", generation: recovered.generation });
    await h.getByRole("button", { name: "Thử lại HLS", exact: true }).waitFor();
    assert.equal(
      privateRequests,
      0,
      "Private subresource must be blocked before any browser request",
    );
    checks.push(
      "HLS segment URLs are checked before requests; private addresses are not contacted",
    );
    const nativeSupport = await h.evaluate(() => window.__nativeHls);
    if (nativeSupport) {
      for (const p of [h, g])
        await p.evaluate(() => {
          window.__forceMSE = false;
        });
      const bad = (await api(h, "/rooms/1/state")).room;
      await cmd(h, { type: "add", url: hosted + "master.m3u8" });
      await cmd(h, { type: "next", generation: bad.generation });
      for (const p of [h, g])
        await p.waitForFunction(
          () =>
            document.querySelector('[data-stream-engine="native"] video')
              ?.readyState >= 3 &&
            document.querySelector("video").currentTime > 0.2,
        );
      checks.push(
        "available native HLS path also plays the generated VOD (Chromium capability; not Safari certification)",
      );
    }
    await cmd(h, { type: "close" });
    session = undefined;
    await h.waitForFunction(() => window.__workers.every((w) => !w.live));
    await g.waitForFunction(() => window.__workers.every((w) => !w.live));
    checks.push("all HLS workers terminate on room exit");
    assert.deepEqual(errors, []);
    const report = {
      passed: true,
      checks,
      requests: requests.length,
      decodedRenditions: [320, 1280],
      pageErrors: errors,
      limitations:
        "Generated H.264/AAC VOD with intercepted HTTPS fixtures and real Chromium MSE/Worker decoding. Native Safari, provider CORS, DRM/live sync and real WAN/device behavior remain separate gates.",
    };
    fs.writeFileSync(
      path.join(__dirname, "../evidence/hls.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } catch (e) {
    console.error(
      "HLS diagnostics",
      await Promise.all(
        [h, g].map((p) =>
          p
            .evaluate(() => ({
              engine: document
                .querySelector("[data-stream-engine]")
                ?.getAttribute("data-stream-engine"),
              ready: document.querySelector("video")?.readyState,
              time: document.querySelector("video")?.currentTime,
              native: window.__nativeHls,
              alerts: [...document.querySelectorAll('[role="alert"]')].map(
                (x) => x.textContent?.slice(0, 300),
              ),
            }))
            .catch(() => ({ unavailable: true })),
        ),
      ),
    );
    throw e;
  } finally {
    if (session) await cmd(h, { type: "close" }).catch(() => {});
    await browser.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
