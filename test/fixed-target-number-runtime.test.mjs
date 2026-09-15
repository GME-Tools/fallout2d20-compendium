import assert from "node:assert/strict";
import test from "node:test";

globalThis.Hooks = { on() {}, once() {} };
const { applyFixedTargetNumber } = await import("../runtime/fallout-v14-compat.mjs");

test("fixed creature attack target numbers override the system-derived total", () => {
  const options = {
    attribute: 6,
    skill: 3,
    tag: true,
    item: { flags: { "fallout2d20-compendium": { fixedTargetNumber: 12 } } }
  };
  assert.deepEqual(applyFixedTargetNumber(options), { ...options, attribute: 12, skill: 0 });
});

test("ordinary attacks retain their system-derived target number", () => {
  const options = { attribute: 6, skill: 3, tag: true, item: { flags: {} } };
  assert.equal(applyFixedTargetNumber(options), options);
});
