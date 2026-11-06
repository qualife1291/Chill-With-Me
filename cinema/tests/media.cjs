const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const { chromium, executablePath } = require("./browser-runtime.cjs");
const base = "http://localhost:8787",
  slot = 3;
(async () => {
  const fixture = path.join(os.tmpdir(), "chill-media-test.webm");
  execFileSync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=320x180:rate=24",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=440",
    "-t",
    "60",
    "-c:v",
    "libvpx",
    "-b:v",
    "220k",
    "-c:a",
    "libvorbis",
    fixture,
    "-loglevel",
    "error",
  ]);
  const mp3 = path.join(os.tmpdir(), "chill-media-test.mp3"),
    mov = path.join(os.tmpdir(), "chill-media-test.mov");
  execFileSync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=330",
    "-t",
    "15",
    "-c:a",
    "libmp3lame",
    mp3,
    "-loglevel",
    "error",
  ]);
  execFileSync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "testsrc2=size=320x180:rate=24",
    "-t",
    "15",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    mov,
    "-loglevel",
    "error",
  ]);
  const bytes = fs.readFileSync(fixture),
    checks = [],
    errors = [];
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--enable-unsafe-swiftshader",
      "--autoplay-policy=no-user-gesture-required",
      "--disable-background-timer-throttling",
    ],
  });
  const h = await browser.newPage({ viewport: { width: 1280, height: 900 } }),
    g = await browser.newPage();
  let session;
  const call = (p, path, data) =>
    p.evaluate(
      async ({ path, data }) => {
        const r = await fetch("/api" + path, {
          method: data === undefined ? "GET" : "POST",
          headers: { "Content-Type": "application/json" },
          body: data === undefined ? undefined : JSON.stringify(data),
        });
        return { ...(await r.json()), httpStatus: r.status };
      },
      { path, data },
    );
  const cmd = (p, command) =>
    call(p, `/rooms/${slot}/command`, {
      session,
      commandId: crypto.randomUUID(),
      command,
    });
  const media = (p) => p.locator("video.native-video");
  try {
    for (const p of [h, g]) {
      p.on("pageerror", (e) => errors.push(e.message));
      p.on("websocket", (ws) =>
        ws.on("framereceived", (f) => {
          try {
            const x = JSON.parse(String(f.payload));
            if (x.type === "command-error")
              console.log(
                JSON.stringify({
                  signal: x.signal?.type,
                  error: x.error,
                  who: p === h ? "host" : "guest",
                }),
              );
          } catch {}
        }),
      );
      p.setDefaultTimeout(60000);
      await p.addInitScript(() => {
        Object.defineProperty(window, "speechSynthesis", {
          value: {
            getVoices: () => [{ lang: "vi-VN", name: "Test Vietnamese" }],
            resume() {},
            cancel() {},
            speak(u) {
              u.onstart?.();
              setTimeout(() => u.onend?.(), 2200);
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
        window.__revoked = [];
        const revoke = URL.revokeObjectURL.bind(URL);
        URL.revokeObjectURL = (url) => {
          window.__revoked.push(url);
          revoke(url);
        };
        window.__pcs = [];
        const PC = window.RTCPeerConnection;
        window.RTCPeerConnection = class extends PC {
          constructor(...args) {
            super(...args);
            window.__pcs.push(this);
          }
        };
      });
      await p.goto(base);
    }
    const rooms = await call(h, "/rooms"); // arrays are spread into numeric keys
    assert(
      !Object.values(rooms).some((r) => r && r.slot === slot && r.open),
      "Test slot must be free",
    );
    const created = await call(h, `/rooms/${slot}/create`, {
      name: "Media host",
      title: "Media " + Date.now(),
      capacity: 3,
    });
    session = created.room?.session;
    assert.equal(created.httpStatus, 200);
    // App resumes the authenticated room through the normal query-link flow.
    await h.goto(base);

    await h
      .locator(".room-card")
      .filter({ hasText: created.room.title })
      .getByRole("button", { name: "Xin vào phòng" })
      .click();
    await h.getByPlaceholder("Mọi người gọi bạn là…").fill("Media host");
    // Existing member join returns joined, never creates another room.

    await h
      .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    const quick = h.getByRole("dialog", { name: "Thêm video để bắt đầu" });
    await quick.waitFor();
    await h.keyboard.press("Shift+Tab");
    assert(await quick.evaluate((el) => el.contains(document.activeElement)));
    for (let i = 0; i < 8; i++) await h.keyboard.press("Tab");
    assert(await quick.evaluate((el) => el.contains(document.activeElement)));
    assert(
      await h
        .locator(".scene")
        .evaluate((el) => el.inert || !!el.closest("[inert]")),
    );
    checks.push("modal keyboard containment and inert background");
    await quick.getByLabel("Chọn video để bắt đầu").setInputFiles({
      name: "broken.webm",
      mimeType: "video/webm",
      buffer: Buffer.from("broken"),
    });
    await quick.getByRole("alert").filter({ hasText: "codec" }).waitFor();
    checks.push("invalid local codec rejected before publish");
    await quick.getByLabel("Chọn video để bắt đầu").setInputFiles(fixture);
    await h.waitForFunction(
      () => document.querySelector("video")?.readyState >= 3,
    );
    checks.push("local file metadata and real host decode");
    const gid = (await call(g, "/session", {})).id;
    assert.equal(
      (await call(g, `/rooms/${slot}/join`, { name: "Media guest" }))
        .httpStatus,
      200,
    );
    assert.equal((await cmd(h, { type: "accept", id: gid })).httpStatus, 200);
    await g.reload();

    await g
      .locator(".room-card")
      .filter({ hasText: created.room.title })
      .getByRole("button", { name: "Xin vào phòng" })
      .click();
    await g.getByPlaceholder("Mọi người gọi bạn là…").fill("Media guest");

    await g
      .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await g
      .getByRole("button", {
        name: "Nhận qua phòng · tối đa 25 MB",
        exact: true,
      })
      .click();
    try {
      await g.waitForFunction(
        () => document.querySelector("video")?.readyState >= 3,
      );
    } catch (e) {
      console.log(await g.locator("body").innerText());
      for (const p of [h, g])
        console.log(
          await p.evaluate(() =>
            window.__pcs.map((pc) => ({
              connection: pc.connectionState,
              ice: pc.iceConnectionState,
              gathering: pc.iceGatheringState,
              localCandidates: (
                pc.localDescription?.sdp.match(/a=candidate/g) || []
              ).length,
              remoteCandidates: (
                pc.remoteDescription?.sdp.match(/a=candidate/g) || []
              ).length,
            })),
          ),
        );
      throw e;
    }
    const guestSrc = await media(g).getAttribute("src");
    assert(guestSrc.startsWith("blob:"));
    const transfer = await g.evaluate(async () => {
      const v = document.querySelector("video");
      const b = await (await fetch(v.src)).arrayBuffer();
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", b)),
      )
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
      return { size: b.byteLength, hash };
    });
    assert.equal(transfer.size, bytes.length);
    assert.equal(
      transfer.hash,
      require("node:crypto").createHash("sha256").update(bytes).digest("hex"),
    );
    checks.push(
      "two isolated browser profiles transfer exact file bytes via bounded authenticated room relay (managed Chromium blocks WebRTC UDP)",
    );
    await h.waitForTimeout(1000);
    await media(h).evaluate((v) => v.pause());
    await g.waitForFunction(
      () => document.querySelector("video")?.paused === true,
    );
    assert.equal((await call(h, `/rooms/${slot}/state`)).room.playing, false);
    checks.push("native host pause replicates");
    await h.waitForTimeout(800);
    await media(h).evaluate((v) => {
      v.currentTime = 8;
    });
    await g.waitForFunction(
      () => Math.abs(document.querySelector("video").currentTime - 8) < 0.4,
    );
    checks.push("native host seek replicates");
    await h.waitForTimeout(800);
    await media(h).evaluate((v) => v.play());
    await g.waitForFunction(() => !document.querySelector("video").paused);
    checks.push("native host play replicates");
    await media(h).evaluate((v) => {
      v.volume = 0.8;
    });
    await cmd(g, { type: "chat", text: "Kiểm tra giảm âm lượng nhạc" });
    await h.waitForFunction(
      () => Math.abs(document.querySelector("video").volume - 0.2) < 0.01,
    );
    await h.waitForFunction(
      () => Math.abs(document.querySelector("video").volume - 0.8) < 0.01,
    );
    checks.push("native media ducks and restores device speech volume");
    const before = await media(h).evaluate((v) => {
      v.dataset.identity = "stable";
      return v.currentTime;
    });
    await h
      .locator(".cinema-toolbar")
      .getByRole("button", { name: "Góc nhìn 🎮", exact: true })
      .click();
    assert.equal(await media(h).getAttribute("data-identity"), "stable");
    checks.push("camera leaves native video mounted");
    assert.equal(
      (await cmd(g, { type: "pause", generation: 1 })).error,
      "HOST_ONLY",
    );
    checks.push("guest cannot control room");
    // Route a real byte-range media response, preserving native media decoding.
    for (const p of [h, g])
      await p.route("https://media.example.test/test.webm", (route) => {
        const range = route.request().headers().range,
          m = range?.match(/bytes=(\d+)-(\d*)/),
          start = m ? Number(m[1]) : 0,
          end = m && m[2] ? Number(m[2]) : bytes.length - 1;
        return route.fulfill({
          status: m ? 206 : 200,
          contentType: "video/webm",
          headers: {
            "Accept-Ranges": "bytes",
            ...(m
              ? { "Content-Range": `bytes ${start}-${end}/${bytes.length}` }
              : {}),
          },
          body: bytes.subarray(start, end + 1),
        });
      });
    assert.equal(
      (
        await cmd(h, {
          type: "add",
          url: "https://media.example.test/test.webm",
        })
      ).httpStatus,
      200,
    );
    // End of the local video advances once to a different provider.
    await h.waitForTimeout(800);
    await media(h).evaluate((v) => {
      v.currentTime = v.duration - 0.3;
      return v.play();
    });
    await h.waitForFunction(
      () =>
        document.querySelector('[data-provider="url"] video')?.readyState >= 3,
    );
    await g.waitForFunction(
      () =>
        document.querySelector('[data-provider="url"] video')?.readyState >= 3,
    );
    const state = (await call(h, `/rooms/${slot}/state`)).room;
    assert.equal(state.generation, 2);
    assert.equal(state.queue.length, 0);
    checks.push("real ended advances mixed playlist exactly once");
    assert(await g.evaluate((url) => window.__revoked.includes(url), guestSrc));
    checks.push(
      "finished local file Blob URL revoked after provider transition",
    );
    const openQueue = h
      .locator(".cinema-toolbar")
      .getByRole("button", { name: "Playlist", exact: true });
    await openQueue.click();
    // MP3 local file uses the same authenticated transfer and native playback path.
    await h.getByLabel("Thêm file vào playlist").setInputFiles(mp3);
    await h.waitForFunction(
      async (slot) =>
        (await (await fetch(`/api/rooms/${slot}/state`)).json()).room.queue
          .length === 1,
      slot,
    );
    await cmd(h, { type: "next", generation: 2 });
    await g
      .getByRole("button", {
        name: "Nhận qua phòng · tối đa 25 MB",
        exact: true,
      })
      .click();
    await g.waitForFunction(
      () => document.querySelector(".audio-player video")?.readyState >= 2,
    );
    assert.equal(await media(h).evaluate((v) => v.videoWidth), 0);
    checks.push("real local MP3 decode and shared playback");
    const audioState = (await call(h, `/rooms/${slot}/state`)).room,
      audioId = audioState.current.source.fileId;
    await h.getByLabel("Thêm file vào playlist").setInputFiles(mov);
    await h.waitForFunction(
      async (slot) =>
        (await (await fetch(`/api/rooms/${slot}/state`)).json()).room.queue
          .length === 1,
      slot,
    );
    await media(h).evaluate((v) => {
      v.currentTime = v.duration - 0.2;
      return v.play();
    });
    await h.waitForFunction(
      () =>
        document.querySelector("video")?.src.startsWith("blob:") &&
        document.querySelector("video")?.videoWidth === 320,
    );
    await g
      .getByRole("button", {
        name: "Nhận qua phòng · tối đa 25 MB",
        exact: true,
      })
      .click();
    await g.waitForFunction(
      () => document.querySelector("video")?.videoWidth === 320,
    );
    const movState = (await call(h, `/rooms/${slot}/state`)).room;
    assert.equal(movState.generation, 4);
    assert.equal(movState.current.source.mime, "video/quicktime");
    assert(!JSON.stringify(movState).includes(audioId));
    checks.push(
      "real H.264 MOV decode; ended MP3 metadata removed from persisted room",
    );
    const mp3Bytes = fs.readFileSync(mp3);
    for (const p of [h, g])
      await p.route("https://media.example.test/music.mp3", (route) =>
        route.fulfill({ contentType: "audio/mpeg", body: mp3Bytes }),
      );
    await cmd(h, { type: "add", url: "https://media.example.test/music.mp3" });
    await h.waitForTimeout(800);
    await media(h).evaluate((v) => {
      v.currentTime = v.duration - 0.2;
      return v.play();
    });
    await h.waitForFunction(
      () => document.querySelector(".audio-player video")?.readyState >= 2,
    );
    await g.waitForFunction(
      () => document.querySelector(".audio-player video")?.readyState >= 2,
    );
    checks.push("direct HTTPS MP3 link decodes and plays");
    await h.waitForTimeout(800);
    await media(h).evaluate((v) => {
      v.currentTime = v.duration - 0.2;
      return v.play();
    });
    await h.getByRole("dialog", { name: "Thêm video để bắt đầu" }).waitFor();
    const final = (await call(h, `/rooms/${slot}/state`)).room;
    assert.equal(final.current, null);
    assert.equal(final.queue.length, 0);
    assert(!JSON.stringify(final).includes(movState.current.source.fileId));
    checks.push("final ended removes file metadata and clears playback");
    await h.setViewportSize({ width: 390, height: 844 });
    assert(
      !(await h.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
    );
    checks.push("phone modal layout does not overflow");
    await h.route("https://drive.usercontent.google.com/**", (route) =>
      route.abort("failed"),
    );
    await h.route("https://drive.google.com/file/d/*/preview**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><p>Controlled Drive preview fixture</p>",
      }),
    );
    await cmd(h, {
      type: "start",
      url: "https://drive.google.com/file/d/1TVTrleolsrLJUzch6QUHnhIdJ54klpBi/view",
      generation: final.generation,
    });
    await h
      .getByRole("button", { name: "Mở bản xem trước Drive", exact: true })
      .click();
    await h.getByTitle("Xem trước Google Drive · không đồng bộ").waitFor();
    assert(
      await h
        .getByText(
          "Bản xem trước do Google điều khiển, mỗi người tự phát/tua; không đồng bộ với phòng.",
          { exact: true },
        )
        .isVisible(),
    );
    checks.push(
      "controlled Drive failure offers explicit unsynchronized preview; no fake sync claim",
    );
    assert.deepEqual(errors, []);
    const report = {
      pass: true,
      checks,
      fileBytes: bytes.length,
      pageErrors: errors,
    };
    fs.writeFileSync(
      path.join(__dirname, "../evidence/media.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (session) await cmd(h, { type: "close" }).catch(() => {});
    await browser.close();
    for (const f of [fixture, mp3, mov]) fs.rmSync(f, { force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
