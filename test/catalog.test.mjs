import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const catalog = JSON.parse(await readFile("catalog/v1-core-character-creation.json", "utf8"));
const startingEquipment = JSON.parse(await readFile("catalog/v1-core-starting-equipment.json", "utf8"));
const frenchPerkNames = JSON.parse(await readFile("catalog/v1-core-perk-fr-names.json", "utf8"));
const frenchAmmunitionNames = JSON.parse(await readFile("catalog/v1-core-ammunition-fr-names.json", "utf8"));
const frenchWeaponNames = JSON.parse(await readFile("catalog/v1-core-weapon-fr-names.json", "utf8"));

async function packNames(pack) {
  const root = path.join("src/packs/en", `${pack}.db`);
  const files = await readdir(root).catch(error => error.code === "ENOENT" ? [] : Promise.reject(error));
  return new Set(await Promise.all(files.filter(file => file.endsWith(".json")).map(async file => {
    const document = JSON.parse(await readFile(path.join(root, file), "utf8"));
    return document._key?.split("!")[1]?.includes(".") ? null : document.name;
  })).then(names => names.filter(Boolean)));
}

async function packDocuments(language, pack) {
  const root = path.join("src/packs", language, `${pack}.db`);
  const files = await readdir(root).catch(error => error.code === "ENOENT" ? [] : Promise.reject(error));
  return (await Promise.all(files.filter(file => file.endsWith(".json")).map(async file =>
    JSON.parse(await readFile(path.join(root, file), "utf8"))
  ))).filter(document => !document._key?.split("!")[1]?.includes("."));
}

test("character creation inventory has no duplicate entries", () => {
  for (const [category, definition] of Object.entries(catalog.categories)) {
    assert.equal(new Set(definition.entries).size, definition.entries.length, `${category} contains duplicate inventory rows`);
  }
});

test("all starting equipment components resolve to an English compendium document", async () => {
  for (const requirement of startingEquipment.requiredDocuments) {
    const names = await packNames(requirement.pack);
    const missing = requirement.names.filter(name => !names.has(name));
    assert.deepEqual(missing, [], `${requirement.pack} is missing starting equipment components`);
  }
});

test("starting equipment inventory contains all sixteen packages", () => {
  const packages = Object.values(startingEquipment.packages).flat();
  assert.equal(packages.length, 16);
  assert.equal(new Set(packages).size, 16);
});

test("every character perk has one unique official French name", () => {
  const perks = catalog.categories.perks.entries;
  assert.deepEqual(Object.keys(frenchPerkNames).sort(), [...perks].sort());
  assert.equal(new Set(Object.values(frenchPerkNames)).size, perks.length);
});

test("implemented English character content covers the inventory", async () => {
  for (const [category, definition] of Object.entries(catalog.categories)) {
    const names = await packNames(definition.pack);
    const missing = definition.entries.filter(name => !names.has(name));
    assert.deepEqual(missing, [], `${category} is missing catalog entries`);
  }
});

test("every English ammunition document has one unique French name", async () => {
  const englishNames = [...await packNames("ammunition")].sort();
  assert.deepEqual(Object.keys(frenchAmmunitionNames).sort(), englishNames);
  assert.equal(new Set(Object.values(frenchAmmunitionNames)).size, englishNames.length);
});

test("French ammunition is complete, described, and structurally paired with English", async () => {
  const english = new Map((await packDocuments("en", "ammunition")).map(document => [document._id, document]));
  const french = await packDocuments("fr", "ammunition");
  assert.equal(french.length, english.size);
  for (const document of french) {
    const source = english.get(document._id);
    assert.ok(source, `French ammunition ${document.name} has no English counterpart`);
    assert.ok(document.system.description.replace(/<[^>]+>/g, "").trim().length >= 20, `${document.name} has no full description`);
    assert.equal(document.system.cost, source.system.cost);
    assert.equal(document.system.rarity, source.system.rarity);
    assert.equal(document.system.quantityRoll, source.system.quantityRoll);
    assert.equal(document.system.weight, source.system.weight / 2);
    assert.equal(document.flags["fallout2d20-compendium"].source.language, "fr");
  }
});

test("the French weapon name catalog exhaustively covers English weapon names", async () => {
  const englishNames = [...new Set((await packDocuments("en", "weapons")).map(document => document.name))].sort();
  assert.deepEqual(Object.keys(frenchWeaponNames).sort(), englishNames);
});

test("French weapons are complete, described, and retain English mechanical data", async () => {
  const english = new Map((await packDocuments("en", "weapons")).map(document => [document._id, document]));
  const french = await packDocuments("fr", "weapons");
  assert.equal(french.length, english.size);
  for (const document of french) {
    const source = english.get(document._id);
    assert.ok(source, `French weapon ${document.name} has no English counterpart`);
    assert.ok(document.system.description.replace(/<[^>]+>/g, "").trim().length >= 20, `${document.name} has no description`);
    for (const property of ["cost", "rarity", "fireRate", "damageRating"]) {
      assert.deepEqual(document.system[property], source.system[property], `${document.name} changed ${property}`);
    }
    assert.equal(document.system.weight, source.system.weight / 2, `${document.name} has an unconverted weight`);
    const expectedAmmo = source.system.ammo === "Syringer Ammo" ? "Seringue" : frenchAmmunitionNames[source.system.ammo] ?? source.system.ammo;
    assert.equal(document.system.ammo, expectedAmmo, `${document.name} has an untranslated ammunition reference`);
    assert.deepEqual(document.system.damage, source.system.damage, `${document.name} changed its damage automation`);
  }
});

test("French weapon modifications exhaustively preserve English mechanics", async () => {
  const english = new Map((await packDocuments("en", "weapon-mods")).map(document => [document._id, document]));
  const french = await packDocuments("fr", "weapon-mods");
  assert.equal(french.length, english.size);
  for (const document of french) {
    const source = english.get(document._id);
    assert.ok(source, `French weapon mod ${document.name} has no English counterpart`);
    for (const property of ["cost", "rarity", "modType", "weaponType"]) {
      assert.deepEqual(document.system[property], source.system[property], `${document.name} changed ${property}`);
    }
    assert.equal(document.system.weight, source.system.weight / 2, `${document.name} has an unconverted weight`);
    const expectedEffects = structuredClone(source.system.modEffects);
    if (expectedEffects.ammo) expectedEffects.ammo = frenchAmmunitionNames[expectedEffects.ammo] ?? expectedEffects.ammo;
    assert.deepEqual(document.system.modEffects, expectedEffects, `${document.name} changed its automation beyond its localized ammunition reference`);
    assert.equal(document.flags["fallout2d20-compendium"].source.language, "fr");
  }
});

test("French perks form an independent exhaustive pack", async () => {
  const english = new Map((await packDocuments("en", "perks")).map(document => [document._id, document]));
  const french = await packDocuments("fr", "perks");
  assert.equal(french.length, english.size);
  for (const document of french) {
    assert.ok(english.has(document._id), `${document.name} has no English counterpart`);
    assert.equal(document.flags["fallout2d20-compendium"].source.language, "fr");
  }
});
