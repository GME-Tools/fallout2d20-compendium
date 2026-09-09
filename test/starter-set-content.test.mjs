import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const readPack = (language, pack) => fs.readdirSync(path.join(root, "generated/source-packs", language, `${pack}.db`))
  .filter(file => file.endsWith(".json")).map(file => JSON.parse(fs.readFileSync(path.join(root, "generated/source-packs", language, `${pack}.db`, file))));

test("Starter Set actors preserve approved identities and mechanical rulings", () => {
  const actors = readPack("en", "denizens");
  const byName = name => actors.find(actor => actor.name === name);
  assert.ok(byName("Doctor Rast"));
  assert.ok(byName("Doctor Rast (Revealed)"));
  assert.ok(byName("Super Mutant (Starter Set)"));
  const queen = byName("Mirelurk Queen, Wounded");
  assert.deepEqual([queen.system.level.value, queen.system.level.currentXP, queen.system.health.value, queen.system.health.max], [9, 134, 28, 60]);
  const merchant = byName("Commonwealth Merchant");
  assert.equal(merchant.system.carryWeight.base, 210);
  assert.equal(merchant.system.luckPoints, 0);
  assert.equal(byName("Rad Rocky").items.filter(item => item.type === "weapon").at(-1).system.damage.rating, 4);
  const expectedWeapons = {
    "Doctor Rast": [["Unarmed Strike", 2], ["Boosted Focused Institute Laser Rifle", 4]],
    "Doctor Rast (Revealed)": [["Unarmed Strike", 2], ["Boosted Focused Institute Laser Rifle", 4]],
    "Diamond City Security": [["Unarmed Strike", 2], ["Baseball Bat", 4], ["Auto Pipe Rifle", 2]],
    "Commonwealth Merchant": [["Unarmed Strike", 2], ["10mm Auto Pistol", 3]],
    "Mirelurk Queen, Wounded": [["Pincers", 7], ["Acid Spray", 5]],
    "Synth Replica (Starter Set)": [["Auto Pipe Gun", 2], ["Shock Baton", 5]]
  };
  for (const [name, expected] of Object.entries(expectedWeapons)) {
    assert.deepEqual(byName(name).items.filter(item => item.type === "weapon").map(item => [item.name, item.system.damage.rating]), expected, name);
  }
  assert.deepEqual(byName("Commonwealth Merchant").items.filter(item => item.type === "special_ability").map(item => item.name), ["Let Rip", "Master Trader", "Shopkeep"]);
  assert.deepEqual(byName("Doctor Rast").items.filter(item => item.type === "special_ability").map(item => item.name), ["Robot", "Advanced Synth", "Let Rip", "Stimpak Supply", "Hidden Armament"]);
});

test("Starter Set tables have exact 1d20 coverage and corrected armor ranges", () => {
  const docs = readPack("en", "roll-tables");
  for (const name of ["Random Weapons (Starter Set)", "Random Chems (Starter Set)", "Random Armor (Starter Set)"]) {
    const table = docs.find(doc => doc.name === name);
    assert.equal(table.formula, "1d20");
    const results = table.results.map(id => docs.find(doc => doc._id === id));
    assert.ok(results.every(result => result._key.startsWith(`!tables.results!${table._id}.`)));
    assert.deepEqual(results.flatMap(result => Array.from({length: result.range[1] - result.range[0] + 1}, (_, i) => result.range[0] + i)).sort((a,b)=>a-b), Array.from({length:20},(_,i)=>i+1));
  }
  const armor = docs.find(doc => doc.name === "Random Armor (Starter Set)");
  const final = docs.find(doc => doc._id === armor.results.at(-1));
  assert.deepEqual(final.range, [13, 20]);
  assert.equal(final.text, "Raider Armor");
});

test("Starter Set content has bilingual identity parity", () => {
  for (const pack of ["denizens", "roll-tables"]) {
    const en = new Set(readPack("en", pack).map(doc => doc._id));
    const fr = new Set(readPack("fr", pack).map(doc => doc._id));
    assert.deepEqual(en, fr);
  }
});

test("Starter Set actors are illustrated while RollTables keep only the neutral die icon", () => {
  const actors = readPack("en", "denizens").filter(actor => actor.flags?.["fallout2d20-compendium"]?.source?.book === "starter_set");
  assert.equal(actors.length, 11);
  for (const actor of actors) {
    const source = actor.flags["fallout2d20-compendium"].source;
    assert.ok(["dedicated", "shared"].includes(source.artworkStatus), actor.name);
    assert.equal(source.artworkReviewed, true, actor.name);
    assert.ok(source.artworkSource, actor.name);
    assert.match(actor.img, /^modules\/fallout2d20-compendium\/artwork\//, actor.name);
    assert.equal(actor.token.img, actor.img, actor.name);
  }
  assert.equal(
    actors.find(actor => actor.name === "Doctor Rast").img,
    actors.find(actor => actor.name === "Doctor Rast (Revealed)").img
  );
  const tables = readPack("en", "roll-tables").filter(table => table.flags?.["fallout2d20-compendium"]?.source?.book === "starter_set");
  assert.equal(tables.length, 3);
  for (const table of tables) assert.equal(table.img, "icons/svg/d20-grey.svg", table.name);
});
