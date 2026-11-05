import { test } from "node:test";
import assert from "node:assert/strict";
import {
  apply,
  createRoom,
  requestJoin,
  connectMember,
  sweep,
  view,
  type Command,
} from "../shared/model";
const A = "https://youtu.be/jfKfPfyJRdk",
  B = "https://youtu.be/5qap5aO4i9A",
  C = "https://youtu.be/dQw4w9WgXcQ";
function setup() {
  const r = createRoom("h", "Host", "Queue", 3, 0);
  connectMember(r, "h", "hc", 0);
  requestJoin(r, "g", "Guest", 0);
  apply(r, "h", { type: "accept", id: "g" }, 1);
  return r;
}
test("reordering changes only queued order and rejects stale or unauthorized edits", () => {
  const r = setup();
  apply(r, "h", { type: "start", url: C, generation: 0 }, 2);
  apply(r, "h", { type: "add", url: A }, 3);
  apply(r, "h", { type: "add", url: B }, 4);
  const before = {
    current: r.current,
    generation: r.generation,
    anchor: r.anchor,
    playing: r.playing,
    position: r.position,
  };
  const revision = r.queueRevision!,
    id = r.queue[1].id;
  apply(
    r,
    "h",
    { type: "reorder", id, direction: "up", expectedQueueRevision: revision },
    5,
  );
  assert.equal(r.queue[0].id, id);
  assert.equal(r.queueRevision, revision + 1);
  assert.deepEqual(
    {
      current: r.current,
      generation: r.generation,
      anchor: r.anchor,
      playing: r.playing,
      position: r.position,
    },
    before,
  );
  assert.throws(
    () =>
      apply(r, "h", { type: "remove", id, expectedQueueRevision: revision }, 6),
    /STALE_QUEUE/,
  );
  assert.throws(
    () =>
      apply(
        r,
        "g",
        {
          type: "reorder",
          id,
          direction: "down",
          expectedQueueRevision: revision + 1,
        },
        6,
      ),
    /HOST_ONLY/,
  );
  assert.equal(r.queue.length, 2);
});
test("suggestion is not queued until host accepts, and cannot be accepted twice", () => {
  const r = setup();
  apply(r, "g", { type: "suggest", url: A }, 2);
  const suggestion = r.suggestions![0];
  assert.equal(r.queue.length, 0);
  assert.equal(r.suggestions!.length, 1);
  assert.throws(
    () =>
      apply(
        r,
        "g",
        {
          type: "review-suggestion",
          id: suggestion.id,
          accept: true,
          expectedQueueRevision: 0,
        },
        3,
      ),
    /HOST_ONLY/,
  );
  apply(
    r,
    "h",
    {
      type: "review-suggestion",
      id: suggestion.id,
      accept: true,
      expectedQueueRevision: 0,
    },
    4,
  );
  assert.equal(r.queue[0].videoId, "jfKfPfyJRdk");
  assert.equal(r.suggestions!.length, 0);
  assert.throws(
    () =>
      apply(
        r,
        "h",
        {
          type: "review-suggestion",
          id: suggestion.id,
          accept: true,
          expectedQueueRevision: 1,
        },
        5,
      ),
    /INVALID_SUGGESTION/,
  );
  assert.equal(r.queue.length, 1);
  assert(
    !(
      "lastSuggestedAt" in view(r, "g").room!.members.find((m) => m.id === "g")!
    ),
  );
});
test("suggestions enforce cooldown, duplicates and three-pending limit", () => {
  const r = setup();
  apply(r, "g", { type: "suggest", url: A }, 10);
  assert.throws(
    () => apply(r, "g", { type: "suggest", url: B }, 11),
    /SUGGESTION_COOLDOWN/,
  );
  assert.throws(
    () => apply(r, "g", { type: "suggest", url: A }, 10010),
    /DUPLICATE_SUGGESTION/,
  );
  apply(r, "g", { type: "suggest", url: B }, 10010);
  apply(r, "g", { type: "suggest", url: C }, 20010);
  assert.throws(
    () =>
      apply(
        r,
        "g",
        { type: "suggest", url: "https://youtu.be/abcdefghijk" },
        30010,
      ),
    /SUGGESTION_LIMIT/,
  );
  assert.equal(r.suggestions!.length, 3);
  assert.equal(r.members[1].lastSuggestedAt, 20010);
});
test("stale or full acceptance preserves proposal, rejection does not mutate playlist", () => {
  const r = setup();
  apply(r, "g", { type: "suggest", url: B }, 10);
  const id = r.suggestions![0].id;
  apply(r, "h", { type: "add", url: A }, 11);
  assert.throws(
    () =>
      apply(
        r,
        "h",
        {
          type: "review-suggestion",
          id,
          accept: true,
          expectedQueueRevision: 0,
        },
        12,
      ),
    /STALE_QUEUE/,
  );
  assert.equal(r.suggestions!.length, 1);
  while (r.queue.length < 50) apply(r, "h", { type: "add", url: A }, 13);
  assert.throws(
    () =>
      apply(
        r,
        "h",
        {
          type: "review-suggestion",
          id,
          accept: true,
          expectedQueueRevision: r.queueRevision!,
        },
        14,
      ),
    /QUEUE_FULL/,
  );
  assert.equal(r.suggestions!.length, 1);
  const rev = r.queueRevision;
  apply(
    r,
    "h",
    {
      type: "review-suggestion",
      id,
      accept: false,
      expectedQueueRevision: rev!,
    },
    15,
  );
  assert.equal(r.queueRevision, rev);
  assert.equal(r.queue.length, 50);
  assert.equal(r.suggestions!.length, 0);
});
test("leave, kick and expiration remove proposals; pending applicants cannot suggest", () => {
  for (const type of ["leave", "kick", "expire"]) {
    const r = setup();
    requestJoin(r, "p", "Pending", 1);
    assert.throws(
      () => apply(r, "p", { type: "suggest", url: A }, 2),
      /FORBIDDEN/,
    );
    apply(r, "g", { type: "suggest", url: A }, 2);
    if (type === "expire") sweep(r, 20002);
    else
      apply(
        r,
        type === "kick" ? "h" : "g",
        type === "kick" ? { type: "kick", id: "g" } : { type: "leave" },
        3,
      );
    assert.equal(r.suggestions!.length, 0);
  }
});
test("legacy room metadata defaults and invalid/boundary reorder do not mutate queue", () => {
  const r = setup();
  delete r.queueRevision;
  delete r.suggestions;
  apply(r, "h", { type: "add", url: A }, 2);
  const revision = r.queueRevision;
  apply(
    r,
    "h",
    {
      type: "reorder",
      id: r.queue[0].id,
      direction: "up",
      expectedQueueRevision: revision!,
    },
    3,
  );
  assert.equal(r.queueRevision, revision);
  assert.throws(
    () =>
      apply(
        r,
        "h",
        {
          type: "reorder",
          id: "missing",
          direction: "up",
          expectedQueueRevision: revision!,
        },
        4,
      ),
    /INVALID_QUEUE_ITEM/,
  );
  assert.throws(
    () => apply(r, "g", { type: "suggest", url: "https://evil.test/test" }, 4),
    /INVALID_MEDIA_URL/,
  );
  assert.equal(r.suggestions, undefined);
});
