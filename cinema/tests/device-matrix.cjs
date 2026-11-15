// Local mutations only. Real engines and WebGL/WebAudio/codecs; viewport/touch/hints are emulation.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const runtime = require("./browser-runtime.cjs");
const base = "http://localhost:8787",
  extended = process.argv.includes("--extended");
const names = (
  process.argv.find((a) => a.startsWith("--engines="))?.split("=")[1] ||
  "chromium"
).split(",");
assert(
  names.length &&
    names.every((n) => ["chromium", "firefox", "webkit"].includes(n)),
  "Known engines required",
);
const shots = process.env.CINEMA_SCREENSHOT_DIR || "/tmp/cinema-device-matrix";
fs.mkdirSync(shots, { recursive: true });
const profiles = [
  { id: "phone320", width: 320, height: 568, dpr: 2, touch: true },
  { id: "phone360", width: 360, height: 800, dpr: 2, touch: true },
  { id: "phone390", width: 390, height: 844, dpr: 3, touch: true },
  { id: "phone430", width: 430, height: 932, dpr: 3, touch: true },
  { id: "landscape", width: 844, height: 390, dpr: 2, touch: true },
  { id: "tablet", width: 768, height: 1024, dpr: 2, touch: true },
  { id: "tablet-landscape", width: 1024, height: 768, dpr: 2, touch: true },
  { id: "laptop", width: 1366, height: 768, dpr: 1, touch: false },
  { id: "retina-size", width: 1512, height: 982, dpr: 2, touch: false },
  { id: "wide", width: 1920, height: 1080, dpr: 1, touch: false },
  { id: "zoom200-equivalent", width: 640, height: 450, dpr: 2, touch: false },
  {
    id: "reduced-motion",
    width: 360,
    height: 640,
    dpr: 2,
    touch: true,
    reduced: true,
  },
];
const rows = [],
  engines = [],
  errors = [];
const reportPath = path.join(
  __dirname,
  "../evidence/" +
    (extended ? "device-matrix-extended" : "device-matrix") +
    ".json",
);
const fixture = path.join(os.tmpdir(), "chill-device-720.mp4");
execFileSync("ffmpeg", [
  "-y",
  "-f",
  "lavfi",
  "-i",
  "testsrc2=size=1280x720:rate=24",
  "-f",
  "lavfi",
  "-i",
  "sine=frequency=330:sample_rate=48000",
  "-t",
  "35",
  "-c:v",
  "libx264",
  "-preset",
  "ultrafast",
  "-profile:v",
  "baseline",
  "-b:v",
  "350k",
  "-pix_fmt",
  "yuv420p",
  "-c:a",
  "aac",
  "-b:a",
  "48k",
  "-movflags",
  "+faststart",
  fixture,
  "-loglevel",
  "error",
]);
const now = () => performance.now(),
  round = (n) => Math.round(n * 10) / 10;
const percentile = (values, p) =>
  values.length
    ? values.toSorted((a, b) => a - b)[Math.ceil(values.length * p) - 1]
    : null;
const api = async (p, route, data) => {
  const r = await p.request.fetch(base + "/api" + route, {
    method: data === undefined ? "GET" : "POST",
    headers: { Origin: base },
    data,
  });
  const b = await r.json();
  assert.equal(r.status(), 200, route + " " + JSON.stringify(b));
  return b;
};
async function install(p) {
  await p.addInitScript(() => {
    window.__deviceErrors = [];
    window.__deviceLongTasks = [];
    window.__deviceSockets = [];
    window.__deviceAudio = [];
    window.__deviceHidden = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => window.__deviceHidden,
    });
    const WS = window.WebSocket;
    window.WebSocket = class extends WS {
      constructor(...a) {
        super(...a);
        window.__deviceSockets.push(this);
      }
    };
    if (window.AudioContext) {
      const AC = window.AudioContext;
      window.AudioContext = class extends AC {
        constructor(...a) {
          super(...a);
          window.__deviceAudio.push(this);
        }
      };
    }
    if (PerformanceObserver.supportedEntryTypes?.includes("longtask"))
      new PerformanceObserver((l) => {
        window.__deviceLongTasks.push(...l.getEntries().map((e) => e.duration));
        window.__deviceLongTasks = window.__deviceLongTasks.slice(-256);
      }).observe({ type: "longtask", buffered: true });
  });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("dialog", (d) => d.accept());
  p.setDefaultTimeout(30000);
}
const activate = (p, locator, touch) =>
  touch ? locator.tap() : locator.click();
const pane = (p) =>
  p.getByRole("region", { name: "Trò chơi dân gian", exact: true });
async function inspect(p, label) {
  const failures = await p.evaluate(() => {
    const out = [],
      w = innerWidth,
      h = innerHeight;
    const vis = (e) =>
      e &&
      e.checkVisibility() &&
      e.getBoundingClientRect().width > 0 &&
      e.getBoundingClientRect().height > 0;
    if (document.documentElement.scrollWidth > w + 1)
      out.push("horizontal overflow");
    const modal = document.querySelector('[role="dialog"][aria-modal="true"]');
    const selectors = modal
      ? []
      : [
          ".sidebar:not([hidden])",
          ".game-sheet",
          ".room-controls",
          ".room-heading",
          ".action-choices:not([hidden])",
          ".readiness-body",
        ];
    const panels = selectors
      .flatMap((s) => [...document.querySelectorAll(s)])
      .filter(vis);
    if (panels.length > 1) out.push("multiple sheets");
    for (const e of modal ? [modal] : panels) {
      const b = e.getBoundingClientRect();
      if (b.left < -0.5 || b.right > w + 1 || b.top < -0.5 || b.bottom > h + 1)
        out.push("panel outside viewport: " + e.className);
    }
    const controls = modal
      ? [
          ...modal.querySelectorAll(
            ".actions button,.quick-entry-name input,.entry-disclosure>summary",
          ),
        ]
      : [
          ...document.querySelectorAll(
            ".cinema-toolbar button,.actions-trigger,.personal-hold,.game-return,.touch-navigation button,.reaction-strip>button,.game-sheet>header button,.composer #message,.composer button[aria-label='Gửi tin']",
          ),
        ];
    for (const el of controls) {
      if (!vis(el) || el.disabled) continue;
      const b = el.getBoundingClientRect();
      if (b.height < 43.9 || b.width < 43.9)
        out.push("small target: " + (el.ariaLabel || el.textContent));
      if (b.top < 0 || b.bottom > h + 1 || b.left < 0 || b.right > w + 1)
        out.push("control outside: " + (el.ariaLabel || el.textContent));
      const hit = document.elementFromPoint(
        b.x + b.width / 2,
        b.y + b.height / 2,
      );
      if (!el.contains(hit))
        out.push("covered control: " + (el.ariaLabel || el.textContent));
    }
    if (modal?.classList.contains("quick-game-entry")) {
      const rs = [...modal.querySelectorAll(".entry-disclosure")].map((e) =>
        e.getBoundingClientRect(),
      );
      if (
        rs.length > 1 &&
        (Math.max(...rs.map((r) => r.left)) -
          Math.min(...rs.map((r) => r.left)) >
          1 ||
          Math.max(...rs.map((r) => r.right)) -
            Math.min(...rs.map((r) => r.right)) >
            1)
      )
        out.push("optional settings misaligned");
    }
    return out;
  });
  assert.deepEqual(failures, [], label);
}
// visualViewport resize and the app's rAF geometry update are asynchronous,
// especially in WebKit. Measure settled layout, retaining strict bounds/hit checks.
async function waitForViewportLayout(p) {
  await p.waitForFunction(
    () => {
      const node = document.querySelector(".cinema-app");
      const applied = parseFloat(
        node?.style.getPropertyValue("--panel-viewport") || "",
      );
      return Math.abs(applied - (visualViewport?.height ?? innerHeight)) < 1;
    },
    null,
    { timeout: 3000 },
  );
  await p.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => resolve())),
  );
}
async function capture(p, row, label) {
  const name = `device-${row.engine}-${row.profile}-${label}.png`;
  await p.screenshot({ path: path.join(shots, name) });
  row.screenshots.push(name);
}
async function gamePanel(p) {
  if (!(await pane(p).isVisible())) {
    const shortcut = p.getByRole("button", {
      name: "Về bàn chơi",
      exact: true,
    });
    if (await shortcut.isVisible()) {
      await shortcut.click();
      await pane(p).waitFor();
      return;
    }
    await runtime.openActions(p);
    await p
      .getByRole("button", { name: "Trò chơi dân gian", exact: true })
      .click();
    await pane(p).waitFor();
  }
}
async function runProfile(browser, engine, profile) {
  const row = {
    engine,
    profile: profile.id,
    viewport: { width: profile.width, height: profile.height },
    dpr: profile.dpr,
    input: profile.touch ? "emulated touch" : "mouse/keyboard",
    passed: false,
    screenshots: [],
    checks: [],
  };
  rows.push(row);
  const opts = {
    viewport: row.viewport,
    deviceScaleFactor: profile.dpr,
    hasTouch: profile.touch,
    reducedMotion: profile.reduced ? "reduce" : "no-preference",
    ...(engine !== "firefox" ? { isMobile: profile.touch } : {}),
  };
  const hc = await browser.newContext(opts),
    gc = await browser.newContext(opts),
    h = await hc.newPage();
  let g, session, cdp;
  const startErrors = errors.length;
  const state = async (p = h) => (await api(p, "/rooms/1/state")).room;
  const cmd = (command, p = h) =>
    api(p, "/rooms/1/command", {
      session,
      commandId: crypto.randomUUID(),
      command,
    });
  const game = async (operation, p = h) =>
    cmd(
      {
        type: "game",
        expectedRevision: (await state(p)).gameRevision || 0,
        operation,
      },
      p,
    );
  try {
    await install(h);
    if (engine === "chromium") {
      cdp = await hc.newCDPSession(h);
      await cdp.send("Performance.enable");
      if (profile.constrained) {
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await cdp.send("Network.enable");
        await cdp.send("Network.emulateNetworkConditions", {
          offline: false,
          latency: 150,
          downloadThroughput: (3 * 1024 * 1024) / 8,
          uploadThroughput: (1024 * 1024) / 8,
        });
        await h.addInitScript(() => {
          Object.defineProperty(navigator, "hardwareConcurrency", {
            get: () => 2,
          });
          Object.defineProperty(navigator, "deviceMemory", { get: () => 2 });
          Object.defineProperty(navigator, "connection", {
            get: () => Object.assign(new EventTarget(), { saveData: true }),
          });
        });
        row.constraints = {
          cpuRate: 4,
          latencyMs: 150,
          downMbps: 3,
          coresHint: 2,
          memoryGiBHint: 2,
          saveDataHint: true,
        };
      }
    }
    await h.goto(base + "/?diagnostics=1", { waitUntil: "domcontentloaded" });
    assert(
      (await api(h, "/rooms")).every((r) => !r.open),
      "All local slots must be free; preserve unrelated rooms",
    );
    const launch = h.getByRole("button", {
      name: "Chơi Ô ăn quan",
      exact: true,
    });
    await launch.waitFor();
    await h.locator(".lobby-activities").scrollIntoViewIfNeeded();
    assert.equal(await h.getByRole("dialog").count(), 0);
    await capture(h, row, "lobby");
    row.navigation = await h.evaluate(() => {
      const n = performance.getEntriesByType("navigation")[0];
      return {
        ttfbMs: n.responseStart - n.startTime,
        domContentLoadedMs: n.domContentLoadedEventEnd - n.startTime,
        fcpMs:
          performance
            .getEntriesByType("paint")
            .find((e) => e.name === "first-contentful-paint")?.startTime ??
          null,
        resourceBytes: performance
          .getEntriesByType("resource")
          .reduce((n, e) => n + e.transferSize, 0),
      };
    });
    await activate(h, launch, profile.touch);
    const modal = h.getByRole("dialog", { name: "Tạo phòng mới", exact: true });
    await modal.waitFor();
    assert.equal(await modal.locator("input").count(), 1);
    assert.equal(await modal.locator("canvas").count(), 0);
    await inspect(h, profile.id + " quick create");
    await capture(h, row, "entry");
    await h
      .getByPlaceholder("Mọi người gọi bạn là…")
      .fill("Host " + profile.id);
    const response = h.waitForResponse(
      (r) =>
        r.url().endsWith("/rooms/1/create") && r.request().method() === "POST",
    );
    let at = now();
    await activate(
      h,
      modal.getByRole("button", { name: "Tạo phòng", exact: true }),
      profile.touch,
    );
    const created = await (await response).json();
    session = created.room?.session;
    assert(session);
    await pane(h).waitFor();
    row.createToGameMs = round(now() - at);
    assert.equal((await state()).game.kind, "oaq");
    assert.equal(await h.getByLabel("Link video / nhạc để bắt đầu").count(), 0);
    row.hostCreateActions = 2;
    row.checks.push(
      "single game click + compact name/submit; no media dialog or optional preview renderer",
    );
    g = await gc.newPage();
    await install(g);
    await g.goto(base);
    await activate(
      g,
      g
        .locator(".room-card")
        .first()
        .getByRole("button", { name: "Chơi cùng", exact: true }),
      profile.touch,
    );
    const gm = g.getByRole("dialog", {
      name: "Thông tin vào phòng",
      exact: true,
    });
    await inspect(g, profile.id + " quick join");
    await g
      .getByPlaceholder("Mọi người gọi bạn là…")
      .fill("Peer " + profile.id);
    await activate(
      g,
      gm.getByRole("button", { name: "Xin vào phòng", exact: true }),
      profile.touch,
    );
    await h.bringToFront();
    await activate(
      h,
      h
        .getByRole("dialog", { name: "Yêu cầu vào phòng" })
        .getByRole("button", { name: "Cho vào", exact: true }),
      profile.touch,
    );
    await pane(g).waitFor();
    assert.equal((await state()).game.players.length, 2);
    assert.equal(
      await pane(g)
        .getByRole("button", { name: "Tham gia ván", exact: true })
        .count(),
      0,
    );
    await activate(
      h,
      pane(h).getByRole("button", { name: "Bắt đầu ván", exact: true }),
      profile.touch,
    );
    await pane(h).locator(".oaq-board").waitFor();
    await inspect(h, profile.id + " flat game");
    row.guestJoinActions = 2;
    row.checks.push(
      "two real profiles, explicit play intent auto-enrolls after host approval; one start button",
    );
    await h.evaluate(() => {
      window.__matrixCanvas = document.querySelector(".scene canvas");
    });
    await activate(
      h,
      pane(h).getByRole("button", { name: "Bàn 3D", exact: true }),
      profile.touch,
    );
    await h.waitForFunction(
      () => document.querySelector(".scene canvas")?.dataset.gameKind === "oaq",
    );
    await h.waitForFunction(
      () =>
        document.querySelector(".scene canvas")?.dataset.maleModel === "ready",
    );
    await h.waitForTimeout(1300);
    await inspect(h, profile.id + " 3D game");
    await capture(h, row, "3d");
    row.scene = await h.evaluate(() => {
      const c = document.querySelector(".scene canvas"),
        p = document.querySelector(".game-sheet"),
        a = c.getBoundingClientRect(),
        b = p.getBoundingClientRect(),
        gl = c.getContext("webgl2");
      return {
        sameCanvas: c === window.__matrixCanvas,
        bufferWidth: c.width,
        bufferHeight: c.height,
        cssWidth: a.width,
        cssHeight: a.height,
        nonOverlapping: a.right <= b.left + 1 || a.bottom <= b.top + 1,
        msaa: gl.getContextAttributes().antialias,
        gpuObjects: JSON.parse(c.dataset.gameResources || "{}"),
        contextCount: document.querySelectorAll(".scene canvas").length,
      };
    });
    row.deviceHints = await h.evaluate(() => ({
      pointerCoarse: matchMedia("(pointer:coarse)").matches,
      dpr: devicePixelRatio,
      cores: navigator.hardwareConcurrency,
      memoryGB: navigator.deviceMemory ?? null,
    }));
    row.scene.effectiveDpr =
      Math.round((1000 * row.scene.bufferWidth) / row.scene.cssWidth) / 1000;
    assert(
      row.scene.effectiveDpr <=
        (row.deviceHints.pointerCoarse || profile.constrained ? 0.76 : 1.31),
    );
    assert(
      row.scene.sameCanvas &&
        row.scene.nonOverlapping &&
        row.scene.contextCount === 1 &&
        !row.scene.msaa,
      JSON.stringify(row.scene),
    );
    const frames = () =>
      h.evaluate(() =>
        Number(document.querySelector(".scene canvas").dataset.gameFrame),
      );
    let f = await frames();
    const rigBefore = await h
      .locator(".scene canvas")
      .evaluate((c) => Number(c.dataset.rigUpdates || 0));
    await h.waitForTimeout(600);
    row.idleFrames = (await frames()) - f;
    row.idleDiagnostics = await h.locator(".scene canvas").evaluate((c) => ({
      loop: c.dataset.gameLoop,
      rigUpdates: Number(c.dataset.rigUpdates || 0),
    }));
    row.hiddenRigIdleUpdates = row.idleDiagnostics.rigUpdates - rigBefore;
    assert.equal(
      row.hiddenRigIdleUpdates,
      0,
      "hidden avatar rig must not process its walk intro",
    );
    assert(row.idleFrames <= 1, JSON.stringify(row));
    f = await frames();
    await h.getByLabel("Ô muốn rải").selectOption("2");
    await h.waitForTimeout(350);
    row.selectionFrames = (await frames()) - f;
    assert(row.selectionFrames <= 3, JSON.stringify(row));
    f = await frames();
    await g.evaluate(async (session) => {
      for (let i = 0; i < 8; i++) {
        window.__deviceSockets.at(-1).send(
          JSON.stringify({
            type: "look",
            session,
            yaw: i % 2 ? 30 : -30,
            pitch: 0,
            bodyYaw: 0,
          }),
        );
        await new Promise((r) => setTimeout(r, 80));
      }
    }, session);
    await h.waitForTimeout(250);
    row.peerPoseFrames = (await frames()) - f;
    assert(row.peerPoseFrames <= 2, JSON.stringify(row));
    row.checks.push(
      "same renderer, fitted non-overlapping 3D viewport, finite/static demand rendering",
    );
    await h.getByLabel("Ô muốn rải").selectOption("1");
    await activate(
      h,
      pane(h).getByRole("button", { name: "↺ Rải ngược chiều", exact: true }),
      profile.touch,
    );
    await g.waitForFunction(() =>
      document.querySelector(".game-turn")?.textContent.includes("Peer"),
    );
    await h
      .getByRole("button", { name: "Đóng bảng trò chơi", exact: true })
      .click();
    const toolbar = (label) =>
      h
        .locator(".cinema-toolbar")
        .getByRole("button", { name: label, exact: true });
    for (const label of ["Chat", "Playlist", "Mọi người", "Góc nhìn 🎮"]) {
      await toolbar(label).click();
      await inspect(h, profile.id + " " + label);
      if (label === "Góc nhìn 🎮") {
        const readZoom = () =>
          h.locator(".screen-surface").evaluate((e) => Number(e.dataset.zoom));
        const z = await readZoom();
        const out = h.getByRole("button", {
          name: "Thu nhỏ góc nhìn",
          exact: true,
        });
        if (await out.isVisible()) {
          await out.scrollIntoViewIfNeeded();
          await activate(h, out, profile.touch);
          await h.waitForFunction(
            (z) =>
              Number(document.querySelector(".screen-surface").dataset.zoom) >
              z + 2.5,
            z,
          );
          await activate(
            h,
            h.getByRole("button", { name: "Phóng gần góc nhìn", exact: true }),
            profile.touch,
          );
          await h.waitForFunction(
            (z) =>
              Math.abs(
                Number(document.querySelector(".screen-surface").dataset.zoom) -
                  z,
              ) < 0.1,
            z,
          );
          row.oneHandZoom = true;
        } else {
          assert(
            profile.width > 1100 && profile.height > 500,
            "zoom buttons must be visible on the small-layout breakpoint",
          );
          await h
            .getByRole("button", { name: "Chạm để nhìn quanh", exact: true })
            .click();
          await toolbar("Góc nhìn 🎮").click();
          const b = await h.locator(".scene-gesture-layer").boundingBox();
          assert(b);
          await h.mouse.move(b.x + b.width * 0.38, b.y + b.height * 0.48);
          await h.mouse.wheel(0, 100);
          await h.waitForFunction(
            (z) =>
              Number(document.querySelector(".screen-surface").dataset.zoom) >
              z + 2.5,
            z,
          );
          await h.mouse.wheel(0, -100);
          await h.waitForFunction(
            (z) =>
              Math.abs(
                Number(document.querySelector(".screen-surface").dataset.zoom) -
                  z,
              ) < 0.1,
            z,
          );
          row.mouseWheelZoom = true;
          await toolbar("Góc nhìn 🎮").click();
          await h
            .getByRole("button", { name: "Trở lại bấm video", exact: true })
            .click();
        }
        if (cdp && profile.id === "phone320") {
          await h
            .getByRole("button", { name: "Chạm để nhìn quanh", exact: true })
            .click();
          await toolbar("Góc nhìn 🎮").click();
          const b = await h.locator(".scene-gesture-layer").boundingBox(),
            x = b.x + b.width * 0.45,
            y = b.y + b.height * 0.42;
          const before = await h.evaluate(() => ({
            zoom: Number(
              document.querySelector(".screen-surface").dataset.zoom,
            ),
            yaw: Number(document.querySelector(".screen-surface").dataset.yaw),
            scale: visualViewport.scale,
          }));
          const touch = (type, points) =>
            cdp.send("Input.dispatchTouchEvent", {
              type,
              touchPoints: points.map(([id, x, y]) => ({
                id,
                x,
                y,
                radiusX: 2,
                radiusY: 2,
                force: 1,
              })),
            });
          await touch("touchStart", [
            [1, x - 20, y],
            [2, x + 20, y],
          ]);
          for (let k = 1; k <= 4; k++) {
            await touch("touchMove", [
              [1, x - 20 - k * 5, y],
              [2, x + 20 + k * 5, y],
            ]);
            await h.waitForTimeout(25);
          }
          await touch("touchEnd", []);
          await h.waitForFunction(
            (z) =>
              Math.abs(
                Number(document.querySelector(".screen-surface").dataset.zoom) -
                  z,
              ) > 1,
            before.zoom,
          );
          await touch("touchStart", [[3, x - 20, y]]);
          for (let k = 1; k <= 4; k++) {
            await touch("touchMove", [[3, x - 20 + k * 10, y - k * 3]]);
            await h.waitForTimeout(25);
          }
          await touch("touchEnd", []);
          await h.waitForFunction(
            (z) =>
              Math.abs(
                Number(document.querySelector(".screen-surface").dataset.yaw) -
                  z,
              ) > 1,
            before.yaw,
          );
          row.nativeTouch = await h.evaluate(() => ({
            zoom: Number(
              document.querySelector(".screen-surface").dataset.zoom,
            ),
            yaw: Number(document.querySelector(".screen-surface").dataset.yaw),
            scale: visualViewport.scale,
          }));
          assert(
            Math.abs(row.nativeTouch.scale - before.scale) < 0.02,
            "scene pinch must not zoom the page",
          );
          await toolbar("Góc nhìn 🎮").click();
          await h
            .getByRole("button", { name: "Trở lại bấm video", exact: true })
            .click();
          await h
            .getByRole("button", { name: "Nhìn màn chiếu", exact: true })
            .click();
          row.checks.push(
            "native Chromium CDP two-finger pinch/one-finger drag change camera without page zoom",
          );
        }
      }
    }
    await toolbar("Chat").click();
    await h
      .getByPlaceholder("Nói gì với mọi người…")
      .fill("Xin chào từ " + engine);
    await h.getByRole("button", { name: "Gửi tin", exact: true }).click();
    await cmd({ type: "chat", text: "Peer reply" }, g);
    await h.getByRole("button", { name: "Cảm xúc", exact: true }).click();
    await inspect(h, profile.id + " reactions");
    await capture(h, row, "chat-reactions");
    await h.keyboard.press("Escape");
    row.checks.push(
      "sheet exclusivity/hit targets, chat send/receive and reaction lane without overlap",
    );
    // Simulate the keyboard-sized viewport; this does not emulate an OS keyboard/IME.
    if (profile.touch && profile.height > profile.width) {
      await h.setViewportSize({
        width: profile.width,
        height: Math.max(390, Math.floor(profile.height * 0.58)),
      });
      const resizeState = () =>
        h.evaluate(() => {
          const node = document.querySelector(".cinema-app"),
            b = document.querySelector(".sidebar")?.getBoundingClientRect();
          return {
            height: innerHeight,
            visualHeight: visualViewport?.height,
            appliedHeight: parseFloat(
              node?.style.getPropertyValue("--panel-viewport") || "",
            ),
            panelTop: b?.top,
            panelBottom: b?.bottom,
          };
        });
      const resizedAt = now();
      row.keyboardResize = { initial: await resizeState() };
      await waitForViewportLayout(h);
      row.keyboardResize.settled = await resizeState();
      row.keyboardResize.waitMs = round(now() - resizedAt);
      if (!(await h.getByPlaceholder("Nói gì với mọi người…").isVisible()))
        await toolbar("Chat").click();
      await h.getByPlaceholder("Nói gì với mọi người…").waitFor();
      await inspect(h, profile.id + " keyboard viewport");
      await capture(h, row, "keyboard");
      await h.setViewportSize(row.viewport);
      await waitForViewportLayout(h);
    }
    if (profile.id === "laptop") {
      await toolbar("Playlist").click();
      await h
        .getByLabel("Thêm file vào playlist", { exact: true })
        .setInputFiles(fixture);
      await h.waitForFunction(
        () => document.querySelectorAll(".queue-item").length === 1,
      );
      await h
        .getByRole("button", { name: "Phát playlist", exact: true })
        .click();
      await h.waitForFunction(
        () => {
          const v = document.querySelector("video");
          return v?.videoWidth === 1280 && v.currentTime > 0.2;
        },
        null,
        { timeout: 25000 },
      );
      await h.evaluate(() => {
        window.__matrixVideo = document.querySelector("video");
        window.__matrixMediaCanvas = document.querySelector(".scene canvas");
      });
      await h
        .getByRole("button", { name: "Hold cá nhân", exact: true })
        .click();
      await h.waitForFunction(() => document.querySelector("video").muted);
      await gamePanel(h);
      await pane(h)
        .getByRole("button", { name: "Bàn phẳng", exact: true })
        .click();
      await pane(h)
        .getByRole("button", { name: "Bàn 3D", exact: true })
        .click();
      await h.waitForFunction(
        () =>
          document.querySelector(".scene canvas")?.dataset.gameKind === "oaq",
      );
      assert(
        await h.evaluate(
          () =>
            document.querySelector("video") === window.__matrixVideo &&
            document.querySelector(".scene canvas") ===
              window.__matrixMediaCanvas &&
            window.__matrixVideo.muted,
        ),
      );
      await h.waitForTimeout(1100);
      row.nativeMedia = await h.evaluate(() => {
        const v = document.querySelector("video"),
          q = v.getVideoPlaybackQuality?.();
        return {
          width: v.videoWidth,
          height: v.videoHeight,
          currentTime: v.currentTime,
          readyState: v.readyState,
          totalFrames: q?.totalVideoFrames ?? null,
          droppedFrames: q?.droppedVideoFrames ?? null,
          muted: v.muted,
        };
      });
      await h
        .getByRole("button", { name: "Đóng bảng trò chơi", exact: true })
        .click();
      await h.waitForTimeout(900);
      const quality = () =>
        h.evaluate(() => {
          const v = document.querySelector("video"),
            q = v.getVideoPlaybackQuality?.();
          return {
            time: performance.now(),
            mediaTime: v.currentTime,
            frames: q?.totalVideoFrames ?? null,
            dropped: q?.droppedVideoFrames ?? null,
          };
        });
      const before = await quality();
      await h.waitForTimeout(2000);
      const after = await quality();
      row.visiblePlayback = {
        windowMs: round(after.time - before.time),
        mediaSeconds: round(after.mediaTime - before.mediaTime),
        frames: before.frames === null ? null : after.frames - before.frames,
        dropped:
          before.dropped === null ? null : after.dropped - before.dropped,
      };
      assert(row.visiblePlayback.mediaSeconds > 1.5);
      await gamePanel(h);
      await pane(h).locator(".game-music>summary").click();
      const select = h.getByLabel("Nhạc nền trò chơi");
      await select.focus();
      await select.press("Home");
      await select.press("ArrowDown");
      await select.press("Enter");
      await h.waitForFunction(() =>
        document.querySelector('.game-music[data-playing="true"]'),
      );
      row.audioContexts = await h.evaluate(() => window.__deviceAudio.length);
      assert.equal(row.audioContexts, 1);
      await game({ action: "pause" });
      await h.waitForFunction(() =>
        document.querySelector('.game-music[data-playing="false"]'),
      );
      await game({ action: "resume" });
      await h.waitForFunction(() =>
        document.querySelector('.game-music[data-playing="true"]'),
      );
      await h.evaluate(() => {
        window.__deviceHidden = true;
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await h.waitForFunction(() =>
        document.querySelector('.game-music[data-playing="false"]'),
      );
      await h.evaluate(() => {
        window.__deviceHidden = false;
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await h.waitForFunction(() =>
        document.querySelector('.game-music[data-playing="true"]'),
      );
      await game({ action: "close" });
      await game({ action: "open", kind: "loto" });
      await game({ action: "join" }, g);
      await game({ action: "start" });
      await game({ action: "draw" });
      await h.waitForFunction(
        () =>
          document.querySelector(".scene canvas")?.dataset.gameKind === "loto",
      );
      await h.waitForTimeout(1100);
      await inspect(h, profile.id + " loto");
      await capture(h, row, "loto-native");
      row.checks.push(
        "actual 1280x720 H264/AAC app upload/decode, mounted player/Hold, shared-context music/pause/hidden, new-round reset and loto 3D",
      );
    }
    if (cdp) {
      const m = await cdp.send("Performance.getMetrics");
      const get = (n) => m.metrics.find((x) => x.name === n)?.value;
      row.chromiumMetrics = {
        jsHeapMiB: round(get("JSHeapUsedSize") / 1024 ** 2),
        nodes: get("Nodes"),
        taskDurationSeconds: round(get("TaskDuration")),
        layoutDurationSeconds: round(get("LayoutDuration")),
      };
    }
    row.longTasks = await h.evaluate(() => {
      const supported =
        PerformanceObserver.supportedEntryTypes?.includes("longtask");
      return {
        supported,
        count: supported ? window.__deviceLongTasks.length : null,
        blockingMs: supported
          ? window.__deviceLongTasks.reduce(
              (n, t) => n + Math.max(0, t - 50),
              0,
            )
          : null,
      };
    });
    assert.deepEqual(errors.slice(startErrors), []);
    row.passed = true;
    console.log(
      "PASS " +
        engine +
        " " +
        profile.id +
        " " +
        JSON.stringify({
          createMs: row.createToGameMs,
          idle: row.idleFrames,
          select: row.selectionFrames,
          media: !!row.nativeMedia,
        }),
    );
  } catch (e) {
    row.error = e.message;
    row.failureState = await h
      .evaluate(() => ({
        hidden: document.hidden,
        audio: window.__deviceAudio?.map((c) => ({
          state: c.state,
          time: c.currentTime,
        })),
        music: document.querySelector(".game-music")?.textContent?.slice(-800),
      }))
      .catch(() => null);
    await capture(h, row, "FAIL").catch(() => {});
    console.error("FAIL " + engine + " " + profile.id + ": " + e.message);
    process.exitCode = 1;
  } finally {
    if (session) await cmd({ type: "close" }).catch(() => {});
    await hc.close();
    await gc.close();
  }
}
(async () => {
  try {
    for (const engine of names) {
      let browser;
      try {
        browser = await runtime[engine].launch({
          headless: engine !== "firefox" || !process.env.DISPLAY,
          timeout: 30000,
          ...(engine === "chromium"
            ? {
                executablePath: runtime.executablePath,
                args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
              }
            : {}),
          ...(engine === "firefox"
            ? {
                firefoxUserPrefs: {
                  "webgl.force-enabled": true,
                  "gfx.webrender.software": true,
                },
              }
            : {}),
        });
        engines.push({
          engine,
          version: browser.version(),
          headedFirefox: engine === "firefox" && !!process.env.DISPLAY,
        });
        const selected = profiles.filter(
          (p) => extended || ["phone320", "landscape", "laptop"].includes(p.id),
        );
        if (extended && engine === "chromium")
          selected.push({
            id: "constrained",
            width: 360,
            height: 740,
            dpr: 2,
            touch: true,
            constrained: true,
          });
        const only = process.argv
          .find((a) => a.startsWith("--profiles="))
          ?.split("=")[1]
          ?.split(",");
        if (only)
          assert(
            only.every(
              (id) => profiles.some((p) => p.id === id) || id === "constrained",
            ),
            "Unknown profile",
          );
        const requested = only
          ? profiles
              .filter((p) => only.includes(p.id))
              .concat(
                engine === "chromium" && only.includes("constrained")
                  ? [
                      {
                        id: "constrained",
                        width: 360,
                        height: 740,
                        dpr: 2,
                        touch: true,
                        constrained: true,
                      },
                    ]
                  : [],
              )
          : selected;
        for (const profile of requested)
          await runProfile(browser, engine, profile);
      } catch (e) {
        engines.push({ engine, error: e.message.slice(0, 1200) });
        process.exitCode = 1;
      } finally {
        await browser?.close();
      }
    }
  } finally {
    if (!rows.length) process.exitCode = 1;
    const times = rows.filter((r) => r.passed).map((r) => r.createToGameMs);
    const report = {
      passed: !process.exitCode && rows.length > 0,
      date: new Date().toISOString(),
      worktreeDirty: !!execFileSync("git", ["status", "--porcelain"], {
        encoding: "utf8",
      }).trim(),
      buildIndexSha256: require("node:crypto")
        .createHash("sha256")
        .update(fs.readFileSync(path.join(__dirname, "../dist/index.html")))
        .digest("hex"),
      sourceBase: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      target: base,
      extended,
      environment: {
        audioOutput: process.env.PULSE_SERVER
          ? "configured virtual PulseAudio sink"
          : "browser/OS default; acoustic output unverified",
        softwareRenderingRequested: process.env.LIBGL_ALWAYS_SOFTWARE === "1",
        os: os.platform(),
        arch: os.arch(),
        cpuCount: os.cpus().length,
        memoryGiB: round(os.totalmem() / 1024 ** 3),
        node: process.version,
      },
      engines,
      summary: {
        profiles: rows.length,
        passed: rows.filter((r) => r.passed).length,
        checks: rows.reduce((n, r) => n + r.checks.length, 0),
        screenshots: rows.reduce((n, r) => n + r.screenshots.length, 0),
        createWallMs: {
          p50: percentile(times, 0.5),
          p95: percentile(times, 0.95),
        },
      },
      rows,
      errors,
      limitations:
        "Real Linux engines and local Worker/WebGL/WebAudio/native H264/AAC, software renderers; reported GPU strings may be privacy-masked, not proof of Apple hardware. Viewport/DPR/touch/reduced-motion/resource hints and hidden events are emulation/fixtures. CPU/network constraint is Chromium CDP simulation, not physical mobile speed/WAN/battery/thermal. Diagnostics enabled. Keyboard-sized viewport is not OS keyboard/IME; 640x450/DPR2 approximates zoomed layout, not browser/OS zoom. Timing includes automation/software GPU and is not field CWV or FPS certification; no real iOS/Android/macOS/M1 device connected.",
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
    console.log(
      JSON.stringify({
        passed: report.passed,
        summary: report.summary,
        report: reportPath,
        screenshots: shots,
      }),
    );
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
