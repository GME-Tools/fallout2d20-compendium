import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { CORE_EQUIPMENT_RECIPES } from "../scripts/data/core-equipment-recipes.mjs";
import { CORE_OBJECT_RECIPES } from "../scripts/data/core-object-recipes.mjs";
import { CORE_WEAPON_MOD_RECIPES } from "../scripts/data/core-weapon-mod-recipes.mjs";

const equipment = JSON.parse(await readFile("catalog/v1-core-equipment.json", "utf8"));
const survival = JSON.parse(await readFile("catalog/v1-core-survival-and-crafting.json", "utf8"));
const denizens = JSON.parse(await readFile("catalog/v1-core-denizens.json", "utf8"));
const moduleId = "fallout2d20-compendium";

async function documents(language, pack) {
  const directory = path.join("src", "packs", language, `${pack}.db`);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
  return Promise.all(files.map(async (file) => JSON.parse(await readFile(path.join(directory, file), "utf8"))));
}

const entry = (document) => ({ id: document._id, name: document.name, type: document.type ?? "RollTable" });
const sorted = (entries) => [...entries].sort((a, b) => a.id.localeCompare(b.id));

test("the static equipment inventory exactly matches every English equipment pack", async () => {
  assert.equal(Object.keys(equipment.packs).length, 10);
  let count = 0;
  for (const [pack, expected] of Object.entries(equipment.packs)) {
    const actual = sorted((await documents("en", pack)).map(entry));
    assert.deepEqual(actual, expected, `${pack} differs from the reviewed Core inventory`);
    assert.equal(new Set(expected.map(({ id }) => id)).size, expected.length, `${pack} repeats a document id`);
    count += expected.length;
  }
  assert.equal(count, 943);
});

test("all inventoried equipment has a structurally paired French document", async () => {
  for (const [pack, expected] of Object.entries(equipment.packs)) {
    const french = new Map((await documents("fr", pack)).map((document) => [document._id, document]));
    assert.equal(french.size, expected.length, `${pack} has a language count mismatch`);
    for (const item of expected) {
      const translated = french.get(item.id);
      assert.ok(translated, `${pack}/${item.name} is missing in French`);
      assert.equal(translated.type ?? "RollTable", item.type);
      assert.equal(translated.flags?.[moduleId]?.source?.language, "fr");
    }
  }
});

test("the static survival inventory freezes all 339 Core recipe table rows", () => {
  assert.deepEqual(survival.recipes.objects, CORE_OBJECT_RECIPES);
  assert.deepEqual(survival.recipes.equipment, CORE_EQUIPMENT_RECIPES);
  assert.deepEqual(survival.recipes.weaponMods, CORE_WEAPON_MOD_RECIPES);
  assert.equal(survival.recipes.objects.length, 76);
  assert.equal(survival.recipes.equipment.length, 117);
  assert.equal(survival.recipes.weaponMods.length, 146);
});

test("survival hazards, stations, and all Core random tables exactly match their inventories", async () => {
  for (const [field, pack] of [["addictions", "addictions"], ["diseases", "diseases"], ["craftingStations", "crafting-stations"]]) {
    assert.deepEqual(sorted((await documents("en", pack)).map(entry)), survival[field], `${field} inventory drifted`);
    const frenchIds = sorted((await documents("fr", pack)).map(entry)).map(({ id, type }) => ({ id, type }));
    assert.deepEqual(frenchIds, survival[field].map(({ id, type }) => ({ id, type })), `${field} is not paired in French`);
  }
  const tables = (await documents("en", "roll-tables")).filter((document) => document._key === `!tables!${document._id}`);
  assert.deepEqual(sorted(tables.map(entry)), survival.rollTables);
  assert.equal(survival.rollTables.length, 30);
});

test("the denizen inventory exactly covers abilities, creatures, NPCs, and adventure profiles", async () => {
  assert.deepEqual(sorted((await documents("en", "creature-abilities")).map(entry)), denizens.creatureAbilities);
  for (const pack of ["creatures", "npcs"]) {
    const actual = sorted((await documents("en", pack)).map((document) => ({
      ...entry(document),
      adventure: document.flags?.[moduleId]?.source?.adventure === true,
      ...(document.flags?.[moduleId]?.source?.page ? { page: document.flags[moduleId].source.page } : {})
    })));
    assert.deepEqual(actual, denizens[pack]);
  }
  assert.equal(denizens.creatureAbilities.length, 80);
  assert.equal(denizens.creatures.length, 40);
  assert.equal(denizens.npcs.length, 35);
  assert.equal([...denizens.creatures, ...denizens.npcs].filter(({ adventure }) => adventure).length, 9);
});

test("every inventoried denizen document has a French counterpart with the same stable id and type", async () => {
  for (const [field, pack] of [["creatureAbilities", "creature-abilities"], ["creatures", "creatures"], ["npcs", "npcs"]]) {
    const french = new Map((await documents("fr", pack)).map((document) => [document._id, document]));
    assert.equal(french.size, denizens[field].length, `${pack} has a language count mismatch`);
    for (const expected of denizens[field]) {
      const translated = french.get(expected.id);
      assert.ok(translated, `${pack}/${expected.name} is missing in French`);
      assert.equal(translated.type, expected.type);
    }
  }
});
