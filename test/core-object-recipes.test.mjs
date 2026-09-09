import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { CORE_OBJECT_RECIPES } from "../scripts/data/core-object-recipes.mjs";

async function load(language) {
  const output = [];
  for (const pack of ["consumables", "weapons", "ammunition"]) {
    const directory = path.join("generated", "source-packs", language, `${pack}.db`);
    for (const file of await readdir(directory)) {
      if (file.endsWith(".json")) output.push(JSON.parse(await readFile(path.join(directory, file), "utf8")));
    }
  }
  return output;
}

test("Core object recipe catalog contains all chemistry and cooking rows", () => {
  assert.equal(CORE_OBJECT_RECIPES.length, 76);
  assert.equal(CORE_OBJECT_RECIPES.filter((recipe) => recipe.station === "chemistry").length, 42);
  assert.equal(CORE_OBJECT_RECIPES.filter((recipe) => recipe.station === "cooking").length, 34);
  assert.equal(new Set(CORE_OBJECT_RECIPES.map((recipe) => `${recipe.pack}/${recipe.name}`)).size, CORE_OBJECT_RECIPES.length);
});

test("all object recipes are embedded in paired bilingual products", async () => {
  const en = await load("en");
  const fr = await load("fr");
  const enRecipes = en.filter((item) => item.flags?.["fallout2d20-compendium"]?.recipe);
  const frById = new Map(fr.map((item) => [item._id, item]));
  assert.equal(enRecipes.length, CORE_OBJECT_RECIPES.length);
  for (const item of enRecipes) {
    const translated = frById.get(item._id);
    assert.ok(translated, `missing French product for ${item.name}`);
    assert.ok(translated.flags?.["fallout2d20-compendium"]?.recipe, `missing French recipe for ${translated.name}`);
    assert.match(item.system.description, /data-f2d20-recipe="core"/);
    assert.match(translated.system.description, /data-f2d20-recipe="core"/);
  }
});

test("Squirrel Stew implements the cumulative V6 erratum", async () => {
  const stew = (await load("en")).find((item) => item.name === "Squirrel Stew");
  const recipe = stew.flags["fallout2d20-compendium"].recipe;
  assert.equal(recipe.complexity, 5);
  assert.equal(recipe.rarity, "rare");
  assert.equal(recipe.errata, "V6-2026");
  assert.deepEqual(recipe.materials.map(({ canonicalName, quantity }) => [canonicalName, quantity]), [
    ["Bloodleaf", 1], ["Carrot", 1], ["Dirty Water", 2], ["Squirrel Bits", 1], ["Tato", 1]
  ]);
});
