import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { auditFrenchOverlay, isDeterministicMetricPointer } from "../scripts/lib/overlay-policy.mjs";

test("French overlays contain only localization, provenance, and deterministic metric changes", async () => {
  const root = path.resolve("src/packs/locales/fr");
  const issues = [];
  for (const pack of await readdir(root, { withFileTypes: true })) {
    if (!pack.isDirectory()) continue;
    for (const file of await readdir(path.join(root, pack.name))) {
      if (!file.endsWith(".json")) continue;
      const overlay = JSON.parse(await readFile(path.join(root, pack.name, file), "utf8"));
      issues.push(...auditFrenchOverlay(overlay, `${pack.name}/${file}`));
    }
  }
  assert.deepEqual(issues, []);
});

test("unapproved French mechanical overrides fail explicitly", () => {
  const pointers = [
    "/system/defense/base",
    "/system/initiative/base",
    "/system/meleeDamage/base",
    "/system/damage/rating",
    "/items/@EmbeddedItem001/system/damage/base"
  ];
  const overlay = { values: Object.fromEntries(pointers.map(pointer => [pointer, 99])) };
  assert.deepEqual(auditFrenchOverlay(overlay, "test"), pointers.map(pointer => `test: unauthorized French overlay pointer ${pointer}`));
});

test("only reviewed metric path shapes are deterministic conversions", () => {
  for (const pointer of [
    "/system/weight",
    "/system/carry",
    "/system/carryWeight/base",
    "/system/mods/Mod001/system/weight",
    "/system/mods/Mod001/$overrides/~1system~1weight",
    "/items/@EmbeddedItem001/system/weight",
    "/items/@EmbeddedItem001/system/mods/Mod001/system/weight",
    "/items/@EmbeddedItem001/$overrides/~1system~1weight"
  ]) assert.equal(isDeterministicMetricPointer(pointer), true, pointer);
  for (const pointer of ["/system/base", "/system/defense/base", "/items/@EmbeddedItem001/system/damage/base"]) {
    assert.equal(isDeterministicMetricPointer(pointer), false, pointer);
  }
});
