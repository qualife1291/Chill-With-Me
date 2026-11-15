import * as THREE from "three";
import test from "node:test";
import assert from "node:assert/strict";
import { vietnameseNumber, lotoCall, callVariant } from "../shared/lotoCalls";
import { oaqStage, gameCameraDistance } from "../shared/gameStage";
import { SpeechBus } from "../src/speechBus";
test("Vietnamese number pronunciation covers 1–90 and rejects invalid draws", () => {
  for (let n = 1; n <= 90; n++)
    assert.match(vietnameseNumber(n), /^[a-zà-ỹ ]+$/u);
  assert.equal(vietnameseNumber(15), "mười lăm");
  assert.equal(vietnameseNumber(21), "hai mươi mốt");
  assert.equal(vietnameseNumber(90), "chín mươi");
  for (const n of [0, -1, 91, NaN, Infinity, 1.2])
    assert.throws(() => lotoCall(n));
});
test("all 90 original calls have bounded text, explicit final number and deterministic variants", () => {
  const lines = new Set<string>();
  for (let n = 1; n <= 90; n++) {
    for (let variant = 0; variant < 3; variant++) {
      const c = lotoCall(n, variant);
      assert(c.line?.length > 8 && c.text.length < 180);
      assert(c.text.endsWith(`Số ${vietnameseNumber(n)}!`));
      assert(!c.text.includes("undefined"));
      lines.add(c.line);
    }
    assert.equal(callVariant("round", n), callVariant("round", n));
    assert(callVariant("round", n) >= 0 && callVariant("round", n) < 3);
  }
  assert.equal(lines.size, 90);
});
test("both 3D boards keep twelve nonoverlapping pits within the wooden surface", () => {
  for (const portrait of [true, false]) {
    const l = oaqStage(portrait);
    assert.equal(l.pits.length, 12);
    for (const [i, p] of l.pits.entries()) {
      assert(Math.abs(p.x) + p.w / 2 < l.width / 2);
      assert(Math.abs(p.z) + p.d / 2 < l.depth / 2);
      for (const q of l.pits.slice(i + 1))
        assert(
          Math.abs(p.x - q.x) >= (p.w + q.w) / 2 ||
            Math.abs(p.z - q.z) >= (p.d + q.d) / 2,
        );
    }
  }
});
function fixture() {
  const played: SpeechSynthesisUtterance[] = [];
  let cancelled = 0,
    onCancel = () => {};
  const bus = new SpeechBus(() => ({
    speak: (u) => played.push(u),
    cancel: () => {
      cancelled++;
      onCancel();
    },
  }));
  const utterance = (text: string) =>
    ({
      text,
      onstart: null,
      onend: null,
      onerror: null,
    }) as unknown as SpeechSynthesisUtterance;
  return {
    bus,
    played,
    utterance,
    cancels: () => cancelled,
    onCancel: (f: () => void) => (onCancel = f),
  };
}
const end = (u: SpeechSynthesisUtterance) =>
  u.onend?.call(u, new Event("end") as SpeechSynthesisEvent);
test("a lottery call preempts chat before chat can submit its next utterance", () => {
  const f = fixture(),
    chat = f.utterance("chat"),
    next = f.utterance("next"),
    call = f.utterance("call");
  chat.onend = () => f.bus.speak("chat", next);
  f.bus.speak("chat", chat);
  f.bus.speak("loto", call);
  assert.deepEqual(
    f.played.map((u) => u.text),
    ["chat", "call"],
  );
  assert.equal(f.cancels(), 1);
  end(call);
  assert.equal(f.played.at(-1), next);
});
test("chat cancellation cannot cancel the lottery owner, and stale callbacks cannot start ducking", () => {
  const f = fixture(),
    chat = f.utterance("chat"),
    call = f.utterance("call");
  let starts = 0;
  chat.onstart = () => {
    starts++;
  };
  f.bus.speak("chat", chat);
  const late = chat.onstart;
  f.bus.speak("loto", call);
  f.bus.cancel("chat");
  late?.call(chat, new Event("start") as SpeechSynthesisEvent);
  assert.equal(starts, 0);
  assert.equal(f.cancels(), 1);
  assert.equal(f.played.at(-1), call);
});
test("a deferred chat is removed on its own stop and never spoken after game end", () => {
  const f = fixture(),
    call = f.utterance("call"),
    chat = f.utterance("chat");
  f.bus.speak("loto", call);
  f.bus.speak("chat", chat);
  f.bus.cancel("chat");
  end(call);
  assert.deepEqual(
    f.played.map((u) => u.text),
    ["call"],
  );
});
test("latest game call replaces the old one while retaining one bounded deferred chat", () => {
  const f = fixture(),
    one = f.utterance("one"),
    two = f.utterance("two"),
    chat = f.utterance("chat");
  f.bus.speak("loto", one);
  const staleEnd = one.onend;
  f.bus.speak("chat", chat);
  f.bus.speak("loto", two);
  staleEnd?.call(one, new Event("end") as SpeechSynthesisEvent);
  assert.deepEqual(
    f.played.map((u) => u.text),
    ["one", "two"],
  );
  end(two);
  assert.equal(f.played.at(-1), chat);
});
test("synchronous browser errors from cancelled speech cannot finish a replacement", () => {
  const f = fixture(),
    one = f.utterance("one"),
    two = f.utterance("two");
  let errors = 0;
  one.onerror = () => {
    errors++;
  };
  f.bus.speak("chat", one);
  const staleError = one.onerror;
  f.onCancel(() =>
    staleError?.call(one, new Event("error") as SpeechSynthesisErrorEvent),
  );
  f.bus.speak("loto", two);
  assert.equal(errors, 0);
  assert.equal(f.played.at(-1), two);
});
test("a browser speak failure releases the lane and reports an error without locking room entry", () => {
  let failed = 0;
  const bus = new SpeechBus(() => ({
    speak: () => {
      throw Error("blocked");
    },
    cancel() {},
  }));
  const u = {
    onstart: null,
    onend: null,
    onerror: () => {
      failed++;
    },
  } as unknown as SpeechSynthesisUtterance;
  bus.speak("loto", u);
  assert.equal(failed, 1);
  bus.cancel("loto");
});

test("perspective game camera includes every near/far corner at phone and rotated angles", () => {
  for (const aspect of [0.5, 1, 1.3, 2.5])
    for (const angle of [-30, 0, 30])
      for (const portrait of [true, false]) {
        const l = oaqStage(portrait),
          d = gameCameraDistance(l.width, l.depth, -0.65, 1.05, aspect, angle),
          camera = new THREE.PerspectiveCamera(38, aspect, 0.15, 80);
        camera.position.set(0, 0.4 + d * 0.88, d * 0.48);
        camera.lookAt(0, 0.4, 0);
        camera.updateMatrixWorld();
        for (const x of [-l.width / 2, l.width / 2])
          for (const z of [-l.depth / 2, l.depth / 2])
            for (const y of [-0.65, 1.05]) {
              const point = new THREE.Vector3(x, y, z)
                .applyAxisAngle(
                  new THREE.Vector3(0, 1, 0),
                  (angle * Math.PI) / 180,
                )
                .project(camera);
              assert(
                Math.abs(point.x) <= 0.911 &&
                  Math.abs(point.y) <= 0.911 &&
                  point.z > -1 &&
                  point.z < 1,
                JSON.stringify({ aspect, angle, portrait, point }),
              );
            }
      }
});
