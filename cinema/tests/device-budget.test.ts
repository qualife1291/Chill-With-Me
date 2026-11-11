import { test } from "node:test";
import assert from "node:assert/strict";
import { deviceBudget } from "../shared/deviceBudget";
const base = { touch: false, saveData: false, pixelRatio: 3 };
test("desktop defaults to capped detail when no scarce-resource hints exist", () => {
  assert.deepEqual(deviceBudget(base), { economy: false, ratio: 1.3 });
});
test("tablet touch uses economy regardless of viewport dimensions", () => {
  assert.equal(deviceBudget({ ...base, touch: true }).economy, true);
});
test("low memory and low CPU desktops independently use economy", () => {
  assert(deviceBudget({ ...base, memoryGB: 2 }).economy);
  assert(deviceBudget({ ...base, cores: 2 }).economy);
  assert.equal(deviceBudget({ ...base, memoryGB: 8, cores: 8 }).economy, false);
});
test("Save-Data selects economy without requiring touch", () => {
  assert(deviceBudget({ ...base, saveData: true }).economy);
});
test("missing invalid or privacy-reduced hints never invent hardware scarcity", () => {
  for (const value of [undefined, 0, -1, NaN, Infinity])
    assert.equal(
      deviceBudget({ ...base, memoryGB: value, cores: value }).economy,
      false,
    );
});
test("pixel ratios have finite bounds and safe defaults", () => {
  for (const pixelRatio of [undefined, NaN, Infinity, 0, -1])
    assert.equal(deviceBudget({ ...base, pixelRatio }).ratio, 1);
  assert.equal(deviceBudget({ ...base, pixelRatio: 0.25 }).ratio, 0.5);
  assert.equal(deviceBudget({ ...base, pixelRatio: 2 }).ratio, 1.3);
});
