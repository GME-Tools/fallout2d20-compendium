import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { auditFrenchOverlay } from "../scripts/lib/overlay-policy.mjs";

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
  const overlay = { values: { "/system/damage/rating": 99 } };
  assert.deepEqual(auditFrenchOverlay(overlay, "test"), ["test: unauthorized French overlay pointer /system/damage/rating"]);
});
