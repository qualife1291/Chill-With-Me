import { test } from "node:test";
import assert from "node:assert/strict";
import { resumeAudio } from "../src/audioResume";
test("running audio never calls resume; suspended audio waits for actual running state", async () => {
  const ctl = new AbortController();
  let calls = 0;
  const live = {
    state: "running" as AudioContextState,
    resume: async () => {
      calls++;
    },
  };
  await resumeAudio(live, ctl.signal);
  assert.equal(calls, 0);
  live.state = "suspended";
  live.resume = async () => {
    calls++;
    live.state = "running";
  };
  await resumeAudio(live, ctl.signal);
  assert.equal(calls, 1);
});
test("device-less pending resume is bounded and rejected state cannot appear playing", async () => {
  const ctl = new AbortController();
  await assert.rejects(
    resumeAudio(
      { state: "suspended", resume: () => new Promise(() => {}) },
      ctl.signal,
      20,
    ),
    /AUDIO_BLOCKED/,
  );
  await assert.rejects(
    resumeAudio({ state: "suspended", resume: async () => {} }, ctl.signal),
    /AUDIO_BLOCKED/,
  );
  await assert.rejects(
    resumeAudio(
      {
        state: "closed",
        resume: async () => {
          throw Error("closed");
        },
      },
      ctl.signal,
    ),
    /closed/,
  );
});
test("cancelled startup rejects promptly, and late resolution cannot restart it", async () => {
  const ctl = new AbortController();
  let resolve: () => void = () => {};
  const ctx = {
    state: "suspended" as AudioContextState,
    resume: () =>
      new Promise<void>((r) => {
        resolve = r;
      }),
  };
  const work = resumeAudio(ctx, ctl.signal, 10000);
  ctl.abort();
  await assert.rejects(work, /AUDIO_CANCELLED/);
  ctx.state = "running";
  resolve();
  await assert.rejects(resumeAudio(ctx, ctl.signal), /AUDIO_CANCELLED/);
});
