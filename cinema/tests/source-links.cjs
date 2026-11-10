// Read-only external observations; keep out of deterministic local release gates.
const { chromium, executablePath } = require("./browser-runtime.cjs");
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  { execFileSync } = require("node:child_process"),
  { createHash } = require("node:crypto");
(async () => {
  const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
    ...(proxy
      ? { proxy: { server: proxy, bypass: "localhost,127.0.0.1" } }
      : {}),
  });
  const page = await browser.newPage();
  const samples = fs.mkdtempSync(
    path.join(os.tmpdir(), "cinema-link-samples-"),
  );
  const results = [];
  const transport = [];
  page.on("requestfailed", (r) => {
    if (transport.length < 20)
      transport.push({
        path: r.url().split("?")[0],
        error: r.failure()?.errorText,
      });
  });
  const fixtures = [
    {
      name: "MDN MP4",
      url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    },
    {
      name: "MDN WebM",
      url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
    },
    {
      name: "MDN MP3",
      url: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3",
    },
  ];
  try {
    await page.goto("http://localhost:8787/api/rooms");
    const probe = (url) =>
      page.evaluate(async (url) => {
        const video = document.createElement("video");
        document.body.replaceChildren(video);
        video.volume = 0.2;
        return new Promise((resolve) => {
          let ended = false;
          const finish = (state) => {
            if (ended) return;
            ended = true;
            clearTimeout(timer);
            clearInterval(poll);
            resolve({
              ...state,
              width: video.videoWidth,
              height: video.videoHeight,
              readyState: video.readyState,
              currentTime: video.currentTime,
              duration: Number.isFinite(video.duration) ? video.duration : null,
            });
            video.pause();
            video.removeAttribute("src");
            video.load();
          };
          const timer = setTimeout(
            () =>
              finish({ status: "timeout", error: video.error?.code || null }),
            20000,
          );
          const poll = setInterval(() => {
            if (!video.paused && video.currentTime > 0.15)
              finish({ status: "played" });
          }, 100);
          video.onerror = () =>
            finish({
              status: "media-error",
              error: video.error?.code || null,
              message: video.error?.message || "",
            });
          video.src = url;
          video
            .play()
            .catch((e) => finish({ status: "blocked", error: e.name }));
        });
      }, url);
    for (const [index, fixture] of fixtures.entries()) {
      const result = await probe(fixture.url);
      if (result.status !== "played") {
        // Preserve direct-browser failure. Independently verify HTTPS bytes with
        // inherited CA trust, then decode that exact downloaded sample locally.
        const file = path.join(samples, String(index));
        try {
          const metadata = execFileSync(
            "curl",
            [
              "--fail",
              "--location",
              "--max-time",
              "30",
              "--output",
              file,
              "--write-out",
              "%{http_code} %{content_type}",
              fixture.url,
            ],
            { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
          );
          const bytes = fs.readFileSync(file),
            mime = metadata.split(" ").at(-1);
          const local = `http://localhost:8787/__qa_link_sample_${index}`;
          await page.route(local, (route) =>
            route.fulfill({ contentType: mime, body: bytes }),
          );
          result.downloadedSample = {
            https: metadata,
            bytes: bytes.length,
            sha256: createHash("sha256").update(bytes).digest("hex"),
            localReplay: await probe(local),
          };
          await page.unroute(local);
        } catch (error) {
          result.downloadedSample = {
            status: "download-failed",
            code: error.status || error.name,
          };
        }
      }
      results.push({ ...fixture, ...result });
    }
    const youtube = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const timer = setTimeout(() => resolve({ status: "timeout" }), 25000);
          const finish = (x) => {
            clearTimeout(timer);
            resolve(x);
          };
          document.body.replaceChildren();
          const mount = document.createElement("div");
          document.body.append(mount);
          window.onYouTubeIframeAPIReady = () => {
            new window.YT.Player(mount, {
              videoId: "M7lc1UVf-VE",
              playerVars: {
                origin: location.origin,
                autoplay: 1,
                mute: 1,
                playsinline: 1,
              },
              events: {
                onReady: (e) => e.target.playVideo(),
                onStateChange: (e) => {
                  if (e.data === 1) finish({ status: "played" });
                },
                onError: (e) =>
                  finish({ status: "player-error", code: e.data }),
              },
            });
          };
          const script = document.createElement("script");
          script.src = "https://www.youtube.com/iframe_api";
          script.onerror = () => finish({ status: "api-blocked" });
          document.head.append(script);
        }),
    );
    results.push({
      name: "YouTube official API demo",
      url: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
      ...youtube,
    });
    const report = {
      date: new Date().toISOString(),
      target: "External read-only browser observations",
      results,
      transport,
      limitations:
        "Direct browser HTTPS results remain separate from curl downloads replayed through a local route fixture; these do not certify live browser streaming. Explicit autoplay-allowed test browser; user-gesture/autoplay, signed-in Premium, ads, DRM and physical sound/display quality are separate gates. A provider/network failure is recorded, not marked playable.",
    };
    fs.writeFileSync(
      path.join(__dirname, "../evidence/source-links.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    fs.rmSync(samples, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
