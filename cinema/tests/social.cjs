const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { chromium, executablePath } = require("./browser-runtime.cjs");
const base = "http://localhost:8787",
  slot = 1;
(async () => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const h = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
    g = await browser.newPage(),
    p = await browser.newPage();
  const checks = [],
    errors = [];
  let epoch;
  const api = async (page, route, data) => {
    const r = await page.request.fetch(base + "/api" + route, {
      method: data === undefined ? "GET" : "POST",
      headers: { Origin: base },
      data,
    });
    return { code: r.status(), data: await r.json() };
  };
  const cmd = (page, command, commandId = crypto.randomUUID()) =>
    api(page, `/rooms/${slot}/command`, { session: epoch, commandId, command });
  const toolbar = (page, name) =>
    page.locator(".cinema-toolbar").getByRole("button", { name, exact: true });
  const controls = async (page) => {
    await page.bringToFront();
    if (
      (await toolbar(page, "Góc nhìn 🎮").getAttribute("aria-pressed")) !==
      "true"
    )
      await toolbar(page, "Góc nhìn 🎮").click();
  };
  const sounds = (page) => page.evaluate(() => window.__sounds.length);
  try {
    for (const page of [h, g]) {
      page.setDefaultTimeout(30000);
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(() => {
        window.__sounds = [];
        window.__audioNodes = [];
        for (const Klass of [
          window.OscillatorNode,
          window.AudioBufferSourceNode,
        ]) {
          if (!Klass) continue;
          const start = Klass.prototype.start;
          Klass.prototype.start = function (...args) {
            window.__sounds.push({ state: this.context.state, at: Date.now() });
            const tracked = { ended: false };
            this.addEventListener(
              "ended",
              () => {
                tracked.ended = true;
              },
              { once: true },
            );
            window.__audioNodes.push(tracked);
            return start.apply(this, args);
          };
        }
      });
      await page.route("https://www.youtube.com/iframe_api", (route) =>
        route.fulfill({
          contentType: "application/javascript",
          body: `window.YT={Player:class{constructor(el,c){this.video='';this.time=0;this.state=2;this.volume=80;window.__yt=this;el.innerHTML='<iframe title="YouTube social fixture"></iframe>';setTimeout(()=>c.events.onReady(),0)}loadVideoById(v){this.video=v.videoId;this.time=v.startSeconds;this.state=1}cueVideoById(v){this.video=v.videoId;this.time=v.startSeconds;this.state=2}getCurrentTime(){return this.time}getPlayerState(){return this.state}getDuration(){return 600}getVideoData(){return{video_id:this.video}}getVolume(){return this.volume}setVolume(v){this.volume=v}seekTo(t){this.time=t}playVideo(){this.state=1}pauseVideo(){this.state=2}destroy(){}}};window.onYouTubeIframeAPIReady();`,
        }),
      );
      await page.goto(base);
    }
    // The rejected applicant only exercises authenticated API commands; avoid a
    // third software-rendered lobby. UI actions activate their intended tab.
    await p.goto(base + "/api/rooms");
    await api(p, "/session", {});
    assert(!(await api(h, "/rooms")).data.find((r) => r.slot === slot).open);
    await h.bringToFront();
    await h
      .locator(".room-card")
      .nth(slot - 1)
      .getByRole("button", { name: "Tạo phòng" })
      .click();
    await h.getByPlaceholder("Mọi người gọi bạn là…").fill("Social host");
    await h.getByLabel("Tên phòng mới").fill("Social UX test");
    await h.getByLabel("Số ghế").selectOption("4");
    await h
      .getByRole("dialog", { name: "Tạo phòng mới", exact: true })
      .getByRole("button", { name: "Tạo phòng", exact: true })
      .click();
    await h.getByRole("dialog", { name: "Thêm video để bắt đầu" }).waitFor();
    epoch = (await api(h, `/rooms/${slot}/state`)).data.room.session;
    await g.bringToFront();
    await g.reload();
    await g
      .locator(".room-card")
      .filter({ hasText: "Social UX test" })
      .getByRole("button", { name: "Xin vào phòng" })
      .click();
    await g.getByPlaceholder("Mọi người gọi bạn là…").fill("Social guest");
    await g.getByPlaceholder("Mọi người gọi bạn là…").fill("Social guest");
    await g
      .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await h.bringToFront();
    const approval = h.getByRole("dialog", { name: "Yêu cầu vào phòng" });
    await approval.waitFor();
    assert.equal(
      await h.getByRole("dialog", { name: "Thêm video để bắt đầu" }).count(),
      0,
    );
    const box = await approval.boundingBox();
    assert(
      Math.abs(box.x + box.width / 2 - 720) < 2 &&
        Math.abs(box.y + box.height / 2 - 500) < 2,
    );
    assert(
      await approval.evaluate((el) => el.contains(document.activeElement)),
    );
    checks.push(
      "approval interrupts start-video dialog immediately, centered with isolated focus",
    );
    await api(p, `/rooms/${slot}/join`, { name: "Reject me" });
    await approval.getByText("Reject me", { exact: true }).waitFor();
    assert.equal(
      (await cmd(p, { type: "reaction", kind: "flowers" })).data.error,
      "FORBIDDEN",
    );
    await approval
      .locator(".person")
      .filter({ hasText: "Reject me" })
      .getByRole("button", { name: "Từ chối" })
      .click();
    await h.waitForFunction(
      () => document.querySelectorAll(".approval-modal .person").length === 1,
    );
    assert(
      await approval.evaluate((el) => el.contains(document.activeElement)),
      "focus lost after rejecting one of several requests",
    );
    await approval
      .getByRole("button", { name: "Cho vào", exact: true })
      .click();
    await toolbar(g, "Chat").waitFor();
    const quick = h.getByRole("dialog", { name: "Thêm video để bắt đầu" });
    await quick.waitFor();
    await quick
      .getByLabel("Link video / nhạc để bắt đầu")
      .fill("https://youtu.be/jfKfPfyJRdk");
    await quick.getByLabel("Link video / nhạc để bắt đầu").press("Enter");
    await h.waitForFunction(() => window.__yt?.video);
    checks.push(
      "multiple requests accept/reject individually; pending member cannot send reactions; start dialog resumes",
    );
    for (const page of [h, g]) {
      await controls(page);
      await page
        .getByRole("button", { name: "Chế độ nhẹ", exact: true })
        .click();
    }
    const ids = (await api(h, `/rooms/${slot}/state`)).data.room.members;
    const guestId = ids.find((m) => m.name === "Social guest").id;
    await cmd(g, { type: "chat", text: "Closed chat notification" });
    const toast = h.getByRole("complementary", { name: "Tin nhắn mới" });
    await toast
      .getByText("Closed chat notification", { exact: true })
      .waitFor();
    assert.equal(
      await g.locator(".chat-toasts").count(),
      0,
      "own messages must not create a toast",
    );
    await h.bringToFront();
    await toast.getByRole("button", { name: "Mở chat: Social guest" }).click();
    await h
      .locator(".chat-history")
      .getByText("Closed chat notification", { exact: true })
      .waitFor();
    await cmd(g, { type: "chat", text: "Already open chat" });
    await h
      .locator(".chat-history")
      .getByText("Already open chat", { exact: true })
      .waitFor();
    assert.equal(await h.locator(".chat-toasts").count(), 0);
    await toolbar(h, "Chat").click();
    checks.push(
      "closed-chat incoming toast includes name, opens chat; no self-toast or toast while chat is open",
    );
    for (let i = 0; i < 4; i++)
      await cmd(g, { type: "chat", text: `Burst ${i}` });
    await h.waitForFunction(
      () => document.querySelectorAll(".chat-toast").length === 3,
    );
    assert.equal(
      await h
        .locator(".chat-toasts")
        .getByText("Burst 0", { exact: true })
        .count(),
      0,
    );
    await h
      .locator(".chat-toasts")
      .waitFor({ state: "detached", timeout: 10000 });
    checks.push(
      "chat preview stack is bounded to three messages and expires automatically",
    );
    let hn = await sounds(h),
      gn = await sounds(g);
    await h.getByLabel("Chọc bạn", { exact: true }).selectOption(guestId);
    await g.getByText("Social host vừa chọc bạn 👋", { exact: true }).waitFor();
    await g.waitForFunction((n) => window.__sounds.length === n + 2, gn);
    assert.equal(await sounds(h), hn);
    gn = await sounds(g);
    await cmd(h, { type: "look", yaw: 0, pitch: 0, bodyYaw: 0 });
    assert.equal(await sounds(g), gn);
    checks.push(
      "poke names sender and starts two real WebAudio tones on recipient only, without replay on snapshot",
    );
    const sentReaction = h.waitForRequest(
      (r) =>
        r.url().endsWith("/command") &&
        r.postDataJSON()?.command?.type === "reaction",
    );
    await g.emulateMedia({ reducedMotion: "reduce" });
    await h.getByRole("button", { name: "Pháo bông", exact: true }).click();
    const envelope = (await sentReaction).postDataJSON();
    await h
      .getByRole("status", { name: "Social host: Pháo bông", exact: true })
      .waitFor();
    await g
      .getByRole("status", { name: "Social host: Pháo bông", exact: true })
      .waitFor();
    assert(
      await g
        .getByRole("button", { name: "Pháo bông", exact: true })
        .isDisabled(),
    );
    await h.waitForFunction((n) => window.__sounds.length >= n + 24, hn);
    await g.waitForFunction((n) => window.__sounds.length >= n + 24, gn);
    const hostFireworks = await sounds(h),
      guestFireworks = await sounds(g);
    assert(hostFireworks - hn <= 27 && guestFireworks - gn <= 27);
    assert.equal(await h.locator(".firework-burst").count(), 3);
    assert.equal(await h.locator(".firework-spark").count(), 54);
    assert(await h.locator(".fireworks-show").isVisible());
    assert(
      !(await g.locator(".fireworks-show").isVisible()),
      "Reduced motion hides the particle show, retaining the status card and sound",
    );
    await cmd(h, envelope.command, envelope.commandId);
    assert.equal(await sounds(h), hostFireworks);
    assert.equal(await sounds(g), guestFireworks);
    assert.equal(
      (await cmd(g, { type: "reaction", kind: "troll" })).data.error,
      "REACTION_BUSY",
    );
    await h.waitForTimeout(450);
    await h.screenshot({
      path: path.join(
        process.env.CINEMA_SCREENSHOT_DIR || "/tmp",
        "social-fireworks.png",
      ),
    });
    await h
      .getByRole("button", { name: "Âm thanh tương tác: Bật", exact: true })
      .click();
    await h.waitForFunction(() => window.__audioNodes.every((n) => n.ended));
    await h
      .getByRole("button", { name: "Âm thanh tương tác: Tắt", exact: true })
      .click();
    assert.equal(
      await sounds(h),
      hostFireworks,
      "Unmuting must not replay scheduled blasts",
    );
    await h.locator(".room-reaction").waitFor({ state: "detached" });
    await g.locator(".room-reaction").waitFor({ state: "detached" });
    assert.equal(
      (await api(h, `/rooms/${slot}/state`)).data.room.reaction,
      undefined,
    );
    await g.emulateMedia({ reducedMotion: "no-preference" });
    checks.push(
      "three-burst fireworks and layered sound reach both members; 54 sparks bounded; reduced motion honored; mute cancels pending blasts; unmute and duplicate commands do not replay; room-wide cooldown, disabled controls, 3-second removal and DB cleanup",
    );
    await g.bringToFront();
    await g
      .getByRole("button", { name: "Âm thanh tương tác: Bật", exact: true })
      .click();
    gn = await sounds(g);
    hn = await sounds(h);
    await g.getByRole("button", { name: "Vỗ tay", exact: true }).click();
    await h
      .getByRole("status", { name: "Social guest: Vỗ tay", exact: true })
      .waitFor();
    await h.waitForFunction((n) => window.__sounds.length === n + 9, hn);
    assert.equal(await sounds(g), gn);
    await h.locator(".room-reaction").waitFor({ state: "detached" });
    checks.push(
      "viewer can applaud; real noise-burst audio plays for host while muted recipient sees visual only",
    );
    await g.emulateMedia({ reducedMotion: "reduce" });
    await g.setViewportSize({ width: 390, height: 844 });
    const closeSheet = g.getByRole("button", {
      name: "Đóng điều khiển",
      exact: true,
    });
    await closeSheet.scrollIntoViewIfNeeded();
    assert(
      await closeSheet.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
        );
      }),
      "Voice notice must never obscure the mobile close button",
    );
    checks.push(
      "mobile close button remains hit-testable with a device voice warning; notices stay inside the sheet",
    );

    hn = await sounds(h);
    await h.bringToFront();
    await h.getByRole("button", { name: "Mếu mào", exact: true }).click();
    await g
      .getByRole("status", { name: "Social host: Mếu mào", exact: true })
      .waitFor();
    assert.equal(
      await g
        .locator(".reaction-symbol")
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
    const mobile = await g.locator(".room-reaction").boundingBox();
    assert(mobile.x >= 0 && mobile.x + mobile.width <= 390);
    await h.waitForFunction((n) => window.__sounds.length === n + 2, hn);
    await g.screenshot({
      path: path.join(
        process.env.CINEMA_SCREENSHOT_DIR || "/tmp",
        "social-mobile.png",
      ),
    });
    await g.locator(".room-reaction").waitFor({ state: "detached" });
    await g.bringToFront();
    await g.getByRole("button", { name: "Trêu vui", exact: true }).click();
    await h
      .getByRole("status", { name: "Social guest: Trêu vui", exact: true })
      .waitFor();
    checks.push(
      "sad/troll actions broadcast; mobile fits; reduced motion suppresses animation",
    );
    await g.bringToFront();
    await g.reload();
    await g
      .locator(".room-card")
      .filter({ hasText: "Social UX test" })
      .getByRole("button", { name: "Xin vào phòng" })
      .click();
    await g.getByPlaceholder("Mọi người gọi bạn là…").fill("Social guest");
    await g
      .getByRole("dialog", { name: "Thông tin vào phòng", exact: true })
      .getByRole("button", { name: "Xin vào phòng", exact: true })
      .click();
    await toolbar(g, "Chat").waitFor();
    assert.equal(await g.locator(".chat-toasts").count(), 0);
    assert.equal(await sounds(g), 0);
    checks.push(
      "rejoin seeds chat/poke/reaction history without replaying audio or old-message toasts",
    );
    for (const page of [h, g])
      assert(
        await page.evaluate(() =>
          window.__sounds.every((s) => s.state === "running"),
        ),
      );
    assert.deepEqual(errors, []);
    const report = {
      passed: true,
      target: "local Wrangler",
      checks,
      errors,
      limitations:
        "YouTube fixture; actual WebAudio nodes start in Chromium, not an acoustic or device/autoplay quality certification.",
    };
    fs.writeFileSync(
      path.join(__dirname, "../evidence/social.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } catch (e) {
    console.error(
      "Social browser state",
      await Promise.all(
        [h, g].map((page) =>
          page
            .evaluate(() => ({
              path: location.pathname,
              visibility: document.visibilityState,
              focused: document.hasFocus(),
              activeTag: document.activeElement?.tagName,
              dialog: document
                .querySelector('[role="dialog"]')
                ?.getAttribute("aria-label"),
            }))
            .catch(() => ({ unavailable: true })),
        ),
      ),
    );
    throw e;
  } finally {
    if (epoch) await cmd(h, { type: "close" }).catch(() => {});
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
