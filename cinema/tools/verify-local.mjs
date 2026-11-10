// All room mutations are fixed to localhost. Existing occupied rooms are preserved.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  node = process.execPath;
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "cinema-verify-"));
fs.mkdirSync(path.join(temporary, "evidence"));
const stages = [],
  report = {
    passed: false,
    date: new Date().toISOString(),
    target: "local Wrangler only",
    stages,
    artifacts: temporary,
    limitations:
      "UI mocks YouTube/device speech; native media uses real generated codecs; single software renderer; no physical-device, production/WAN/quota or full-voice certification.",
  };
const reportPath = path.join(root, "evidence/verification.json");
let artifactProcess;
const get = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
  if (!r.ok) throw Error(`HTTP ${r.status} ${url}`);
  return r;
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function run(name, program, args, cwd = root) {
  console.log(`RUN ${name}`);
  const start = performance.now(),
    log = path.join(
      temporary,
      stages.length + "-" + name.replaceAll(/[^\w-]/g, "_") + ".log",
    );
  const stream = fs.createWriteStream(log);
  let output = "";
  const child = spawn(program, args, {
    cwd,
    env: {
      ...process.env,
      CI: "1",
      WRANGLER_SEND_METRICS: "false",
      CINEMA_SCREENSHOT_DIR: path.join(temporary, "evidence"),
    },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const source of [child.stdout, child.stderr])
    source.on("data", (bytes) => {
      stream.write(bytes);
      output = (output + bytes).slice(-32000);
    });
  const timeout = setTimeout(() => {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  }, 600000);
  let code;
  try {
    code = await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("close", resolve);
    });
  } finally {
    clearTimeout(timeout);
    stream.end();
  }
  const result = {
    name,
    passed: code === 0,
    milliseconds: Math.round(performance.now() - start),
    log,
  };
  stages.push(result);
  if (code !== 0) {
    console.error(output);
    throw Error(`${name} failed (${code}); ${log}`);
  }
  console.log(`PASS ${name}`);
  return output;
}
try {
  const rooms = await (await get("http://localhost:8787/api/rooms")).json();
  if (rooms.some((r) => r.open))
    throw Error(
      "All three LOCAL slots must be free. Existing rooms were preserved.",
    );
  await run("frontend build", "npm", ["run", "build"]);
  const expected = fs.readFileSync(path.join(root, "dist/index.html"), "utf8");
  let stable = 0;
  for (let i = 0; i < 40 && stable < 3; i++) {
    try {
      stable =
        (await (await get("http://localhost:8787/")).text()) === expected
          ? stable + 1
          : 0;
    } catch {
      stable = 0;
    }
    await pause(250);
  }
  if (stable < 3)
    throw Error("Local dev server did not settle on the current build");
  let cases = 0;
  for (const file of fs
    .readdirSync(path.join(root, "tests"))
    .filter((n) => n.endsWith(".test.ts"))
    .sort()) {
    const output = await run("unit " + file, node, [
      "--import",
      "tsx",
      "tests/" + file,
    ]);
    cases += Number(output.match(/tests\s+(\d+)/)?.[1] || 0);
  }
  report.individualLogicCases = cases;
  await run("Worker types", "npm", ["run", "check:worker"]);
  await run("document links", "npm", ["run", "check:docs"]);
  await run("Worker dry run", "npm", ["run", "worker:check"]);
  for (const file of [
    "api.integration.mjs",
    "playlist.integration.mjs",
    "roadmap.integration.mjs",
    "relay-security.cjs",
  ])
    await run(file, node, ["tests/" + file]);
  await run(
    "UI views avatars chat voice",
    node,
    [path.join(root, "tests/fixes.cjs")],
    temporary,
  );
  fs.copyFileSync(
    path.join(temporary, "evidence/fixes.json"),
    path.join(root, "evidence/fixes.json"),
  );
  for (const file of [
    "departures.cjs",
    "social.cjs",
    "world-screen.cjs",
    "scene-quality.cjs",
    "spaces.cjs",
    "media.cjs",
    "roadmap.cjs",
    "render-capacity.cjs",
  ])
    await run(file, node, ["tests/" + file]);
  const capacity = await run("capacity 3 rooms 30 sockets", node, [
    "tests/capacity.cjs",
  ]);
  const broadcasts = [...capacity.matchAll(/all in (\d+)ms/g)].map((m) =>
      Number(m[1]),
    ),
    metrics = capacity.match(
      /p50=([\d.]+)ms p95=([\d.]+)ms \((\d+) requests\)/,
    );
  if (broadcasts.length === 3 && metrics)
    fs.writeFileSync(
      path.join(root, "evidence/capacity.json"),
      JSON.stringify(
        {
          date: new Date().toISOString().slice(0, 10),
          target: "local Wrangler only",
          passed: true,
          rooms: 3,
          members_per_room: 10,
          authenticated_websockets: 30,
          spaces: ["cinema", "lounge", "rooftop"],
          broadcast_all_members_ms: broadcasts,
          http_requests_measured: Number(metrics[3]),
          http_p50_ms: Number(metrics[1]),
          http_p95_ms: Number(metrics[2]),
          overflow_rejected: true,
          limitations:
            "Short backend smoke; no media/GPU/WAN/sustained throughput. Own test rooms closed.",
        },
        null,
        2,
      ) + "\n",
    );
  await run("embedded bundle", node, ["scripts-bundle.mjs"]);
  await run("embedded local config", node, ["tools/embedded-config.mjs"]);
  let available = false;
  try {
    await get("http://localhost:8788/api/rooms");
    available = true;
  } catch {}
  if (!available) {
    artifactProcess = spawn(
      node,
      [
        path.join(root, "node_modules/wrangler/bin/wrangler.js"),
        "dev",
        "--local",
        "--config",
        ".wrangler/embedded-check.json",
        "--port",
        "8788",
        "--persist-to",
        path.join(temporary, "artifact-state"),
      ],
      {
        cwd: root,
        detached: true,
        env: {
          ...process.env,
          CI: "1",
          WRANGLER_SEND_METRICS: "false",
          CINEMA_SCREENSHOT_DIR: path.join(temporary, "evidence"),
        },
        stdio: [
          "ignore",
          fs.openSync(path.join(temporary, "artifact-server.log"), "w"),
          fs.openSync(path.join(temporary, "artifact-server-error.log"), "w"),
        ],
      },
    );
    for (let i = 0; i < 80 && !available; i++) {
      try {
        await get("http://localhost:8788/api/rooms");
        available = true;
      } catch {}
      if (!available) await pause(250);
    }
    if (!available) throw Error("Embedded local runtime did not become ready");
  }
  let artifactStable = false;
  for (let i = 0; i < 40 && !artifactStable; i++) {
    try {
      artifactStable =
        (await (await get("http://localhost:8788/")).text()) === expected;
    } catch {}
    if (!artifactStable) await pause(250);
  }
  if (!artifactStable)
    throw Error("Embedded runtime has not loaded this build");
  await run("embedded asset bytes", node, ["tests/artifact.integration.mjs"]);
  const remaining = await (await get("http://localhost:8787/api/rooms")).json();
  if (remaining.some((r) => r.open))
    throw Error("A runner-owned local room did not close");
  report.passed = true;
  console.log(
    `PASS full local verification; ${cases} individual logic cases; reports in cinema/evidence; logs/screenshots ${temporary}`,
  );
} catch (e) {
  report.error = e instanceof Error ? e.message : String(e);
  console.error(report.error);
  process.exitCode = 1;
} finally {
  if (artifactProcess) {
    try {
      process.kill(-artifactProcess.pid, "SIGTERM");
    } catch {}
  }
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
}
