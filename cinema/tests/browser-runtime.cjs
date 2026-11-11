// Prefer a normal local install; allow CI to select an existing installation.
const fs = require("node:fs");
let playwright;
for (const modulePath of [
  process.env.PLAYWRIGHT_MODULE_PATH,
  "playwright",
  "/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
].filter(Boolean)) {
  let resolved;
  try {
    resolved = require.resolve(modulePath);
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND") continue;
    throw error;
  }
  playwright = require(resolved);
  break;
}
if (!playwright)
  throw Error(
    "Install Playwright or set PLAYWRIGHT_MODULE_PATH before browser tests.",
  );
const executablePath =
  process.env.CHROMIUM_EXECUTABLE_PATH ||
  (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
module.exports = { chromium: playwright.chromium, executablePath };

module.exports.openActions = async (page) => {
  const trigger = page.getByRole("button", {
    name: "Hành động và cảm xúc",
    exact: true,
  });
  if ((await trigger.getAttribute("aria-expanded")) !== "true")
    await trigger.click();
};
