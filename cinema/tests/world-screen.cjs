const { chromium, executablePath } = require("./browser-runtime.cjs");
const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict");
const shots = process.env.CINEMA_SCREENSHOT_DIR || "/tmp/cinema-world-screen";
fs.mkdirSync(shots, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  p.setDefaultTimeout(30000);
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") console.log("console", m.text().slice(0, 300));
  });
  const base = "http://localhost:8787",
    slot = 1;
  let session;
  const colors = { clothing: "#bf3355", hair: "#4c2f9c" };
  const checks = [];
  const api = async (path, data) => {
    let r = await p.request.fetch(base + "/api" + path, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    const v = await r.json();
    if (!r.ok()) throw Error(JSON.stringify(v));
    return v;
  };
  const cmd = async (command) =>
    api(`/rooms/${slot}/command`, {
      session,
      commandId: crypto.randomUUID(),
      command,
    });
  try {
    await p.route("https://www.youtube.com/iframe_api", (r) =>
      r.fulfill({
        contentType: "application/javascript",
        body: `window.YT={Player:class{constructor(el,c){this.config=c;this.time=0;this.state=2;this.volume=80;this.video='';window.__yt=this;el.innerHTML='<iframe title="Screen test" style="width:640px;height:360px" srcdoc="&lt;body onpointerdown=document.body.dataset.clicked=1 style=margin:0;height:100vh;background:rgb(229,57,53);color:white&gt;WORLD SCREEN&lt;/body&gt;"></iframe>';setTimeout(()=>c.events.onReady(),10)}loadVideoById(v){this.video=v.videoId;this.state=1;this.time=v.startSeconds}cueVideoById(v){this.video=v.videoId;this.state=2;this.time=v.startSeconds}getCurrentTime(){return this.time}getPlayerState(){return this.state}getDuration(){return 600}getVideoData(){return{video_id:this.video}}getVolume(){return this.volume}setVolume(v){this.volume=v}seekTo(t){this.time=t}playVideo(){this.state=1}pauseVideo(){this.state=2}destroy(){}}};window.onYouTubeIframeAPIReady();`,
      }),
    );
    await p.goto(base);
    const rooms = await api("/rooms");
    if (rooms.find((r) => r.slot === slot).open)
      throw Error("Local slot occupied; preserve it");
    const r = await api(`/rooms/${slot}/create`, {
      name: "World host",
      title: "World check",
      capacity: 6,
      seating: "sofa",
      avatar: "female",
      appearance: colors,
    });
    session = r.room.session;
    await p.reload();
    await p
      .locator(".room-card")
      .filter({ hasText: "World check" })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await p.getByPlaceholder("Mọi người gọi bạn là…").fill("World host");
    await p
      .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await p
      .getByLabel("Link video / nhạc để bắt đầu")
      .fill("https://youtu.be/jfKfPfyJRdk");
    await p.getByLabel("Link video / nhạc để bắt đầu").press("Enter");
    await p.waitForFunction(
      () =>
        document.querySelector(".scene canvas")?.dataset.femaleModel ===
        "ready",
    );
    await cmd({ type: "sit", instant: true });
    await p.waitForTimeout(1800);
    const view = p
      .locator(".cinema-toolbar")
      .getByRole("button", { name: "Góc nhìn 🎮", exact: true });
    await view.click();
    await p.screenshot({ path: path.join(shots, "world-overview.png") });
    assert.equal(await p.getByLabel("Màu tóc", { exact: true }).count(), 0);
    assert.equal(await p.getByLabel("Màu quần áo", { exact: true }).count(), 0);
    checks.push("no appearance editor inside the room");
    await assert.rejects(
      cmd({
        type: "appearance",
        colors: { clothing: "#ffffff", hair: "#ffffff" },
      }),
    );
    checks.push("server rejects in-room appearance commands");
    await api(`/rooms/${slot}/join`, {
      name: "Changed",
      avatar: "male",
      appearance: { clothing: "#ffffff", hair: "#ffffff" },
    });
    assert.deepEqual(
      (await api(`/rooms/${slot}/state`)).room.members[0].appearance,
      colors,
    );
    checks.push("rejoin cannot overwrite admitted appearance");
    const original = await p.evaluateHandle(() => window.__yt);
    const verifyProjection = async () => {
      const v = await p.locator(".screen-surface").evaluate((el) => {
        if (el.dataset.mode === "offscreen")
          return { hidden: el.style.visibility === "hidden" };
        const weights = JSON.parse(el.dataset.clipW || "[]");
        if (weights.some((w) => w < 0))
          return { partial: true, mode: el.dataset.mode };
        const pts = JSON.parse(el.dataset.corners),
          scene = el.parentElement.getBoundingClientRect(),
          actual = el.getBoundingClientRect();
        const expected = {
          left: scene.left + Math.min(...pts.map((p) => p.x)),
          top: scene.top + Math.min(...pts.map((p) => p.y)),
          right: scene.left + Math.max(...pts.map((p) => p.x)),
          bottom: scene.top + Math.max(...pts.map((p) => p.y)),
        };
        return {
          mode: el.dataset.mode,
          error: Math.max(
            ...Object.keys(expected).map((k) =>
              Math.abs(expected[k] - actual[k]),
            ),
          ),
        };
      });
      assert(
        v.hidden || v.partial || (v.mode === "projected" && v.error < 2),
        JSON.stringify(v),
      );
      assert(await p.evaluate((ref) => window.__yt === ref, original));
    };
    await verifyProjection();
    checks.push("DOM bounds match the world screen corners");
    await p
      .getByRole("button", { name: "Đóng điều khiển", exact: true })
      .click();
    const center = await p.locator(".screen-surface").evaluate((el) => {
      const m = new DOMMatrix(getComputedStyle(el).transform),
        x = 320,
        y = 180,
        w = m.m14 * x + m.m24 * y + m.m44;
      return {
        x: (m.m11 * x + m.m21 * y + m.m41) / w,
        y: (m.m12 * x + m.m22 * y + m.m42) / w,
      };
    });
    await p.mouse.click(center.x, center.y);
    await p.frameLocator("iframe").locator('body[data-clicked="1"]').waitFor();
    checks.push("projected iframe remains clickable through the WebGL layer");
    await view.click();
    await p.getByLabel("Chọn góc nhìn", { exact: true }).selectOption("first");
    await p
      .getByRole("button", { name: "Đóng điều khiển", exact: true })
      .click();
    const redCount = async () => {
      const bytes = await p.screenshot();
      return p.evaluate(async (b) => {
        const im = new Image();
        im.src = "data:image/png;base64," + b;
        await im.decode();
        const c = document.createElement("canvas");
        c.width = im.width;
        c.height = im.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(im, 0, 0);
        const d = ctx.getImageData(0, 0, c.width, c.height).data;
        let count = 0;
        for (let i = 0; i < d.length; i += 32)
          if (d[i] > 180 && d[i + 1] < 100 && d[i + 2] < 100) count++;
        return count;
      }, bytes.toString("base64"));
    };
    for (const target of [48, -60]) {
      await view.click();
      await p
        .getByRole("button", { name: "Nhìn màn chiếu", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Đóng điều khiển", exact: true })
        .click();
      await p.locator(".scene").focus();
      const key = target > 0 ? "d" : "a";
      await p.keyboard.down(key);
      await p.waitForFunction(
        (t) =>
          t > 0
            ? Number(document.querySelector(".screen-surface")?.dataset.yaw) >=
              t
            : Number(document.querySelector(".screen-surface")?.dataset.yaw) <=
              t,
        target,
      );
      await p.keyboard.up(key);
      await p.waitForTimeout(1800);
      const weights = JSON.parse(
        await p.locator(".screen-surface").getAttribute("data-clip-w"),
      );
      assert(
        weights.some((w) => w < 0) && weights.some((w) => w > 0),
        JSON.stringify({ target, weights }),
      );
      for (let sample = 0; sample < 3; sample++)
        assert(
          (await redCount()) > 100,
          "Visible screen went black at a camera-plane crossing",
        );
      await p.screenshot({
        path: path.join(shots, "partial-" + target + ".png"),
      });
    }
    checks.push(
      "partially-behind screen retains video at both side angles in repeated pixel captures",
    );
    await view.click();
    await p
      .getByRole("button", { name: "Nhìn màn chiếu", exact: true })
      .click();
    assert.deepEqual(
      await p
        .getByLabel("Chọn góc nhìn", { exact: true })
        .locator("option")
        .evaluateAll((xs) => xs.map((x) => x.value)),
      ["first", "orbit"],
    );
    checks.push("only eye and unified orbit choices remain");
    for (const mode of ["first", "orbit"]) {
      await p.getByLabel("Chọn góc nhìn", { exact: true }).selectOption(mode);
      await p.waitForTimeout(2000);
      await verifyProjection();
      checks.push(mode + " retains the player");
    }
    await p.getByLabel("Chọn góc nhìn", { exact: true }).selectOption("orbit");
    await p
      .getByRole("button", { name: "Đóng điều khiển", exact: true })
      .click();
    await p.mouse.move(40, 200);
    for (let i = 0; i < 12; i++) await p.mouse.wheel(0, -100);
    await p.locator(".scene").focus();
    await p.keyboard.down("s");
    await p.waitForFunction(
      () =>
        Number(document.querySelector(".screen-surface")?.dataset.pitch) < -18,
    );
    await p.keyboard.up("s");
    await p.waitForTimeout(2500);
    const { Matrix4, Vector3 } = require("three");
    const vp = new Matrix4().fromArray(
      JSON.parse(
        await p.locator(".screen-surface").getAttribute("data-view-projection"),
      ),
    );
    const head = new Vector3(-1.25, 1.75, -0.55).applyMatrix4(vp),
      pixel = {
        x: Math.round((head.x + 1) * 640),
        y: Math.round((1 - head.y) * 450),
      };
    const quad = JSON.parse(
      await p.locator(".screen-surface").getAttribute("data-corners"),
    );
    let inside = false;
    for (let i = 0, j = quad.length - 1; i < quad.length; j = i++) {
      const a = quad[i],
        b = quad[j];
      if (
        a.y > pixel.y !== b.y > pixel.y &&
        pixel.x < ((b.x - a.x) * (pixel.y - a.y)) / (b.y - a.y) + a.x
      )
        inside = !inside;
    }
    assert(inside, "Occlusion sample must be inside the projected screen");
    const screenCenter = new Vector3(0, 3.35, -5.69).applyMatrix4(vp);
    const filmPixel = {
      x: Math.round((screenCenter.x + 1) * 640),
      y: Math.round((1 - screenCenter.y) * 450),
    };
    const shot = await p.screenshot({
      path: path.join(shots, "world-occlusion.png"),
    });
    const samples = await p.evaluate(
      async ({ base64, pixel, filmPixel }) => {
        const im = new Image();
        im.src = "data:image/png;base64," + base64;
        await im.decode();
        const c = document.createElement("canvas");
        c.width = im.width;
        c.height = im.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(im, 0, 0);
        return {
          head: [...ctx.getImageData(pixel.x, pixel.y, 1, 1).data],
          screen: [...ctx.getImageData(filmPixel.x, filmPixel.y, 1, 1).data],
        };
      },
      { base64: shot.toString("base64"), pixel, filmPixel },
    );
    assert(
      samples.head[2] > samples.head[0],
      JSON.stringify({ pixel, samples }),
    );
    assert(
      samples.screen[0] > 180 &&
        samples.screen[1] < 100 &&
        samples.screen[2] < 100,
      JSON.stringify(samples),
    );
    checks.push(
      "foreground hair remains visible over the red video plane (pixel check)",
    );
    await view.click();
    await p.getByLabel("Chọn góc nhìn", { exact: true }).selectOption("orbit");
    await p.waitForTimeout(1500);
    await p.locator(".scene").focus();
    await p.keyboard.down("d");
    await p.waitForTimeout(600);
    await p.keyboard.up("d");
    await p.waitForTimeout(1000);
    await verifyProjection();
    checks.push("drag stays attached, no floating fallback");
    await p.locator(".scene").focus();
    await p.keyboard.down("d");
    try {
      await p.waitForFunction(
        () =>
          Number(document.querySelector(".screen-surface")?.dataset.yaw) > 110,
      );
    } catch (e) {
      console.error(
        "Orbit input state",
        await p.evaluate(() => {
          const d = document.querySelector(".screen-surface")?.dataset;
          return {
            mode: d?.camera,
            yaw: d?.yaw,
            target: d?.targetYaw,
            focus: document.activeElement?.tagName,
            visibility: document.visibilityState,
          };
        }),
      );
      throw e;
    } finally {
      await p.keyboard.up("d");
    }
    await p.waitForTimeout(800);
    assert.equal(await p.locator(".error-banner").count(), 0);
    checks.push(
      "orbit exceeds neck angles without invalid server pose commands",
    );
    await p
      .getByRole("button", { name: "Nhìn màn chiếu", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Đóng điều khiển", exact: true })
      .click();
    await p.setViewportSize({ width: 390, height: 844 });
    await p.waitForTimeout(2200);
    await verifyProjection();
    const bounds = await p.locator(".screen-surface").boundingBox();
    assert(
      bounds.x >= -1 && bounds.x + bounds.width <= 391,
      JSON.stringify(bounds),
    );
    await p.screenshot({ path: path.join(shots, "world-portrait.png") });
    checks.push(
      "portrait overview frames the wide screen by moving the camera",
    );
    await original.dispose();
    fs.writeFileSync(
      path.join(__dirname, "../evidence/world-screen.json"),
      JSON.stringify(
        {
          passed: !errors.length,
          checks,
          pageErrors: errors,
          limitations:
            "Local SwiftShader; YouTube red iframe fixture; actual native iframe geometry and compositor/occlusion pixels; no hardware/actual YouTube certification.",
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify({ errors }));
    if (errors.length) throw Error(errors.join("\n"));
  } finally {
    if (session) await cmd({ type: "close" }).catch(() => {});
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
