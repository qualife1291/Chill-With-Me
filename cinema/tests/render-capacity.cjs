// Short local SwiftShader smoke: real scene/models, one renderer, ten members.
const { chromium, executablePath } = require("./browser-runtime.cjs");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const h = await b.newPage({ viewport: { width: 1280, height: 900 } });
  let session;
  const slot = 2,
    base = "http://localhost:8787",
    contexts = [];
  const api = async (request, path, data) => {
    const r = await request.fetch(base + "/api" + path, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    return { httpStatus: r.status(), data: await r.json() };
  };
  const cmd = (request, c) =>
    api(request, `/rooms/${slot}/command`, {
      session,
      commandId: crypto.randomUUID(),
      command: c,
    });
  try {
    await h.goto(base);
    assert(
      !(await api(h.request, "/rooms")).data.find((r) => r.slot === slot).open,
      "Slot must be empty",
    );
    const created = await api(h.request, `/rooms/${slot}/create`, {
      name: "Renderer host",
      title: "Renderer ten " + Date.now(),
      capacity: 10,
    });
    session = created.data.room?.session;
    assert.equal(created.httpStatus, 200);
    await h.reload();

    await h
      .locator(".room-card")
      .filter({ hasText: created.data.room.title })
      .getByRole("button", { name: "Xin vào phòng" })
      .click();
    await h.getByPlaceholder("Mọi người gọi bạn là…").fill("Renderer host");

    await h
      .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    // No media/network fixture required to load ten rigs: leave the mandatory start modal open.
    for (let i = 0; i < 9; i++) {
      const c = await b.newContext();
      contexts.push(c);
      const id = (await api(c.request, "/session", {})).data.id;
      await api(c.request, `/rooms/${slot}/join`, {
        name: "Rendered " + i,
        avatar: i % 2 ? "female" : "male",
      });
      assert.equal(
        (await cmd(h.request, { type: "accept", id })).httpStatus,
        200,
      );
      await cmd(c.request, { type: "sit", instant: true });
    }
    await cmd(h.request, { type: "sit", instant: true });
    await h.waitForFunction(
      () => document.querySelector(".cinema-app")?.dataset.members === "10",
    );
    await h.waitForFunction(() => {
      const d = document.querySelector(".scene canvas")?.dataset;
      return d?.maleModel === "ready" && d?.femaleModel === "ready";
    });
    await h.waitForTimeout(5500);
    const idle = await h.evaluate(async () => {
      const c = document.querySelector(".scene canvas"),
        start = Number(c.dataset.renderFrame),
        t = performance.now();
      await new Promise((r) => setTimeout(r, 1200));
      return {
        elapsed: performance.now() - t,
        renderedFrames: Number(c.dataset.renderFrame) - start,
      };
    });
    assert.equal(
      idle.renderedFrames,
      0,
      "Ten settled rigs must stop rendering",
    );
    const observed = h.evaluate(async () => {
      const frames = [],
        c = document.querySelector(".scene canvas"),
        start = Number(c.dataset.renderFrame),
        begin = performance.now();
      let prev = begin;
      while (performance.now() - begin < 3000) {
        await new Promise(requestAnimationFrame);
        const now = performance.now();
        frames.push(now - prev);
        prev = now;
      }
      frames.sort((a, b) => a - b);
      return {
        elapsed: performance.now() - begin,
        rendererFrames: Number(c.dataset.renderFrame) - start,
        rafP50: frames[Math.floor(frames.length * 0.5)],
        rafP95: frames[Math.floor(frames.length * 0.95)],
      };
    });
    for (const c of contexts) {
      await cmd(c.request, { type: "look", yaw: 65, pitch: 25, bodyYaw: 180 });
      await cmd(c.request, { type: "wave" });
    }
    const animation = await observed;
    assert(animation.rendererFrames > 0);
    const resources = JSON.parse(
      await h.locator(".scene canvas").getAttribute("data-render-stats"),
    );
    assert(resources.textures <= 12, JSON.stringify(resources));
    assert(resources.calls <= 150, JSON.stringify(resources));
    assert(resources.geometries <= 100, JSON.stringify(resources));
    const report = {
      pass: true,
      members: 10,
      renderer: "Chromium headless SwiftShader; one renderer, not ten devices",
      idle,
      animation,
      resources: JSON.parse(
        await h.locator(".scene canvas").getAttribute("data-render-stats"),
      ),
    };
    require("node:fs").writeFileSync(
      require("node:path").join(__dirname, "../evidence/render-capacity.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (session) await cmd(h.request, { type: "close" }).catch(() => {});
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
