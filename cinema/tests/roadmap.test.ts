import { test } from "node:test";
import assert from "node:assert/strict";
import {
  apply,
  createRoom,
  requestJoin,
  view,
  roomSummary,
  commandSchema,
} from "../shared/model";
import { parsePlaylist } from "../shared/playlist";
import { RoomClock } from "../shared/clock";
const a = "https://youtu.be/jfKfPfyJRdk",
  b = "https://media.example.com/audio.mp3",
  c = "https://media.example.com/movie.mov";
const fixture = () => {
  const r = createRoom(
    "h",
    "Host",
    "Hidden title",
    4,
    1000,
    "female",
    "private",
  );
  requestJoin(r, "g", "Guest", 1000, "male", r.inviteKey);
  apply(r, "h", { type: "accept", id: "g" }, 1000);
  return r;
};
test("private summary/outsider/guest cannot discover title, session, capacity or invitation key", () => {
  const r = fixture();
  assert.deepEqual(roomSummary(r), { open: true, private: true });
  assert.deepEqual(view(r, "outsider"), { status: "removed" });
  const guest = view(r, "g");
  assert(!JSON.stringify(guest).includes(r.inviteKey!));
  assert(!("inviteKey" in guest.room!));
  assert.equal(view(r, "h").room?.inviteKey, r.inviteKey);
});
test("private admission requires a capability, rotation revokes old pending requests but preserves members", () => {
  const r = fixture(),
    old = r.inviteKey!;
  assert.throws(() => requestJoin(r, "x", "X", 1000), /INVITE_REQUIRED/);
  assert.throws(
    () => requestJoin(r, "x", "X", 1000, "male", crypto.randomUUID()),
    /INVITE_REQUIRED/,
  );
  requestJoin(r, "p", "P", 1000, "male", old);
  assert.equal(view(r, "p").status, "pending");
  assert.throws(
    () => apply(r, "g", { type: "rotate-invite" }, 1001),
    /HOST_ONLY/,
  );
  apply(r, "h", { type: "rotate-invite" }, 1001);
  assert.notEqual(r.inviteKey, old);
  assert.equal(r.pending.length, 0);
  assert.deepEqual(view(r, "p"), { status: "removed" });
  assert.throws(
    () => requestJoin(r, "p", "P", 1002, "male", old),
    /INVITE_REQUIRED/,
  );
  requestJoin(r, "x", "X", 1002, "male", r.inviteKey);
  requestJoin(r, "g", "Guest resumed", 1002);
  assert.equal(r.members.length, 2);
  assert.equal(view(r, "g").status, "joined");
});
test("legacy public rooms and empty slots keep their lobby behavior", () => {
  const r = createRoom("h", "H", "Public", 2, 0);
  delete r.visibility;
  delete r.inviteKey;
  requestJoin(r, "g", "G", 1);
  assert.equal(view(r, "g").status, "pending");
  assert.deepEqual(roomSummary(r), {
    open: true,
    title: "Public",
    capacity: 2,
    count: 1,
  });
  assert.deepEqual(roomSummary(null), { open: false });
});
test("static M3U/plain list preview preserves order and deduplicates canonical provider URLs", () => {
  const parsed = parsePlaylist(
    `\uFEFF#EXTM3U\r\n#EXTINF:10,Title\r\n${a}\r\nhttps://youtube.com/watch?v=jfKfPfyJRdk\r\n${b}`,
  );
  assert.deepEqual(parsed.urls, [a, b]);
  assert.equal(parsed.duplicates, 1);
  assert.throws(
    () => parsePlaylist(`${a}\nnot-a-link\n${b}`),
    /INVALID_MEDIA_LINE:2/,
  );
  assert.throws(
    () =>
      parsePlaylist(
        "#EXTM3U\n#EXT-X-TARGETDURATION:10\nhttps://example.com/segment.mp4",
      ),
    /IMPORT_STREAM_PLAYLIST/,
  );
});
test("bulk import bounds reject all invalid input before any queue mutation", () => {
  assert.throws(() => parsePlaylist(Array(21).fill(a)), /IMPORT_TOO_MANY/);
  assert.throws(() => parsePlaylist("x".repeat(16385)), /IMPORT_TOO_LARGE/);
  assert.throws(() => parsePlaylist("#comments\n"), /IMPORT_EMPTY/);
  const r = fixture(),
    before = JSON.stringify(r);
  assert.throws(
    () =>
      apply(
        r,
        "h",
        {
          type: "import",
          urls: [a, "invalid"],
          mode: "start",
          generation: 0,
          expectedQueueRevision: 0,
        },
        2000,
      ),
    /INVALID_MEDIA_LINE:2/,
  );
  assert.equal(JSON.stringify(r), before);
  assert(
    !commandSchema.safeParse({
      type: "import",
      urls: [a],
      mode: "start",
      generation: 0,
    }).success,
  );
});
test("bulk first-play is atomic, then appending never resets the current timeline", () => {
  const r = fixture();
  apply(
    r,
    "h",
    {
      type: "import",
      urls: [a, b, c],
      mode: "start",
      generation: 0,
      expectedQueueRevision: 0,
    },
    2000,
  );
  assert.equal(r.current?.videoId, "jfKfPfyJRdk");
  assert.equal(r.queue.length, 2);
  assert.equal(r.generation, 1);
  assert.equal(r.queueRevision, 1);
  const current = JSON.stringify(r.current);
  apply(
    r,
    "h",
    {
      type: "import",
      urls: [a],
      mode: "queue",
      generation: 1,
      expectedQueueRevision: 1,
    },
    9000,
  );
  assert.equal(JSON.stringify(r.current), current);
  assert.equal(r.anchor, 2000);
  assert.equal(r.position, 0);
  assert.equal(r.generation, 1);
});
test("bulk import role/revision/full-queue failures retain the original queue exactly", () => {
  const r = fixture();
  apply(
    r,
    "h",
    {
      type: "import",
      urls: [a],
      mode: "start",
      generation: 0,
      expectedQueueRevision: 0,
    },
    1000,
  );
  for (const actor of ["g", "h"]) {
    const before = JSON.stringify(r);
    assert.throws(
      () =>
        apply(
          r,
          actor,
          {
            type: "import",
            urls: [b],
            mode: "queue",
            generation: 1,
            expectedQueueRevision: 0,
          },
          2000,
        ),
      actor === "g" ? /HOST_ONLY/ : /STALE_QUEUE/,
    );
    assert.equal(JSON.stringify(r), before);
  }
  r.queue = Array.from({ length: 50 }, () => ({
    id: crypto.randomUUID(),
    videoId: "jfKfPfyJRdk",
  }));
  const before = JSON.stringify(r);
  assert.throws(
    () =>
      apply(
        r,
        "h",
        {
          type: "import",
          urls: [b],
          mode: "queue",
          generation: 1,
          expectedQueueRevision: 1,
        },
        2000,
      ),
    /QUEUE_FULL/,
  );
  assert.equal(JSON.stringify(r), before);
});
test("drag moves use item identities, retain native player state and reject stale order", () => {
  const r = fixture();
  apply(
    r,
    "h",
    {
      type: "import",
      urls: [a, b, c, a],
      mode: "start",
      generation: 0,
      expectedQueueRevision: 0,
    },
    1000,
  );
  const [first, last] = r.queue;
  const current = JSON.stringify(r.current);
  apply(
    r,
    "h",
    { type: "move", id: last.id, beforeId: first.id, expectedQueueRevision: 1 },
    2000,
  );
  assert.equal(r.queue[0].id, last.id);
  assert.equal(JSON.stringify(r.current), current);
  assert.equal(r.anchor, 1000);
  assert.equal(r.generation, 1);
  const before = JSON.stringify(r);
  assert.throws(
    () =>
      apply(
        r,
        "h",
        {
          type: "move",
          id: first.id,
          beforeId: null,
          expectedQueueRevision: 1,
        },
        3000,
      ),
    /STALE_QUEUE/,
  );
  assert.equal(JSON.stringify(r), before);
  apply(
    r,
    "h",
    { type: "move", id: last.id, beforeId: null, expectedQueueRevision: 2 },
    3000,
  );
  assert.equal(r.queue.at(-1)?.id, last.id);
});
test("clock midpoint samples track server time using the fastest recent path", () => {
  const clock = new RoomClock();
  clock.record(100, 120, 10110);
  assert.equal(clock.now(130, 0), 10130);
  clock.record(200, 400, 10300);
  assert.equal(clock.best(400)?.rtt, 20);
  assert.equal(clock.now(500, 0), 10500);
  clock.record(600, 610, 10605);
  assert.equal(clock.best(610)?.rtt, 10);
  assert.equal(clock.now(700, 0), 10700);
});
test("clock ignores bad samples and remains monotonic across client wall-clock steps", () => {
  const clock = new RoomClock();
  clock.seed(10000, 100);
  assert.equal(clock.now(150, 1e9), 10050);
  clock.record(200, 220, 10110);
  assert.equal(clock.now(300, 1e12), 10200);
  assert.equal(clock.now(301, -1e12), 10201);
  assert(!clock.record(400, 399, 100));
  assert(!clock.record(0, 10001, 100));
  assert(!clock.record(NaN, 1, 1));
  assert.equal(clock.now(302, 0), 10202);
});
test("clock samples expire, storage is bounded, and a new room resets all timing", () => {
  const clock = new RoomClock();
  for (let i = 0; i < 100; i++)
    clock.record(i * 100, i * 100 + 10, 10000 + i * 100 + 5);
  assert.equal(clock.best(10000)?.rtt, 10);
  assert.equal(clock.best(70000), undefined);
  assert.equal(clock.now(70000, 0), 80000);
  clock.reset();
  assert.equal(clock.now(80000, 1234), 1234);
});

test("seating layouts preserve capacity/anchors with safe legacy defaults", () => {
  const cinema = createRoom("h", "H", "Cinema", 6, 0);
  const sofa = createRoom("h", "H", "Sofa", 6, 0, "male", "public", "sofa");
  assert.equal(cinema.seating, "cinema");
  assert.equal(sofa.seating, "sofa");
  requestJoin(sofa, "g", "G", 1);
  apply(sofa, "h", { type: "accept", id: "g" }, 2);
  assert.equal(view(sofa, "g").room?.seating, "sofa");
  assert.equal(sofa.members[1].seat, 1);
});
