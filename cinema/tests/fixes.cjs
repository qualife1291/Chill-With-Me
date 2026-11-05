const { chromium, executablePath } = require("./browser-runtime.cjs");
let activeBrowser;
const baseURL = process.env.CINEMA_TEST_BASE_URL || "http://localhost:8787";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
  throw Error("Room regression may only target a local runtime");
(async () => {
  const browser = await chromium.launch({
    executablePath,
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
      // Privacy settings may deny storage; the cinema must still be usable.
      Storage.prototype.getItem = () => {
        throw new DOMException("Blocked", "SecurityError");
      };
      Storage.prototype.setItem = () => {
        throw new DOMException("Blocked", "SecurityError");
      };
      window.__spoken = [];
      window.__utterances = [];
      const NativeWebSocket = window.WebSocket;
      window.WebSocket = class extends NativeWebSocket {
        constructor(...args) {
          super(...args);
          if (String(args[0]).includes("/api/rooms/"))
            window.__roomSocket = this;
        }
      };
      Object.defineProperty(window, "speechSynthesis", {
        value: {
          getVoices: () => [{ lang: "vi-VN" }],
          resume() {},
          cancel() {},
          speak(u) {
            window.__utterances.push(u);
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
  await host.locator(".lobby-stage canvas").waitFor();
  await host
    .getByRole("button", { name: "Khám phá phòng 03", exact: true })
    .focus();
  await host.keyboard.press("Enter");
  await host.waitForFunction(
    () => document.querySelector(".lobby-stage")?.dataset.previewSlot === "3",
  );
  await host.waitForFunction(
    () =>
      document.querySelector(".lobby-stage canvas")?.dataset.settled === "true",
  );
  await host.screenshot({ path: "evidence/lobby-desktop.png", fullPage: true });
  await host.setViewportSize({ width: 390, height: 844 });
  await host.screenshot({ path: "evidence/lobby-mobile.png", fullPage: true });
  if (
    await host.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Lobby overflows phone");
  await host.getByRole("button", { name: "Sảnh nhẹ", exact: true }).click();
  if (await host.locator(".lobby-stage canvas").count())
    throw Error("Light lobby kept a GPU canvas");
  await host.getByRole("button", { name: "Bật sảnh 3D", exact: true }).click();
  await host.setViewportSize({ width: 1440, height: 1000 });
  await host
    .getByRole("button", { name: "Khám phá phòng 01", exact: true })
    .click();
  await host.getByLabel("Nữ · Mage", { exact: true }).check();
  await host.waitForFunction(
    () =>
      document.querySelector(".lobby-stage canvas")?.dataset.femaleModel ===
      "ready",
  );
  await host.screenshot({
    path: "evidence/avatar-choice-lobby.png",
    fullPage: true,
  });
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
    .getByLabel("Link video / nhạc để bắt đầu")
    .fill("https://youtu.be/jfKfPfyJRdk");
  await quick.getByLabel("Link video / nhạc để bắt đầu").press("Enter");
  await host.waitForFunction(() => window.__yt?.video);
  await host.waitForFunction(
    () =>
      document.querySelector(".scene canvas")?.dataset.femaleModel === "ready",
  );
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
  await host.evaluate(() => window.__yt.config.events.onAutoplayBlocked());
  await host
    .getByText("Trình duyệt đang chặn tự phát.", { exact: false })
    .waitFor();
  await host
    .getByRole("button", { name: "Phát / bắt kịp phòng", exact: true })
    .click();
  if (await host.evaluate(() => window.__yt.getPlayerState() !== 1))
    throw Error("Autoplay recovery did not play");
  // Events from a cancelled utterance must never duck audio or show a stale error.
  await host
    .getByRole("button", { name: "Nghe thử giọng", exact: true })
    .click();
  await host.waitForFunction(() => window.__yt.volume === 20);
  await host.getByRole("button", { name: "Tắt đọc tin", exact: true }).click();
  await host.waitForFunction(() => window.__yt.volume === 80);
  await host.evaluate(() => {
    const u = window.__utterances.at(-1);
    u.onstart?.();
    u.onerror?.();
  });
  await host.waitForTimeout(100);
  if (await host.evaluate(() => window.__yt.volume !== 80))
    throw Error("Cancelled speech callback ducked video again");
  if (
    await host
      .getByText("Thiết bị chưa đọc được giọng.", { exact: false })
      .count()
  )
    throw Error("Cancelled speech callback showed stale error");

  // Exercise capped history with server-shaped WS deltas, without rate-limit bypasses
  // or hundreds of mutations to the backend. The normal chat above uses the real WS.
  const injectChat = async (count) =>
    host.evaluate(
      async ({ count, testTitle }) => {
        const lobby = await (await fetch("/api/rooms")).json();
        const slot = lobby.find((r) => r.title === testTitle).slot;
        const { room } = await (await fetch(`/api/rooms/${slot}/state`)).json();
        for (let i = 0; i < count; i++) {
          window.__roomSocket.dispatchEvent(
            new MessageEvent("message", {
              data: JSON.stringify({
                type: "chat",
                session: room.session,
                revision: room.revision,
                message: {
                  id: crypto.randomUUID(),
                  name: "History test",
                  text: "History " + i,
                },
              }),
            }),
          );
        }
      },
      { count, testTitle },
    );
  console.log("PASS cancelled speech events; checking capped chat history");
  await injectChat(100);
  console.log(
    "History injection",
    await host.evaluate(() => ({
      messages: document.querySelectorAll(".chat-history .message").length,
      socket: window.__roomSocket?.url,
    })),
  );
  await host.waitForFunction(
    () => document.querySelectorAll(".chat-history .message").length === 100,
  );
  await host.locator(".chat-history").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    el.dispatchEvent(new Event("scroll"));
  });
  await injectChat(1);
  console.log(
    "History scroll",
    await host.locator(".chat-history").evaluate((el) => ({
      top: el.scrollTop,
      height: el.scrollHeight,
      client: el.clientHeight,
    })),
  );
  await host.waitForFunction(() => {
    const el = document.querySelector(".chat-history");
    return el.scrollHeight - el.scrollTop - el.clientHeight < 2;
  });
  await host.locator(".chat-history").evaluate((el) => {
    el.scrollTop = 0;
    el.dispatchEvent(new Event("scroll"));
  });
  await injectChat(1);
  await host.waitForTimeout(100);
  if (await host.locator(".chat-history").evaluate((el) => el.scrollTop > 2))
    throw Error("New message stole position while reading history");

  // Switching focus to the composer releases held view keys even without keyup.
  await host.locator(".scene").focus();
  await host.keyboard.down("d");
  await host.waitForTimeout(200);
  await host.getByPlaceholder("Nói gì với mọi người…").focus();
  await host.waitForTimeout(1300);
  const focusYaw = Number(
    await host.locator(".screen-surface").getAttribute("data-yaw"),
  );
  await host.waitForTimeout(600);
  const focusYawAfter = Number(
    await host.locator(".screen-surface").getAttribute("data-yaw"),
  );
  await host.keyboard.up("d");
  if (Math.abs(focusYaw - focusYawAfter) > 0.2)
    throw Error("View keeps turning while typing");
  await host
    .getByRole("button", { name: "Nhìn màn chiếu", exact: true })
    .click();

  console.log("PASS capped chat and typing focus; checking camera regression");
  await guest.waitForFunction(
    () =>
      document.querySelector(".scene canvas")?.dataset.maleModel === "ready" &&
      document.querySelector(".scene canvas")?.dataset.femaleModel === "ready",
  );
  await guest.waitForFunction(
    () => document.querySelector(".screen-surface")?.dataset.avatar === "male",
  );
  await host.waitForFunction(
    () =>
      document.querySelector(".screen-surface")?.dataset.avatar === "female",
  );
  const viewerControls = await guest.evaluate(
    () => window.__yt.config.playerVars,
  );
  if (viewerControls.controls !== 0 || viewerControls.disablekb !== 1)
    throw Error("Viewer native controls still enabled");
  await host.waitForFunction(
    () =>
      Math.abs(Number(document.querySelector(".screen-surface")?.dataset.yaw)) <
      0.01,
  );
  const beforeYaw = Number(
    await host.locator(".screen-surface").getAttribute("data-yaw"),
  );
  await host.getByRole("button", { name: "Quay phải", exact: true }).click();
  await host.waitForTimeout(500);
  const afterYaw = Number(
    await host.locator(".screen-surface").getAttribute("data-yaw"),
  );
  if (afterYaw - beforeYaw > 1.2 || afterYaw - beforeYaw < 0.5)
    throw Error(
      "rotation is not one degree per click " +
        JSON.stringify({ beforeYaw, afterYaw }),
    );
  await host
    .getByRole("button", { name: "Nhìn màn chiếu", exact: true })
    .click();
  await host.waitForTimeout(1000);
  await host.bringToFront();
  const turnButton = await host
    .getByRole("button", { name: "Quay phải", exact: true })
    .boundingBox();
  await host.mouse.move(
    turnButton.x + turnButton.width / 2,
    turnButton.y + turnButton.height / 2,
  );
  await host.mouse.down();
  await host.waitForFunction(
    () => Number(document.querySelector(".screen-surface")?.dataset.yaw) > 2,
  );
  await host.evaluate(() => window.dispatchEvent(new Event("blur")));
  await host.waitForTimeout(1300);
  const padStop = Number(
    await host.locator(".screen-surface").getAttribute("data-yaw"),
  );
  await host.waitForTimeout(900);
  const padAfter = Number(
    await host.locator(".screen-surface").getAttribute("data-yaw"),
  );
  await host.mouse.up();
  if (padStop > 60 || Math.abs(padAfter - padStop) > 0.3)
    throw Error("Held D-pad keeps turning after window blur");
  await host
    .getByRole("button", { name: "Nhìn màn chiếu", exact: true })
    .click();
  await host.waitForFunction(
    () =>
      Math.abs(Number(document.querySelector(".screen-surface")?.dataset.yaw)) <
      0.01,
  );
  const padCenter = await host.locator(".pad-center").boundingBox();
  await host.mouse.move(
    padCenter.x + padCenter.width / 2,
    padCenter.y + padCenter.height / 2,
  );
  await host.mouse.down({ button: "right" });
  await host.mouse.move(
    padCenter.x + padCenter.width / 2 + 30,
    padCenter.y + padCenter.height / 2,
  );
  await host.mouse.up({ button: "right" });
  await host.waitForTimeout(200);
  if (
    Math.abs(
      Number(await host.locator(".screen-surface").getAttribute("data-yaw")),
    ) > 0.1
  )
    throw Error("Right-button pad drag turned head");
  await host.evaluate(() => {
    window.__yt.video = "ZZZZZZZZZZZ";
  });
  await host.waitForTimeout(700);
  if ((await host.evaluate(() => window.__yt.video)) !== "jfKfPfyJRdk")
    throw Error("YouTube recommendations escaped room queue");
  await openPanel(host, "Playlist");
  await host
    .getByLabel("Link video / nhạc")
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
  const neutralRigGaze = await host
    .locator(".scene canvas")
    .getAttribute("data-female-gaze");
  await host.mouse.move(50, 170);
  await host.mouse.down();
  await host.mouse.move(230, 100, { steps: 12 });
  await host.mouse.up();
  await host.waitForFunction(
    () => Number(document.querySelector(".screen-surface")?.dataset.yaw) > 30,
  );
  await host.waitForTimeout(500);
  const dragPose = await host.locator(".screen-surface").evaluate((el) => ({
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
  await host.waitForFunction(
    () =>
      document.querySelector(".scene canvas")?.dataset.femaleGazeSettled ===
      "true",
  );
  const gazeBefore = await host
    .locator(".scene canvas")
    .getAttribute("data-female-gaze");
  // A no-op server pose snapshot schedules another render without changing gaze.
  await host.evaluate(async () => {
    const rooms = await (await fetch("/api/rooms")).json();
    const slot = rooms.find((r) => r.open && r.count === 2).slot;
    const state = await (await fetch(`/api/rooms/${slot}/state`)).json();
    const me = state.room.members.find((m) => m.avatar === "female");
    const r = await fetch(`/api/rooms/${slot}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: state.room.session,
        commandId: crypto.randomUUID(),
        command: { type: "look", ...me.look },
      }),
    });
    if (!r.ok) throw Error("Gaze refresh failed");
  });
  await host.waitForTimeout(150);
  const gazeAfter = await host
    .locator(".scene canvas")
    .getAttribute("data-female-gaze");
  if (!neutralRigGaze || gazeBefore === neutralRigGaze)
    throw Error("Drag changed camera but not avatar head bone");
  if (gazeBefore !== gazeAfter)
    throw Error(
      "Idle rig accumulated head rotation " + gazeBefore + " -> " + gazeAfter,
    );
  if (!gazeAfter) throw Error("Host rig gaze is unavailable");
  await guest.waitForFunction(
    (expected) =>
      document.querySelector(".scene canvas")?.dataset.femaleGaze ===
        expected &&
      document.querySelector(".scene canvas")?.dataset.femaleGazeSettled ===
        "true",
    gazeAfter,
  );
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
    .getByLabel("Link video / nhạc để bắt đầu")
    .fill("https://youtu.be/jfKfPfyJRdk");
  await again.getByLabel("Link video / nhạc để bắt đầu").press("Enter");
  await host.waitForFunction(() => window.__yt.video === "jfKfPfyJRdk");
  await host.setViewportSize({ width: 1440, height: 1000 });
  const viewButton = host
    .locator(".cinema-toolbar")
    .getByRole("button", { name: "Góc nhìn 🎮", exact: true });
  if ((await viewButton.getAttribute("aria-pressed")) !== "true")
    await viewButton.click();
  const originalPlayer = await host.evaluateHandle(() => window.__yt);
  await host.getByRole("button", { name: "Mắt người", exact: true }).click();
  await host.waitForFunction(
    () => document.querySelector(".screen-surface")?.dataset.camera === "first",
  );
  await host.getByRole("button", { name: "Chế độ nhẹ", exact: true }).click();
  await host.locator(".screen-surface.flat").waitFor();
  await host.setViewportSize({ width: 844, height: 390 });
  const flatBounds = await host.locator(".screen-surface.flat").boundingBox();
  if (
    flatBounds.x < 0 ||
    flatBounds.y < 60 ||
    flatBounds.x + flatBounds.width > 844 - 154 ||
    flatBounds.y + flatBounds.height > 390
  )
    throw Error(
      "Light player clips or overlaps landscape controls " +
        JSON.stringify(flatBounds),
    );
  await host.setViewportSize({ width: 1440, height: 1000 });
  if (
    !(await host.evaluate((player) => window.__yt === player, originalPlayer))
  )
    throw Error("Light mode remounted video");
  await host.getByRole("button", { name: "Bật 3D", exact: true }).click();
  await host
    .getByRole("button", { name: "Trên cao · sau nhân vật", exact: true })
    .click();
  await host.waitForFunction(
    () => document.querySelector(".screen-surface")?.dataset.camera === "third",
  );
  if (
    !(await host.evaluate((player) => window.__yt === player, originalPlayer))
  )
    throw Error("Camera switch remounted video");
  await originalPlayer.dispose();
  const cameraPlayer = await host.evaluateHandle(() => window.__yt);
  for (const [label, mode] of [
    ["Sau vai", "shoulder"],
    ["Góc giao lưu", "side"],
  ]) {
    await host.getByRole("button", { name: label, exact: true }).click();
    await host.waitForFunction((mode) => {
      const s = document.querySelector(".screen-surface");
      return s?.dataset.camera === mode && s.dataset.transitioning === "false";
    }, mode);
    if (
      !(await host.evaluate((player) => window.__yt === player, cameraPlayer))
    )
      throw Error("New camera remounted player");
    const rect = await host.locator(".screen-surface").boundingBox();
    if (
      rect.x < -1 ||
      rect.y < 60 ||
      rect.x + rect.width > 1441 ||
      rect.y + rect.height > 1001
    )
      throw Error("New camera clips video " + label);
    await host.screenshot({ path: `evidence/view-${mode}.png` });
  }
  await cameraPlayer.dispose();
  await host.emulateMedia({ reducedMotion: "reduce" });
  await host.getByRole("button", { name: "Mắt người", exact: true }).click();
  await host.waitForFunction(
    () => {
      const s = document.querySelector(".screen-surface");
      return (
        s?.dataset.camera === "first" && s.dataset.transitioning === "false"
      );
    },
    {},
    { timeout: 1500 },
  );
  await host.emulateMedia({ reducedMotion: "no-preference" });
  await host
    .getByRole("button", { name: "Trên cao · sau nhân vật", exact: true })
    .click();
  await host.waitForFunction(() => {
    const s = document.querySelector(".screen-surface");
    return s?.dataset.camera === "third" && s.dataset.transitioning === "false";
  });
  const queuePlayer = await host.evaluateHandle(() => window.__yt);
  await openPanel(host, "Playlist");
  await openPanel(guest, "Playlist");
  await host
    .getByLabel("Link video / nhạc", { exact: true })
    .fill("https://evil.test/not-youtube");
  await host.getByRole("button", { name: "Thêm video", exact: true }).click();
  await host
    .getByRole("alert")
    .filter({ hasText: "Hãy nhập link YouTube, Google Drive công khai hoặc video MP4/WebM/MOV/MP3/M4A/Ogg/WAV qua HTTPS." })
    .waitFor();
  if (
    (await host
      .getByLabel("Link video / nhạc", { exact: true })
      .inputValue()) !== "https://evil.test/not-youtube"
  )
    throw Error("Rejected playlist URL was lost");
  await host
    .getByRole("button", { name: "Đóng thông báo", exact: true })
    .click();
  await host
    .getByLabel("Link video / nhạc", { exact: true })
    .fill("https://youtu.be/5qap5aO4i9A");
  await host.getByRole("button", { name: "Thêm video", exact: true }).click();
  await host.waitForFunction(
    () => document.querySelectorAll(".queue-item").length === 1,
  );
  await guest
    .getByLabel("Đề xuất video / nhạc", { exact: true })
    .fill("https://youtu.be/dQw4w9WgXcQ");
  await guest.getByRole("button", { name: "Gửi đề xuất", exact: true }).click();
  await host
    .locator(".suggestion-item")
    .filter({ hasText: "dQw4w9WgXcQ" })
    .waitFor();
  if (
    await guest
      .getByRole("button", { name: "Đưa video 1 xuống", exact: true })
      .count()
  )
    throw Error("Viewer received reorder controls");
  if ((await host.locator(".queue-item").count()) !== 1)
    throw Error("Suggestion entered queue without approval");
  await host.getByRole("button", { name: "Thêm đề xuất", exact: true }).click();
  await host.waitForFunction(
    () => document.querySelectorAll(".queue-item").length === 2,
  );
  await host
    .getByRole("button", { name: "Đưa video 2 lên", exact: true })
    .focus();
  await host.keyboard.press("Enter");
  await host.waitForFunction(() =>
    document.querySelector(".queue-item")?.textContent.includes("dQw4w9WgXcQ"),
  );
  await guest.waitForFunction(() =>
    document.querySelector(".queue-item")?.textContent.includes("dQw4w9WgXcQ"),
  );
  let staleEdits = 0,
    queueRefreshes = 0;
  const queueRefresh = (req) => {
    if (req.method() === "GET" && /\/api\/rooms\/[123]\/state$/.test(req.url()))
      queueRefreshes++;
  };
  host.on("request", queueRefresh);
  const staleQueueRoute = async (route) => {
    const body = route.request().postDataJSON();
    if (
      body?.command?.type === "reorder" &&
      body.command.direction === "down"
    ) {
      staleEdits++;
      if (staleEdits === 1)
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "STALE_QUEUE" }),
        });
    }
    await route.continue();
  };
  await host.route("**/api/rooms/*/command", staleQueueRoute);
  await host
    .getByRole("button", { name: "Đưa video 1 xuống", exact: true })
    .click();
  await host
    .getByRole("alert")
    .filter({ hasText: "Playlist vừa thay đổi" })
    .waitFor();
  if (
    staleEdits !== 1 ||
    queueRefreshes < 1 ||
    !(await host
      .locator(".queue-item")
      .first()
      .textContent()
      .then((t) => t.includes("dQw4w9WgXcQ")))
  )
    throw Error("Stale queue action was silently replayed");
  await host.unroute("**/api/rooms/*/command", staleQueueRoute);
  host.off("request", queueRefresh);
  await host
    .getByRole("button", { name: "Đóng thông báo", exact: true })
    .click();
  await host
    .getByRole("button", { name: "Đưa video 1 xuống", exact: true })
    .click();
  await host.waitForFunction(() =>
    document.querySelector(".queue-item")?.textContent.includes("5qap5aO4i9A"),
  );
  await host.setViewportSize({ width: 390, height: 844 });
  await host.screenshot({
    path: "evidence/playlist-mobile.png",
    fullPage: true,
  });
  if (
    await host.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    throw Error("Playlist controls overflow phone");
  for (const button of await host.locator(".queue-actions button").all()) {
    const r = await button.boundingBox();
    if (r.width < 44 || r.height < 44)
      throw Error("Playlist touch targets too small");
  }
  await host.setViewportSize({ width: 1440, height: 1000 });
  await host
    .locator(".queue-item")
    .filter({ hasText: "dQw4w9WgXcQ" })
    .getByRole("button", { name: "Xóa video", exact: true })
    .click();
  await host.waitForFunction(
    () => document.querySelectorAll(".queue-item").length === 1,
  );
  await host.getByRole("button", { name: "Xóa video", exact: true }).click();
  await host.waitForFunction(
    () => document.querySelectorAll(".queue-item").length === 0,
  );
  if (
    !(await host.evaluate(
      (player) => window.__yt === player && window.__yt.video === "jfKfPfyJRdk",
      queuePlayer,
    ))
  )
    throw Error("Queue editing replaced current playback");
  await queuePlayer.dispose();
  await openPanel(host, "Chat");
  await openPanel(guest, "Chat");
  await host.waitForFunction(
    () =>
      document.querySelector(".screen-surface")?.dataset.transitioning ===
      "false",
  );
  await host.bringToFront();
  await host.waitForTimeout(1500);
  const idleForeground = await host.evaluate(
    () => document.visibilityState === "visible" && document.hasFocus(),
  );
  if (!idleForeground)
    throw Error("Idle measurement requires a visible focused tab");
  if (
    (await host.locator(".scene canvas").getAttribute("data-render-frame")) ===
    null
  )
    throw Error("Renderer frame counter unavailable");
  const videoBefore = await host.evaluate(() => window.__yt.getCurrentTime());
  const idleBefore = Number(
    await host.locator(".scene canvas").getAttribute("data-render-frame"),
  );
  const idleStarted = performance.now();
  await host.waitForTimeout(1200);
  const idleAfter = Number(
    await host.locator(".scene canvas").getAttribute("data-render-frame"),
  );
  const idleWindowMs = performance.now() - idleStarted;
  if (
    !Number.isFinite(idleBefore) ||
    !Number.isFinite(idleAfter) ||
    idleAfter - idleBefore > 3
  )
    throw Error(
      "Idle scene keeps rendering " + JSON.stringify({ idleBefore, idleAfter }),
    );
  const videoAfter = await host.evaluate(() => window.__yt.getCurrentTime());
  if (
    videoAfter - videoBefore < 1 ||
    (await host.evaluate(() => window.__yt.getPlayerState())) !== 1
  )
    throw Error("Idle measurement did not keep video playing");
  console.log("PASS idle demand render", {
    frames: idleAfter - idleBefore,
    windowMs: Math.round(idleWindowMs),
  });
  await host.getByRole("button", { name: "Vẫy tay", exact: true }).click();
  await host.waitForFunction(
    () => document.querySelector(".screen-surface")?.dataset.action === "wave",
  );
  await host.waitForTimeout(650);
  await host.screenshot({ path: "evidence/wave-desktop.png" });
  const waving = await host.evaluate(async (testTitle) => {
    const rooms = await (await fetch("/api/rooms")).json();
    const slot = rooms.find((r) => r.title === testTitle).slot;
    return (
      await (await fetch(`/api/rooms/${slot}/state`)).json()
    ).room.members.find((m) => m.waveAt);
  }, testTitle);
  if (!waving?.waveAt)
    throw Error("Wave was not persisted in shared room state");
  await guest.waitForFunction(async (id) => {
    const rooms = await (await fetch("/api/rooms")).json();
    for (const summary of rooms.filter((r) => r.open)) {
      const state = await (
        await fetch(`/api/rooms/${summary.slot}/state`)
      ).json();
      if (state.room?.members.some((m) => m.id === id && m.waveAt)) return true;
    }
    return false;
  }, waving.id);

  await host.waitForFunction(
    () => document.querySelector(".screen-surface")?.dataset.action === "sit",
  );
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
        performance: {
          foreground: idleForeground,
          idleFrames: idleAfter - idleBefore,
          windowMs: Math.round(idleWindowMs),
          videoTimeAdvanced: videoAfter - videoBefore,
          mediaMocked: true,
          hardwareFpsBenchmark: false,
        },
        errors,
        checks: [
          "3D lobby door preview works by keyboard without entering rooms",
          "mobile lobby fits and light mode releases its canvas",
          "shoulder/social camera transitions retain player and keep video in bounds",
          "reduced-motion preference snaps the camera without travel animation",
          "male/female rigged GLB models load and selected avatar survives approval",
          "avatar choice previews the loaded female model in lobby",
          "idle rig head rotation does not accumulate across refreshed snapshots",
          "viewer suggestion requires host approval; viewer cannot reorder",
          "keyboard reorder syncs to guest without replacing current playback",
          "failed playlist submit preserves URL; mobile queue controls are 44px",
          "idle 3D scene stops continuous rendering while video remains active",
          "stale playlist action reports conflict, refreshes and is not replayed",
          "held D-pad stops after window blur and ignores right-button pad drag",
          "smoothed host rig head settles exactly and matches the avatar in guest renderer",
          "blocked localStorage does not break room, chat or voice controls",
          "autoplay-blocked feedback and user-gesture playback recovery",
          "cancelled speech callbacks cannot duck audio or show stale warnings",
          "100-message cap follows latest while preserving scrolled history",
          "typing focus releases held camera keys",
          "first/third/light view switches retain video player",
          "light player fits landscape screen and expanded controls",
          "wave action persists and is visible to another room member",
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
