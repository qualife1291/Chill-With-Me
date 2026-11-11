// Actual offline WebAudio synthesis. No speaker/physical loudness certification.
const { chromium, executablePath } = require("./browser-runtime.cjs");
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  ts = require("typescript");
(async () => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const p = await browser.newPage();
    const module = ts.transpileModule(
      fs.readFileSync(path.join(__dirname, "../src/fireworkSound.ts"), "utf8"),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      },
    ).outputText;
    const schedule = ts.transpileModule(
      fs.readFileSync(path.join(__dirname, "../shared/fireworks.ts"), "utf8"),
      {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
        },
      },
    ).outputText;
    await p.route("**/__qa/src/fireworkSound.js", (r) =>
      r.fulfill({ contentType: "application/javascript", body: module }),
    );
    await p.route("**/__qa/shared/fireworks", (r) =>
      r.fulfill({ contentType: "application/javascript", body: schedule }),
    );
    await p.goto("http://localhost:8787/api/rooms");
    const data = await p.evaluate(async () => {
      const { playFireworkSound } = await import("/__qa/src/fireworkSound.js");
      const run = async (age, cancel = false) => {
        const ctx = new OfflineAudioContext(1, 44100 * 3, 44100),
          bus = ctx.createGain();
        bus.gain.value = 0.14;
        bus.connect(ctx.destination);
        const stop = playFireworkSound(ctx, bus, age);
        if (cancel) stop();
        const rendered = await ctx.startRendering(),
          samples = rendered.getChannelData(0);
        stop();
        bus.disconnect();
        let peak = 0,
          energy = 0,
          finite = true;
        for (const s of samples) {
          peak = Math.max(peak, Math.abs(s));
          energy += s * s;
          if (!Number.isFinite(s)) finite = false;
        }
        const power = (start, end) => {
          let sum = 0;
          const a = Math.floor(start * 44100),
            b = Math.floor(end * 44100);
          for (let i = a; i < b; i++) sum += samples[i] * samples[i];
          return sum / (b - a);
        };
        return {
          peak,
          rms: Math.sqrt(energy / samples.length),
          finite,
          burstPower: [0.28, 0.93, 1.58].map((t) => power(t + 0.02, t + 0.12)),
          first40ms: power(0, 0.04),
          tailPower: power(2.5, 2.9),
        };
      };
      return {
        normal: await run(0),
        late: await run(1500),
        cancelled: await run(0, true),
        expired: await run(3000),
      };
    });
    assert(
      data.normal.finite && data.normal.peak < 0.25 && data.normal.rms > 0.001,
    );
    assert(data.normal.burstPower.every((x) => x > 0.00001));
    assert.equal(data.normal.tailPower, 0);
    assert.equal(data.late.first40ms, 0);
    assert(data.late.peak > 0 && data.late.peak < 0.25);
    assert.equal(data.cancelled.peak, 0);
    assert.equal(data.expired.peak, 0);
    const report = {
      passed: true,
      checks: [
        "three audible synthesis bursts with bounded finite samples",
        "late events skip past blasts",
        "cancel removes scheduled future cues",
        "expired events are silent; final tail is silent",
      ],
      measurements: data,
      limitations:
        "Actual Chromium OfflineAudioContext rendering of the current TypeScript sound helper at a 0.14 output bus. No recordings; not acoustic quality or physical-device sound pressure certification.",
    };
    fs.writeFileSync(
      path.join(__dirname, "../evidence/fireworks-audio.json"),
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
