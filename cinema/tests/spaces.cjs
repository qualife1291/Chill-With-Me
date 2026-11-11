// Local room state + real scene/models. Media is mocked; no hardware FPS claim.
const { chromium, executablePath } = require("./browser-runtime.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const base = "http://localhost:8787";
const shots = process.env.CINEMA_SCREENSHOT_DIR || "/tmp/cinema-spaces-review";
fs.mkdirSync(shots, { recursive: true });
const fixture = `window.YT={Player:class{constructor(el,c){this.config=c;this.state=2;this.volume=80;this.video='';this.time=0;window.__yt=this;const frame=document.createElement('iframe');frame.title='Space fixture';frame.srcdoc='<body style=margin:0;background:black;color:white>SPACE SCREEN</body>';el.replaceWith(frame);setTimeout(()=>c.events.onReady(),10)}get time(){return this._time+(this.state===1?(Date.now()-this._clock)/1000:0)}set time(t){this._time=t;this._clock=Date.now()}loadVideoById(v){this.video=v.videoId;this.state=1;this.time=v.startSeconds}cueVideoById(v){this.video=v.videoId;this.state=2;this.time=v.startSeconds}getCurrentTime(){return this.time}getPlayerState(){return this.state}getDuration(){return 600}getVideoData(){return{video_id:this.video}}getVolume(){return this.volume}setVolume(v){this.volume=v}seekTo(t){this.time=t}playVideo(){const t=this.time;this.state=1;this.time=t}pauseVideo(){const t=this.time;this.state=2;this.time=t}destroy(){}}};window.onYouTubeIframeAPIReady();`;
(async () => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const report = {
    passed: false,
    checks: [],
    spaces: [],
    pageErrors: [],
    limitations:
      "Local SwiftShader scenes and authenticated backend; mocked YouTube. No physical-device FPS, battery or actual media certification.",
  };
  const api = async (request, route, data, expected = 200) => {
    const r = await request.fetch(base + "/api" + route, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    const body = await r.json();
    assert.equal(r.status(), expected, body.error || "API response");
    return body;
  };
  try {
    for (const spec of [
      { id: "cinema", label: "Rạp chiếu" },
      { id: "lounge", label: "Lounge ấm áp" },
      { id: "rooftop", label: "Sân thượng đêm" },
    ]) {
      const host = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      const guest = await browser.newContext();
      const p = await host.newPage();
      let session;
      const slot = 1;
      p.setDefaultTimeout(30000);
      p.on("pageerror", (e) => report.pageErrors.push(e.message));
      const cmd = (c) =>
        api(host.request, `/rooms/${slot}/command`, {
          session,
          commandId: crypto.randomUUID(),
          command: c,
        });
      try {
        await api(host.request, "/session", {});
        assert(
          !(await api(host.request, "/rooms")).find((r) => r.slot === slot)
            .open,
          "Preserve occupied local slots",
        );
        await api(
          host.request,
          `/rooms/${slot}/create`,
          {
            name: "Bad",
            title: "Bad",
            capacity: 2,
            space: "arbitrary-model-url",
          },
          400,
        );
        await p.route("https://www.youtube.com/iframe_api", (r) =>
          r.fulfill({ contentType: "application/javascript", body: fixture }),
        );
        await p.goto(base);
        await p
          .locator(".room-card")
          .first()
          .getByRole("button", { name: "Tạo phòng", exact: true })
          .click();
        await p.getByPlaceholder("Mọi người gọi bạn là…").fill("Space host");
        await p
          .getByLabel("Tên phòng mới")
          .fill("Space " + spec.id + " " + Date.now());
        await p.getByRole("radio", { name: spec.label, exact: true }).check();
        if (spec.id === "lounge") {
          await p
            .getByLabel("Kiểu chỗ ngồi", { exact: true })
            .selectOption("sofa");
          await p.setViewportSize({ width: 390, height: 844 });
          assert(
            !(await p.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            )),
          );
          const card = await p.locator(".space-card").first().boundingBox();
          assert(card.height >= 44);
          const choices = await p.locator(".space-card").evaluateAll((nodes) =>
            nodes.map((el) => ({
              top: el.getBoundingClientRect().top,
              width: el.getBoundingClientRect().width,
            })),
          );
          assert(
            Math.max(...choices.map((c) => c.top)) -
              Math.min(...choices.map((c) => c.top)) <
              2,
            "Mobile choices should form one compact row",
          );
          assert(
            Math.max(...choices.map((c) => c.width)) -
              Math.min(...choices.map((c) => c.width)) <
              2,
            "Mobile choices need equal touch target widths",
          );
          await p
            .locator(".space-picker")
            .evaluate((el) => el.scrollIntoView({ block: "center" }));
          await p.screenshot({
            path: path.join(shots, "space-picker-mobile.png"),
          });
          await p.setViewportSize({ width: 1280, height: 900 });
        }
        await p
          .getByRole("dialog", { name: "Tạo phòng mới", exact: true })
          .getByRole("button", { name: "Tạo phòng", exact: true })
          .click();
        await p
          .getByRole("dialog", { name: "Thêm video để bắt đầu", exact: true })
          .waitFor();
        const state = await api(host.request, `/rooms/${slot}/state`);
        session = state.room.session;
        assert.equal(state.room.space, spec.id);
        await p
          .getByLabel("Link video / nhạc để bắt đầu")
          .fill("https://youtu.be/jfKfPfyJRdk");
        await p.getByLabel("Link video / nhạc để bắt đầu").press("Enter");
        await p.waitForFunction(
          () =>
            window.__yt?.video &&
            document.querySelector(".scene canvas")?.dataset.maleModel ===
              "ready",
        );
        assert.equal(
          await p.locator(".scene").getAttribute("data-space"),
          spec.id,
        );
        await p.evaluate(() => {
          window.__spacePlayer = window.__yt;
          window.__spaceFrame = document.querySelector(
            ".screen-surface iframe",
          );
        });
        await cmd({ type: "sit", instant: true });
        const g = await api(guest.request, "/session", {});
        await api(guest.request, `/rooms/${slot}/join`, {
          name: "Space guest",
          space: spec.id === "cinema" ? "rooftop" : "cinema",
        });
        const accepted = p.waitForResponse(
          (r) =>
            r.url().endsWith("/command") &&
            r.request().postDataJSON()?.command?.type === "accept",
        );
        await p
          .getByRole("dialog", { name: "Yêu cầu vào phòng", exact: true })
          .getByRole("button", { name: "Cho vào", exact: true })
          .click();
        assert(
          (await accepted).ok(),
          "Host admission must be acknowledged before reading guest state",
        );
        const guestState = await api(guest.request, `/rooms/${slot}/state`);
        assert.equal(
          guestState.room.space,
          spec.id,
          "Guest cannot override host's space",
        );
        const gp = await guest.newPage();
        await gp.goto(base + "/api/rooms");
        await gp.evaluate(
          (slot) =>
            new Promise((resolve, reject) => {
              const ws = new WebSocket(
                `ws://${location.host}/api/rooms/${slot}/ws`,
              );
              window.spaceSocket = ws;
              const t = setTimeout(
                () => reject(Error("guest socket timeout")),
                8000,
              );
              ws.onmessage = (e) => {
                const v = JSON.parse(e.data);
                if (v.status === "joined") {
                  clearTimeout(t);
                  resolve(true);
                }
              };
              ws.onerror = () => {
                clearTimeout(t);
                reject(Error("guest socket failed"));
              };
            }),
          slot,
        );
        await api(guest.request, `/rooms/${slot}/command`, {
          session,
          commandId: crypto.randomUUID(),
          command: { type: "sit", instant: true },
        });
        await p.bringToFront();
        await p
          .getByRole("button", { name: "Góc nhìn 🎮", exact: true })
          .click();
        await p
          .getByRole("combobox", { name: "Chọn góc nhìn", exact: true })
          .selectOption("first");
        await p.waitForTimeout(5500);
        const before = await p
          .locator(".scene canvas")
          .getAttribute("data-rig-updates");
        await p.locator(".scene").focus();
        await p.keyboard.down("ArrowRight");
        try {
          await p.waitForFunction(
            () =>
              Number(document.querySelector(".screen-surface")?.dataset.yaw) >
              5,
          );
        } finally {
          await p.keyboard.up("ArrowRight");
        }
        assert.equal(
          await p.locator(".scene canvas").getAttribute("data-rig-updates"),
          before,
          "Camera-only motion must not reevaluate settled peer skeletons",
        );
        await p
          .getByRole("button", { name: "Nhìn màn chiếu", exact: true })
          .click();
        await p
          .getByRole("combobox", { name: "Chọn góc nhìn", exact: true })
          .selectOption("orbit");
        await p.waitForFunction(
          () =>
            document.querySelector(".screen-surface")?.dataset.camera ===
              "orbit" &&
            document.querySelector(".screen-surface")?.dataset.transitioning ===
              "false" &&
            Math.abs(
              Number(document.querySelector(".screen-surface")?.dataset.yaw),
            ) < 0.01 &&
            Math.abs(
              Number(document.querySelector(".screen-surface")?.dataset.pitch),
            ) < 0.01,
        );
        await p.waitForTimeout(200);
        const idle = Number(
          await p.locator(".scene canvas").getAttribute("data-render-frame"),
        );
        await p.waitForTimeout(1200);
        assert.equal(
          Number(
            await p.locator(".scene canvas").getAttribute("data-render-frame"),
          ),
          idle,
        );
        assert.equal(
          await p.locator(".screen-surface").getAttribute("data-mode"),
          "projected",
        );
        if (spec.id === "cinema") {
          const beforeChat = Number(
            await p.locator(".scene canvas").getAttribute("data-render-frame"),
          );
          await api(guest.request, `/rooms/${slot}/command`, {
            session,
            commandId: crypto.randomUUID(),
            command: {
              type: "chat",
              text: "Chat should not redraw static geometry",
            },
          });
          await p.waitForTimeout(500);
          assert.equal(
            Number(
              await p
                .locator(".scene canvas")
                .getAttribute("data-render-frame"),
            ),
            beforeChat,
            "Chat alone must not render static 3D",
          );
        }
        assert(
          await p.evaluate(
            () =>
              window.__yt === window.__spacePlayer &&
              document.querySelector(".screen-surface iframe") ===
                window.__spaceFrame,
          ),
        );
        const stats = JSON.parse(
          await p.locator(".scene canvas").getAttribute("data-render-stats"),
        );
        assert(
          stats.calls <= 45 && stats.geometries <= 35,
          JSON.stringify(stats),
        );
        report.spaces.push({
          space: spec.id,
          renderer: stats,
          settledPeerRigUpdatesDuringCameraMotion: 0,
          idleFrames: 0,
        });
        await p
          .getByRole("button", { name: "Góc nhìn 🎮", exact: true })
          .click();
        await p.screenshot({
          path: path.join(shots, "space-" + spec.id + ".png"),
        });
        // In the public path, no per-frame stats/pose/matrix DOM serialization.
        if (spec.id === "rooftop") {
          await p.goto(base + "?diagnostics=0");
          await p
            .locator(".room-card")
            .first()
            .getByRole("button", { name: "Xin vào phòng", exact: true })
            .click();
          await p.getByPlaceholder("Mọi người gọi bạn là…").fill("Space host");
          await p
            .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
            .getByRole("button", { name: "Xin vào phòng", exact: true })
            .click();
          await p.waitForFunction(
            () =>
              window.__yt?.video &&
              document.querySelector(".screen-surface")?.dataset.mode ===
                "projected",
          );
          const clean = await p.evaluate(() => {
            const c = document.querySelector(".scene canvas"),
              s = document.querySelector(".screen-surface");
            return (
              !c.hasAttribute("data-rig-updates") &&
              !c.hasAttribute("data-render-stats") &&
              !s.hasAttribute("data-view-projection") &&
              !s.hasAttribute("data-yaw")
            );
          });
          assert(clean);
          assert.equal(await p.locator(".screen-surface iframe").count(), 1);
        }
        report.checks.push(
          spec.id +
            ": creation UI, metadata/admission, shared space, camera-only rig freeze, idle render and native world screen",
        );
      } catch (error) {
        try {
          console.error("Space diagnostic", spec.id, await p.evaluate(async () => ({
            surface: {...document.querySelector(".screen-surface")?.dataset},
            canvas: {...document.querySelector(".scene canvas")?.dataset},
            selected: document.querySelector('[aria-label="Chọn góc nhìn"]')?.value,
            visibility: document.visibilityState,
            notices: [...document.querySelectorAll('[role="alert"],[role="status"]')].map(n => n.textContent),
            room: await fetch("/api/rooms/1/state").then(r => r.json()).then(v => ({status:v.status,error:v.error,members:v.room?.members.map(m => ({name:m.name,connected:m.connected,seated:m.seated}))})),
          })));
          await p.screenshot({path:path.join(shots, "space-failure-" + spec.id + ".png")});
        } catch {}
        throw error;
      } finally {
        if (session) await cmd({ type: "close" }).catch(() => {});
        await host.close();
        await guest.close();
      }
    }
    assert.deepEqual(report.pageErrors, []);
    report.checks.push(
      "invalid create space rejected; join cannot change shared environment; mobile picker stays compact; chat-only updates do not redraw 3D; diagnostics-off playback remains projected",
    );
    report.passed = true;
    fs.writeFileSync(
      path.join(__dirname, "../evidence/spaces.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
