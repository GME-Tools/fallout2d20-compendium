import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { EXPECTED_COUNT, INVENTORY_PATH, deriveInventory, parseInventory, serializeInventory, validateInventory } from "../scripts/lib/artwork-inventory.mjs";

test("US-201 inventory contains each canonical placeholder exactly once with valid EN/FR references", async () => {
  const rows = parseInventory(await readFile(INVENTORY_PATH, "utf8"));
  const derived = await deriveInventory(new Set(rows.map(row => row.identity)));
  assert.equal(rows.length, EXPECTED_COUNT);
  assert.deepEqual(validateInventory(rows, derived), []);
  assert.equal(new Set(rows.map(row => row.identity)).size, EXPECTED_COUNT);
  assert.equal(new Set(rows.flatMap(row => [row.uuid_en, row.uuid_fr])).size, EXPECTED_COUNT * 2);
});

test("US-201 inventory serialization is deterministic", async () => {
  const text = await readFile(INVENTORY_PATH, "utf8");
  assert.equal(serializeInventory(parseInventory(text)), text);
});

test("owner checklist annotations survive in durable input after their targets are resolved", async () => {
  const checklist = await readFile("reports/us-201-images-to-find.md", "utf8");
  assert.doesNotMatch(checklist, /apparel-mods|robot-modules|weapon-mods/);
  const durable = await readFile("scripts/data/us-201-owner-annotations.mjs", "utf8");
  assert.match(durable, /All apparel-mods can have this : https:\/\/images\.fallout\.wiki\/e\/e0\/FO76_Item_mod\.webp/);
  assert.equal((durable.match(/All mods use this image : https:\/\/images\.fallout\.wiki\/e\/e0\/FO76_Item_mod\.webp/g) ?? []).length, 2);
  const inventory = await readFile(INVENTORY_PATH, "utf8");
  assert.match(inventory, /Owner-supplied repository asset: artwork\/Mod\.webp/);
});
