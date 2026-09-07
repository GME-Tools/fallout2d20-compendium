import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

function load(language) {
  const directory = path.join(root, "src", "packs", language, "crafting-stations.db");
  return fs.readdirSync(directory).filter((name) => name.endsWith(".json")).map((name) => JSON.parse(fs.readFileSync(path.join(directory, name), "utf8")));
}

test("Core crafting stations are exhaustive and bilingual", () => {
  const en = load("en");
  const fr = load("fr");
  assert.equal(en.length, 6);
  assert.equal(fr.length, 6);
  assert.deepEqual(en.map((item) => item._id).sort(), fr.map((item) => item._id).sort());
  for (const item of [...en, ...fr]) {
    assert.equal(item.type, "object_or_structure");
    assert.equal(item.system.itemType, "crafting_table");
    assert.ok(item.system.description.length > 80);
    assert.ok(item.system.skills);
  }
});

test("Cooking Station carries the cumulative V6 erratum", () => {
  for (const language of ["en", "fr"]) {
    const cooking = load(language).find((item) => item._id === "CrftCookStation1");
    assert.deepEqual(cooking.flags["fallout2d20-compendium"].recipe.materials, []);
    assert.equal(cooking.flags["fallout2d20-compendium"].recipe.complexity, 2);
    assert.equal(cooking.flags["fallout2d20-compendium"].recipe.perks.length, 0);
  }
});
