const { chromium, executablePath } = require("./browser-runtime.cjs");
(async () => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const host = await browser.newPage(),
    guest = await browser.newPage();
  const errors = [];
  for (const p of [host, guest]) {
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://localhost:8787/");
  }
  await host.getByPlaceholder("Mọi người gọi bạn là…").fill("Host QA");
  await host.getByRole("button", { name: "Tạo phòng" }).first().click();
  await host.getByRole("button", { name: "Mọi người", exact: true }).click();
  await guest.reload();
  await guest.getByPlaceholder("Mọi người gọi bạn là…").fill("Guest QA");
  await guest.getByRole("button", { name: "Xin vào phòng" }).first().click();
  await host.getByRole("button", { name: "Chấp nhận Guest QA" }).click();
  await guest.getByRole("button", { name: "Chat", exact: true }).waitFor();
  await guest.getByPlaceholder("Nói gì với mọi người…").fill("Realtime works");
  await guest.getByRole("button", { name: "Gửi tin", exact: true }).click();
  await host.getByRole("button", { name: "Chat", exact: true }).click();
  await host.getByText("Realtime works", { exact: true }).waitFor();
  await host.getByRole("button", { name: "Mọi người", exact: true }).click();
  host.on("dialog", (d) => d.accept());
  await host.getByRole("button", { name: "Mời ra", exact: true }).click();
  await guest
    .getByText("Bạn đã rời phòng hoặc phòng đã đóng.", { exact: true })
    .waitFor();
  await host.getByRole("button", { name: "Đóng phòng", exact: true }).click();
  await host.getByText("Chọn phòng của bạn", { exact: true }).waitFor();
  require("fs").writeFileSync(
    "evidence/realtime.json",
    JSON.stringify(
      {
        passed: errors.length === 0,
        errors,
        checks: [
          "independent browser sessions",
          "host create",
          "guest pending",
          "host accepts",
          "WebSocket chat delivery",
          "kick closes guest access",
          "host closes room",
        ],
        scope: "Local Wrangler runtime; no external video playback",
      },
      null,
      2,
    ),
  );
  await browser.close();
  if (errors.length) throw Error(errors.join("\n"));
  console.log("PASS two-browser realtime admission/chat/kick");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
