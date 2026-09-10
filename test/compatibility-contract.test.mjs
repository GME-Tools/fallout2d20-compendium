import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { COMPATIBILITY } from "../runtime/compatibility.mjs";

test("manifest and qualification share the fenced Foundry/Fallout contract", async () => {
  const base = JSON.parse(await readFile("module.base.json", "utf8"));
  const manifest = JSON.parse(await readFile("module.json", "utf8"));
  const expectedFoundry = {
    minimum: String(COMPATIBILITY.foundry.major),
    verified: String(COMPATIBILITY.foundry.major)
  };
  const expectedFallout = {
    minimum: COMPATIBILITY.fallout.minimum,
    maximum: COMPATIBILITY.fallout.maximum
  };
  assert.deepEqual(base.compatibility, expectedFoundry);
  assert.deepEqual(manifest.compatibility, expectedFoundry);
  assert.deepEqual(base.relationships.systems[0].compatibility, expectedFallout);
  assert.deepEqual(manifest.relationships.systems[0].compatibility, expectedFallout);
  assert.equal(COMPATIBILITY.fallout.major, 11);
});
