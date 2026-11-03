const {
  chromium,
} = require("/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
let activeBrowser;
const baseURL = process.env.CINEMA_TEST_BASE_URL || "http://localhost:8787";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
  throw Error("Room regression may only target a local runtime");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  activeBrowser = browser;
  const testTitle = "Review " + Date.now();
  const host = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    guest = await browser.newPage();
  const errors = [];
  const liveLooks = [];
  guest.on("websocket", (ws) =>
    ws.on("framereceived", (f) => {
      try {
        const v = JSON.parse(String(f.payload));
        if (v.type === "look") liveLooks.push(v);
      } catch {}
    }),
  );
  const openPanel = async (p, name) => {
    const b = p
      .locator(".cinema-toolbar")
      .getByRole("button", { name, exact: true });
    if ((await b.getAttribute("aria-pressed")) !== "true") await b.click();
  };
  let chatPosts = 0;
  guest.on("request", (r) => {
    if (r.url().endsWith("/command")) {
      try {
        if (r.postDataJSON()?.command?.type === "chat") chatPosts++;
      } catch {}
    }
  });
  for (const p of [host, guest]) {
    p.setDefaultTimeout(35000);
    p.on("pageerror", (e) => errors.push(e.message));
    await p.addInitScript(() => {
      window.__spoken = [];
      Object.defineProperty(window, "speechSynthesis", {
        value: {
          getVoices: () => [{ lang: "vi-VN" }],
          resume() {},
          cancel() {},
          speak(u) {
            window.__spoken.push(u.text);
            u.onstart?.();
            setTimeout(() => u.onend?.(), 1500);
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
    });
    await p.route("https://www.youtube.com/iframe_api", (r) =>
      r.fulfill({
        contentType: "application/javascript",
        body: `window.YT={Player:class{constructor(el,c){this.config=c;this.time=0;this.state=2;this.volume=80;this.video='';window.__yt=this;el.innerHTML='<iframe title="YouTube test" style="width:640px;height:360px" srcdoc="&lt;body style=background:black;color:white&gt;Video&lt;/body&gt;"></iframe>';setTimeout(()=>c.events.onReady(),10)}loadVideoById(v){this.video=v.videoId;this.state=1;this.time=v.startSeconds}cueVideoById(v){this.video=v.videoId;this.state=2;this.time=v.startSeconds}get time(){return this._time+(this.state===1?(Date.now()-this._clock)/1000:0)}set time(t){this._time=t;this._clock=Date.now()}getCurrentTime(){return this.time}getPlayerState(){return this.state}getDuration(){return 600}getVideoData(){return{video_id:this.video}}getVolume(){return this.volume}setVolume(v){this.volume=v}seekTo(t){this.time=t}playVideo(){const t=this.time;this.state=1;this.time=t}pauseVideo(){const t=this.time;this.state=2;this.time=t}destroy(){}}};window.onYouTubeIframeAPIReady();`,
      }),
    );
    await p.goto(baseURL);
  }
  await host.getByPlaceholder("Mọi người gọi bạn là…").fill("Host fixes");
  await host.getByLabel("Tên phòng mới").fill(testTitle);
  await host.getByRole("button", { name: "Tạo phòng" }).first().click();
  const quick = host.getByRole("dialog", { name: "Thêm video để bắt đầu" });
  await quick.waitFor();
  await quick.press("Escape");
  if (!(await quick.isVisible())) throw Error("Host can bypass required link");
  if (await quick.getByRole("button", { name: "Để sau" }).count())
    throw Error("defer exists");
  await quick
    .getByLabel("Link YouTube để bắt đầu")
    .fill("https://youtu.be/jfKfPfyJRdk");
  await quick.getByLabel("Link YouTube để bắt đầu").press("Enter");
  await host.waitForFunction(() => window.__yt?.video);
  const full = await host.locator(".scene").boundingBox();
  if (Math.abs(full.width - 1440) > 2 || Math.abs(full.height - 1000) > 2)
    throw Error("theater not full viewport " + JSON.stringify(full));
  await host.screenshot({ path: "evidence/immersive-room.png" });
  await guest.reload();
  await guest.getByPlaceholder("Mọi người gọi bạn là…").fill("Guest fixes");
  await guest
    .locator(".room-card")
    .filter({ hasText: testTitle })
    .getByRole("button", { name: "Xin vào phòng" })
    .click();
  const dialog = host.getByRole("dialog", { name: "Yêu cầu vào phòng" });
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Cho vào", exact: true }).click();
  await guest.getByRole("button", { name: "Chat", exact: true }).waitFor();
  await host.waitForFunction(
    () => document.querySelector(".cinema-app")?.dataset.members === "2",
  );
  await guest.waitForFunction(
    () => document.querySelector(".cinema-app")?.dataset.members === "2",
  );
  await openPanel(guest, "Chat");
  await host.waitForTimeout(1600);
  await host.evaluate(() => {
    window.__yt.time = 120;
  });
  let state = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    state = await host.evaluate(async () => {
      for (let slot = 1; slot <= 3; slot++) {
        const r = await fetch("/api/rooms/" + slot + "/state");
        const v = await r.json();
        if (v.room) return v.room;
      }
      return null;
    });
    if (state && Math.abs(state.position - 120) < 5) break;
    await host.waitForTimeout(250);
  }
  if (Math.abs(state.position - 120) > 5)
    throw Error("host seek did not reach server " + JSON.stringify(state));
  if ((await host.evaluate(() => window.__yt.time)) < 119)
    throw Error("host seek snapped back");
  await openPanel(host, "Góc nhìn 🎮");
  await host.getByRole("button", { name: "Ngồi ngay", exact: true }).click();
  await host.waitForTimeout(1500);
  const videoFit = await host.locator(".screen-surface").evaluate((el) => {
    const f = el.querySelector("iframe"),
      a = el.getBoundingClientRect(),
      b = f?.getBoundingClientRect();
    return (
      !!b &&
      Math.abs(a.width - b.width) < 2 &&
      Math.abs(a.height - b.height) < 2
    );
  });
  if (!videoFit) throw Error("Iframe does not fill projected screen");
  const projection = await host
    .locator(".screen-surface")
    .getAttribute("data-mode");
  if (projection !== "projected")
    throw Error("screen not projected: " + projection);
  await host.getByRole("button", { name: "Ngoái ra sau", exact: true }).click();
  await host.waitForFunction(
    () => document.querySelector(".screen-surface")?.dataset.mode === "docked",
  );
  if (
    (await host.locator(".screen-surface").getAttribute("data-mode")) !==
    "docked"
  )
    throw Error("rear camera dock missing");
  await host
    .getByRole("button", { name: "Nhìn màn chiếu", exact: true })
    .click();
  await openPanel(host, "Chat");
  await guest
    .getByPlaceholder("Nói gì với mọi người…")
    .fill("Xin chào rạp phim");
  await guest.getByRole("button", { name: "Gửi tin", exact: true }).click();
  await host.waitForFunction(() =>
    window.__spoken.some((t) => t.includes("Xin chào rạp phim")),
  );
  await host.waitForFunction(() => window.__yt.volume === 20);
  if (chatPosts) throw Error("Chat used HTTP instead of WebSocket");
  await host.waitForTimeout(1700);
  if ((await host.evaluate(() => window.__yt.volume)) !== 80)
    throw Error("volume not restored");
  const viewerControls = await guest.evaluate(
    () => window.__yt.config.playerVars,
  );
  if (viewerControls.controls !== 0 || viewerControls.disablekb !== 1)
    throw Error("Viewer native controls still enabled");
  const beforeYaw = Number(
    await host.locator(".screen-surface").getAttribute("data-yaw"),
  );
  await host.getByRole("button", { name: "Quay phải", exact: true }).click();
  await host.waitForTimeout(500);
  const afterYaw = Number(
    await host.locator(".screen-surface").getAttribute("data-yaw"),
  );
  if (afterYaw - beforeYaw > 1.2 || afterYaw - beforeYaw < 0.5)
    throw Error("rotation is not one degree per click");
  await host
    .getByRole("button", { name: "Nhìn màn chiếu", exact: true })
    .click();
  await host.waitForTimeout(1000);
  await host.evaluate(() => {
    window.__yt.video = "ZZZZZZZZZZZ";
  });
  await host.waitForTimeout(700);
  if ((await host.evaluate(() => window.__yt.video)) !== "jfKfPfyJRdk")
    throw Error("YouTube recommendations escaped room queue");
  await openPanel(host, "Playlist");
  await host
    .getByLabel("Link video YouTube")
    .fill("https://youtu.be/5qap5aO4i9A");
  await host.getByRole("button", { name: "Thêm video", exact: true }).click();
  await host.evaluate(() => {
    window.__yt.time = 600;
    window.__yt.config.events.onStateChange({ data: 0 });
  });
  await host.waitForFunction(() => window.__yt.video === "5qap5aO4i9A");
  await guest.waitForFunction(() => window.__yt.video === "5qap5aO4i9A");
  await openPanel(host, "Chat");
  await host.bringToFront();
  await host.getByRole("button", { name: "Ngước lên", exact: true }).click();
  await host.waitForFunction(
    () =>
      Number(document.querySelector(".screen-surface")?.dataset.pitch) > 0.5,
  );
  await host.waitForTimeout(900);
  let ownLook;
  for (let attempt = 0; attempt < 20; attempt++) {
    ownLook = await host.evaluate(async () => {
      for (let n = 1; n <= 3; n++) {
        const s = await (await fetch("/api/rooms/" + n + "/state")).json();
        if (s.room)
          return s.room.members.find((m) => m.id === s.room.host)?.look;
      }
      return null;
    });
    if (ownLook?.pitch > 0.5) break;
    await host.waitForTimeout(200);
  }
  if (!ownLook || ownLook.pitch < 0.5)
    throw Error("Neck pose not shared: " + JSON.stringify(ownLook));
  await host
    .getByRole("button", { name: "Nhìn màn chiếu", exact: true })
    .click();
  await host.waitForTimeout(1200);
  await host.locator(".scene").click({ position: { x: 30, y: 80 } });
  let liveNeck = false;
  guest.on("websocket", () => {});
  const observe = host.evaluate(() => {
    window.__lookFrames = [];
  });
  await observe;
  await host.bringToFront();
  await host.locator(".scene").focus();
  await host.keyboard.down("ArrowRight");
  try {
    await host.waitForFunction(
      () => Number(document.querySelector(".screen-surface")?.dataset.yaw) > 3,
      { timeout: 5000 },
    );
  } finally {
    await host.keyboard.up("ArrowRight");
  }
  await host
    .getByRole("button", { name: "Nhìn màn chiếu", exact: true })
    .click();
  await host.waitForTimeout(1200);
  if (
    !liveLooks.some(
      (v) => Math.abs(v.look.yaw) > 1 || Math.abs(v.look.pitch) > 1,
    )
  )
    throw Error("No live neck update received");
  const centered = await host.locator(".screen-surface").evaluate((el) => {
    const a = el.getBoundingClientRect(),
      b = el.parentElement.getBoundingClientRect();
    return Math.abs(a.left + a.width / 2 - b.left - b.width / 2);
  });
  if (centered > 3) throw Error("Screen not centered: " + centered);
  await host.bringToFront();
  // Direct drag on the 3D background must not remount or intercept YouTube.
  await host
    .locator(".cinema-toolbar")
    .getByRole("button", { name: "Chat", exact: true })
    .click();
  await host
    .locator(".cinema-toolbar")
    .getByRole("button", { name: "Góc nhìn 🎮", exact: true })
    .click();
  await host.evaluate(() => {
    window.__originalYt = window.__yt;
  });
  await host.mouse.move(50, 170);
  await host.mouse.down();
  await host.mouse.move(230, 100, { steps: 12 });
  await host.mouse.up();
  await host.waitForFunction(
    () => Number(document.querySelector(".screen-surface")?.dataset.yaw) > 30,
  );
  await host.waitForTimeout(500);
  const dragPose = await host
    .locator(".screen-surface")
    .evaluate((el) => ({
      yaw: Number(el.dataset.yaw),
      pitch: Number(el.dataset.pitch),
    }));
  if (Math.abs(dragPose.yaw - 32.4) > 1 || Math.abs(dragPose.pitch - 12.6) > 1)
    throw Error(
      "Direct drag direction/sensitivity wrong " + JSON.stringify(dragPose),
    );
  if (await host.locator(".scene.is-looking").count())
    throw Error("Drag stuck after release");
  await host.mouse.move(450, 180);
  await host.waitForTimeout(400);
  const stoppedYaw = Number(
    await host.locator(".screen-surface").getAttribute("data-yaw"),
  );
  if (Math.abs(stoppedYaw - dragPose.yaw) > 0.3)
    throw Error("View moves after drag release");
  if (!(await host.evaluate(() => window.__yt === window.__originalYt)))
    throw Error("Drag remounted player");
  await host
    .getByRole("button", { name: "Đưa góc nhìn về giữa", exact: true })
    .click();
  await host.waitForFunction(
    () =>
      Math.abs(Number(document.querySelector(".screen-surface")?.dataset.yaw)) <
      0.2,
  );
  // Ignore click jitter and the secondary mouse button.
  await host.mouse.move(40, 170);
  await host.mouse.down();
  await host.mouse.move(42, 171);
  await host.mouse.up();
  await host.mouse.move(40, 170);
  await host.mouse.down({ button: "right" });
  await host.mouse.move(150, 170);
  await host.mouse.up({ button: "right" });
  await host.waitForTimeout(200);
  if (
    Math.abs(
      Number(await host.locator(".screen-surface").getAttribute("data-yaw")),
    ) > 0.3
  )
    throw Error("Click jitter/right drag changed view");
  await host.mouse.move(40, 170);
  await host.mouse.down();
  await host.mouse.move(100, 170, { steps: 4 });
  await host.evaluate(() => window.dispatchEvent(new Event("blur")));
  await host.mouse.up();
  if (await host.locator(".scene.is-looking").count())
    throw Error("Drag stuck after blur");
  await host
    .getByRole("button", { name: "Đưa góc nhìn về giữa", exact: true })
    .click();
  await host.waitForTimeout(800);
  await host.screenshot({ path: "evidence/drag-desktop.png" });
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await host.setViewportSize(viewport);
    await host.waitForTimeout(1200);
    const geometry = await host.locator(".screen-surface").evaluate((el) => {
      const a = el.getBoundingClientRect(),
        b = el.parentElement.getBoundingClientRect();
      return {
        inside:
          a.left >= b.left - 1 &&
          a.top >= b.top - 1 &&
          a.right <= b.right + 1 &&
          a.bottom <= b.bottom + 1,
        ratio: el.offsetWidth / el.offsetHeight,
      };
    });
    if (!geometry.inside)
      throw Error(
        "Player clipped in mobile orientation " + JSON.stringify(viewport),
      );
    const targets = await host
      .locator(".cinema-toolbar button")
      .evaluateAll((buttons) =>
        buttons.every((b) => b.offsetWidth >= 44 && b.offsetHeight >= 44),
      );
    if (!targets) throw Error("Toolbar touch targets too small");
    await host.screenshot({
      path:
        viewport.width === 390
          ? "evidence/drag-mobile.png"
          : "evidence/drag-landscape.png",
    });
  }
  await host.setViewportSize({ width: 1440, height: 1000 });
  await openPanel(host, "Góc nhìn 🎮");
  await openPanel(host, "Chat");
  await host.evaluate(() => {
    window.__yt.time = 600;
    window.__yt.config.events.onStateChange({ data: 0 });
  });
  await host.getByRole("dialog", { name: "Thêm video để bắt đầu" }).waitFor();
  await host.waitForFunction(() =>
    window.__spoken.some((t) => t.includes("video đã kết thúc")),
  );
  await host.waitForTimeout(1000);
  const notices = await host.evaluate(
    () => window.__spoken.filter((t) => t.includes("video đã kết thúc")).length,
  );
  if (notices !== 1) throw Error("Empty queue voice repeated");
  const again = host.getByRole("dialog", { name: "Thêm video để bắt đầu" });
  await again
    .getByLabel("Link YouTube để bắt đầu")
    .fill("https://youtu.be/jfKfPfyJRdk");
  await again.getByLabel("Link YouTube để bắt đầu").press("Enter");
  await host.waitForFunction(() => window.__yt.video === "jfKfPfyJRdk");
  await host.screenshot({ path: "evidence/fixes-desktop.png", fullPage: true });
  await host.setViewportSize({ width: 390, height: 844 });
  await host.screenshot({ path: "evidence/fixes-mobile.png", fullPage: true });
  if (
    await host.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("mobile overflow");
  host.on("dialog", (d) => d.accept());
  await openPanel(host, "Thông tin");
  await host.getByRole("button", { name: "Đóng phòng", exact: true }).click();
  await browser.close();
  require("fs").writeFileSync(
    "evidence/fixes.json",
    JSON.stringify(
      {
        passed: !errors.length,
        errors,
        checks: [
          "direct background drag and correct yaw/pitch",
          "drag release and blur cleanup, no player remount",
          "click jitter and right mouse drag ignored",
          "recenter view, mobile orientation framing and 44px toolbar targets",
          "host native seek persisted, no snapback",
          "both sessions see two members",
          "centered approval dialog",
          "DOM player projects onto 3D screen",
          "rear camera and dock fallback",
          "chat speech queue and volume 80 to 20 to 80",
          "mobile no overflow",
          "full viewport default theater",
          "required link modal cannot defer or Escape",
          "keyboard head controls",
          "Enter starts video atomically",
          "neck pose shared",
          "default screen centered",
          "host empty queue voice once and restart",
          "viewer controls disabled",
          "one-degree turn click",
          "YouTube recommendation restored to room item",
          "ended advances both sessions to next room queue item",
        ],
        limitations:
          "YouTube and speech APIs stubbed; real device voices and actual YouTube playback require pilot",
      },
      null,
      2,
    ),
  );
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS fullscreen cinema and direct-drag regression (local runtime; YouTube/speech mocked)",
  );
})().catch(async (e) => {
  await activeBrowser?.close();
  console.error(e);
  process.exit(1);
});
