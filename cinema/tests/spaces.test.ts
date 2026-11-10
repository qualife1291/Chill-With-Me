import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createRoom,
  requestJoin,
  apply,
  view,
  roomSummary,
  commandSchema,
} from "../shared/model";
import { spaces, spaceInfo, spaceSchema } from "../shared/spaces";

test("room spaces are persisted shared metadata; legacy rooms keep cinema layout", () => {
  for (const space of spaces) {
    const r = createRoom(
      "h",
      "Host",
      "Space",
      10,
      1000,
      "male",
      "public",
      "sofa",
      undefined,
      space.id,
    );
    requestJoin(r, "g", "Guest", 1100);
    apply(r, "h", { type: "accept", id: "g" }, 1200);
    const restored = JSON.parse(JSON.stringify(r));
    assert.equal(view(restored, "h").room?.space, space.id);
    assert.equal(view(restored, "g").room?.space, space.id);
    assert.equal(restored.capacity, 10);
    assert.equal(restored.seating, "sofa");
  }
  const legacy = createRoom("h", "Host", "Old", 2, 1000);
  delete legacy.space;
  assert.equal(spaceInfo(legacy.space).id, "cinema");
  assert.equal(spaceInfo("unrecognized-old-value").id, "cinema");
});
test("a private room never exposes its chosen space in lobby or pending DTO", () => {
  const r = createRoom(
    "h",
    "Host",
    "Secret rooftop",
    2,
    1000,
    "male",
    "private",
    "sofa",
    undefined,
    "rooftop",
  );
  assert.deepEqual(roomSummary(r), { open: true, private: true });
  requestJoin(r, "g", "Guest", 1100, "male", r.inviteKey);
  assert.equal(view(r, "g").room, undefined);
  assert.equal(view(r, "outsider").room, undefined);
  r.visibility = "public";
  const summary = roomSummary(r);
  assert("space" in summary);
  assert.equal(summary.space, "rooftop");
});
test("space input is allowlisted and cannot be changed with a room command", () => {
  assert.equal(
    spaceSchema.safeParse("https://example.com/model.glb").success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({ type: "space", space: "rooftop" }).success,
    false,
  );
  assert.throws(() =>
    createRoom(
      "h",
      "Host",
      "Bad",
      2,
      0,
      "male",
      "public",
      "cinema",
      undefined,
      "invalid" as never,
    ),
  );
});
