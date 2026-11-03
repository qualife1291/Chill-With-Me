const {
  chromium,
} = require("/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:8787/?demo");
  await page.getByPlaceholder("Mọi người gọi bạn là…").fill("An");
  await page.screenshot({ path: "evidence/lobby-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Tạo phòng" }).first().click();
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Tới ghế" }).click();
  await page.waitForTimeout(5500);
  await page.screenshot({ path: "evidence/room-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Mắt người" }).click();
  await page
    .getByPlaceholder("Nói gì với mọi người…")
    .fill("<img src=x onerror=alert(1)>");
  await page.getByRole("button", { name: "Gửi tin", exact: true }).click();
  if (await page.locator(".message img").count()) throw Error("XSS");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error("overflow " + width);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "evidence/room-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Chế độ nhẹ" }).click();
  if ((await page.locator(".seat-map span").count()) !== 6)
    throw Error("seats");
  require("fs").writeFileSync(
    "evidence/browser.json",
    JSON.stringify(
      {
        passed: errors.length === 0,
        errors,
        checks: [
          "lobby",
          "3D canvas mounted",
          "sit transition",
          "camera switch",
          "safe chat text",
          "320/390px no horizontal overflow",
          "six fallback seats",
        ],
        scope: "Local demo; no actual YouTube playback measured",
      },
      null,
      2,
    ),
  );
  await browser.close();
  if (errors.length) throw Error(errors.join("\n"));
  console.log("PASS browser UI and WebGL smoke");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
