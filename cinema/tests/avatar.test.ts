import { test } from "node:test";
import assert from "node:assert/strict";
import { avatarMotion, avatarPosition } from "../shared/avatar";
import { seats, type Member } from "../shared/model";

test("avatar path is continuous at aisle/row transition for every seat", () => {
  for (let capacity = 2; capacity <= 10; capacity++) {
    for (const seat of seats(capacity)) {
      const m = { seat: seat.id, seated: true, sitAt: 1000 } as Member;
      const before = avatarPosition(m, capacity, 3199.999);
      const after = avatarPosition(m, capacity, 3200.001);
      assert(
        Math.hypot(before.x - after.x, before.y - after.y, before.z - after.z) <
          0.0001,
      );
      const end = avatarPosition(m, capacity, 6000);
      assert(Math.abs(end.x - seat.x) < 1e-9);
      assert.equal(end.y, seat.y);
      assert.equal(end.z, seat.z);
      assert.deepEqual(
        avatarPosition(m, capacity, 500),
        avatarPosition({ ...m, seated: false }, capacity, 500),
      );
    }
  }
});

test("walk finishes before sit; wave expires and idle stops requesting frames", () => {
  const m = { seat: 0, seated: true, sitAt: 1000, waveAt: 7000 } as Member;
  assert.equal(avatarMotion(m, 2500).walking, true);
  assert.equal(avatarMotion(m, 2500).sitting, 0);
  assert.equal(avatarMotion(m, 5500).walking, false);
  assert.equal(avatarMotion(m, 5500).sitting, 0.5);
  assert.equal(avatarMotion(m, 6000).sitting, 1);
  assert.equal(avatarMotion(m, 8200).waving, true);
  assert.equal(avatarMotion(m, 9400).waving, false);
  assert.equal(avatarMotion(m, 9400).moving, false);
  assert.equal(avatarMotion({ ...m, seated: false }, 2000).moving, false);
});
