import { test } from "node:test";
import assert from "node:assert/strict";
import { audioMix, boundedVolume } from "../shared/audioMix";
import { cinemaMotion } from "../shared/immersive";
import {
  validateCaptions,
  MAX_CAPTION_BYTES,
  MAX_CAPTION_CUES,
} from "../shared/captions";
const encode = (s: string) => new TextEncoder().encode(s);
const vtt =
  "WEBVTT\n\n00:00.000 --> 00:02.000\nXin chào rạp 🎬\n\n00:02.500 --> 00:05.000 align:center\nDòng tiếp theo\n";
test("audio priorities distinguish voice, ambience, effects and paused video", () => {
  assert.deepEqual(audioMix("balanced", true, false, true, true), {
    duckMedia: false,
    sideGain: 1,
  });
  assert(audioMix("balanced", true, true, false, false).duckMedia);
  for (const speech of [false, true])
    for (const fx of [false, true])
      assert.deepEqual(audioMix("video", true, speech, fx, true), {
        duckMedia: false,
        sideGain: 0.25,
      });
  assert.equal(audioMix("video", false, true, true, true).sideGain, 1);
  assert(audioMix("interaction", true, false, true, false).duckMedia);
  assert(audioMix("interaction", true, false, false, true).duckMedia);
  assert(!audioMix("interaction", true, false, false, false).duckMedia);
});
test("audio input clamps nonfinite/negative/oversized levels", () => {
  for (const bad of [NaN, Infinity, -Infinity, -20])
    assert.equal(boundedVolume(bad), 0);
  assert.equal(boundedVolume(200), 50);
  assert.equal(boundedVolume(20), 20);
});
test("cinema motion is opt-in, finite, bounded and respects reduced motion", () => {
  for (const age of [-1, 0, 700, 2799, 2800, Infinity, NaN])
    assert.deepEqual(cinemaMotion("off", age, false), {
      x: 0,
      y: 0,
      active: false,
    });
  assert.deepEqual(cinemaMotion("cinema", 700, true), {
    x: 0,
    y: 0,
    active: false,
  });
  for (let age = 0; age < 2800; age += 7) {
    const p = cinemaMotion("cinema", age, false);
    assert(p.active && Math.abs(p.x) <= 0.025 && Math.abs(p.y) <= 0.015);
  }
  assert(Math.abs(cinemaMotion("cinema", 2799, false).x) < 0.00001);
  assert.equal(cinemaMotion("cinema", 2800, false).active, false);
});
test("basic WebVTT accepts unicode, BOM/CRLF, note and cue IDs", () => {
  assert.equal(validateCaptions(encode(vtt)).cues, 2);
  const x =
    "\uFEFFWEBVTT\r\n\r\nNOTE personal\r\nignored\r\n\r\nid1\r\n00:00:01.000 --> 00:00:03.500 position:50%\r\nHai dòng\r\nđẹp\r\n";
  assert.equal(validateCaptions(encode(x)).cues, 1);
});
test("WebVTT rejects bad encoding, size, empty files and unsupported styles", () => {
  for (const bytes of [
    new Uint8Array(),
    new Uint8Array(MAX_CAPTION_BYTES + 1),
    new Uint8Array([0xff, 0xfe]),
  ])
    assert.throws(() => validateCaptions(bytes));
  for (const bad of [
    "<script>alert(1)</script>",
    "WEBVTT\n",
    "WEBVTT\n\nSTYLE\n::cue{color:red}",
    "WEBVTT\n\n00:00.000 --> 00:01.000\n\0",
    "WEBVTT\n\n00:00.000 --> 00:01.000\n" + "x".repeat(2001),
  ])
    assert.throws(() => validateCaptions(encode(bad)));
});
test("WebVTT timestamp/settings boundaries are validated before Blob creation", () => {
  for (const timing of [
    "00:60.000 --> 01:00.000",
    "00:01.000 --> 00:01.000",
    "00:05.000 --> 00:02.000",
    "24:00:00.000 --> 24:00:01.000",
    "00:00.000 --> 00:01.000 position:999%",
    "00:00.000 --> 00:01.000 position:100.5%",
    "00:00.000 --> 00:01.000 url:https://x.test",
  ]) {
    assert.throws(
      () => validateCaptions(encode("WEBVTT\n\n" + timing + "\nHi\n")),
      timing,
    );
  }
  const cues = Array.from(
    { length: MAX_CAPTION_CUES + 1 },
    () => "00:00.000 --> 00:01.000\nHi",
  ).join("\n\n");
  assert.throws(() => validateCaptions(encode("WEBVTT\n\n" + cues)));
});
