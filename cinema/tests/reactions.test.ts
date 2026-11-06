import { test } from "node:test";
import assert from "node:assert/strict";
import {
  apply,
  commandSchema,
  connectMember,
  createRoom,
  nextDeadline,
  requestJoin,
  sweep,
  view,
} from "../shared/model";
function setup() {
  const r = createRoom("h", "Host", "Room", 4, 0);
  connectMember(r, "h", "hc", 1);
  requestJoin(r, "g", "Guest", 2);
  apply(r, "h", { type: "accept", id: "g" }, 3);
  connectMember(r, "g", "gc", 4);
  requestJoin(r, "p", "Pending", 5);
  return r;
}
test("only approved members can broadcast a validated room reaction", () => {
  const r = setup();
  assert.throws(
    () => apply(r, "p", { type: "reaction", kind: "flowers" }, 100),
    /FORBIDDEN/,
  );
  assert.throws(() =>
    commandSchema.parse({ type: "reaction", kind: "script" }),
  );
  apply(r, "g", { type: "reaction", kind: "flowers" }, 100);
  assert.equal(r.reaction?.name, "Guest");
  assert.equal(r.reaction?.memberId, "g");
  assert.equal(
    view(r, "h").room?.reaction?.id,
    view(r, "g").room?.reaction?.id,
  );
  assert(!JSON.stringify(view(r, "p")).includes('"reaction"'));
});
test("room-wide three second exclusion and per-sender cooldown bound reaction spam", () => {
  const r = setup();
  apply(r, "h", { type: "reaction", kind: "applause" }, 100);
  const event = r.reaction;
  assert.throws(
    () => apply(r, "g", { type: "reaction", kind: "sad" }, 3099),
    /REACTION_BUSY/,
  );
  assert.equal(r.reaction, event);
  assert.throws(
    () => apply(r, "h", { type: "reaction", kind: "troll" }, 3100),
    /REACTION_COOLDOWN/,
  );
  apply(r, "g", { type: "reaction", kind: "sad" }, 3100);
  assert.notEqual(r.reaction?.id, event?.id);
  apply(r, "h", { type: "reaction", kind: "troll" }, 6100);
  assert.equal(r.reaction?.kind, "troll");
});
test("reaction expiry is an alarm deadline and deletes the transient event without a history", () => {
  const r = setup();
  apply(r, "h", { type: "reaction", kind: "flowers" }, 100);
  assert.equal(nextDeadline(r), 3100);
  sweep(r, 3099);
  assert(r.reaction);
  assert(sweep(r, 3100).changed);
  assert.equal(r.reaction, undefined);
  assert(!("reaction" in JSON.parse(JSON.stringify(r))));
  assert.equal(r.messages.length, 0);
});
test("new chat carries authenticated sender identity and server time, even for equal names", () => {
  const r = setup();
  r.members[1].name = "Host";
  apply(r, "g", { type: "chat", text: "Hello" }, 100);
  assert.equal(r.messages[0].senderId, "g");
  assert.equal(r.messages[0].at, 100);
  assert.equal(r.messages[0].name, "Host");
  assert.throws(
    () => apply(r, "p", { type: "chat", text: "No" }, 101),
    /FORBIDDEN/,
  );
});
