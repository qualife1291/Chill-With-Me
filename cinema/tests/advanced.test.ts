import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseMediaURL,
  publicHTTPSURL,
  isHlsURL,
  localMime,
} from "../shared/media";
import { particleBudget, CAMERA_PRESETS } from "../shared/experience";
test("HLS links are remote-only, normalize signed URLs, and retain public HTTPS guards", () => {
  const r = parseMediaURL(
    "https://stream.example.com/master.M3U8?token=public-test#fragment",
  );
  assert.equal(r.source.kind, "url");
  assert("url" in r.source && r.source.url.endsWith("?token=public-test"));
  assert(isHlsURL("https://stream.example.com/index.m3u8?x=1"));
  assert(!isHlsURL("https://stream.example.com/index.mp4"));
  assert.equal(
    localMime("manifest.m3u8", "application/vnd.apple.mpegurl"),
    undefined,
  );
  for (const u of [
    "http://stream.example.com/seg.ts",
    "https://127.0.0.1/seg.ts",
    "https://[::1]/x",
    "https://foo.local/x",
    "https://foo.local./x",
    "https://foo.localhost./x",
    "https://localhost./x",
    "https://u:p@stream.example.com/x",
    "https://stream.example.com:999/x",
    "javascript:alert(1)",
  ])
    assert.throws(() => publicHTTPSURL(u));
  assert.equal(
    publicHTTPSURL("https://cdn.example.com/fragment.ts?token=test").protocol,
    "https:",
  );
});
test("effect quality respects reduced motion, quiet mode and compact/save-data budgets", () => {
  for (const mode of ["auto", "full", "quiet"] as const)
    assert.equal(particleBudget(mode, false, false, true), 0);
  assert.equal(particleBudget("quiet", false, false, false), 0);
  assert(
    particleBudget("auto", true, false, false) <
      particleBudget("auto", false, false, false),
  );
  assert.equal(particleBudget("auto", false, true, false), 12);
  assert.equal(particleBudget("full", true, true, false), 30);
});
test("camera quick presets preserve the two supported camera modes and bounded zoom", () => {
  for (const p of Object.values(CAMERA_PRESETS)) {
    assert(["first", "orbit"].includes(p.mode));
    assert(p.zoom >= -24 && p.zoom <= 24);
  }
  assert(CAMERA_PRESETS.wide.zoom > CAMERA_PRESETS.screen.zoom);
});
