import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const readPack = (language, pack) => fs.readdirSync(path.join(root, "generated/source-packs", language, `${pack}.db`))
  .filter(file => file.endsWith(".json")).map(file => JSON.parse(fs.readFileSync(path.join(root, "generated/source-packs", language, `${pack}.db`, file))));

const actorContracts = {
  "Commonwealth Merchant": { id: "c58b81f6fd371c57", profile: [4, 62, 15, 15, 12, 1, 0, 210], weapons: [["Unarmed Strike", 2, "close", 0], ["10mm Auto Pistol", 3, "close", 4]], abilities: ["Let Rip", "Master Trader", "Shopkeep"], inventory: ["Drifter Outfit", "10mm Auto Pistol", "Wealth 6"] },
  "Diamond City Security": { id: "f16a082bb48cfbc7", profile: [6, 45, 12, 12, 13, 1, 0, 210], weapons: [["Unarmed Strike", 2, "close", 0], ["Baseball Bat", 4, "close", 0], ["Auto Pipe Rifle", 2, "medium", 4]], abilities: ["Let Rip"], inventory: ["Casual Clothing", "Baseball Bat", "2 Stimpaks", "Wealth 2"] },
  "Doctor Rast": { id: "d96ed0591877437d", profile: [4, 62, 15, 15, 17, 1, 3, 200], weapons: [["Unarmed Strike", 2, "close", 0], ["Boosted Focused Institute Laser Rifle", 4, "medium", 2]], abilities: ["Robot", "Advanced Synth", "Let Rip", "Stimpak Supply", "Hidden Armament"], inventory: ["Institute Laser Rifle", "Ballistic Weave", "Synth Component", "Stimpaks", "Wealth 4"] },
  "Doctor Rast (Revealed)": { id: "585e6e3344a5a2df", profile: [4, 62, 15, 15, 17, 1, 3, 200], weapons: [["Unarmed Strike", 2, "close", 0], ["Boosted Focused Institute Laser Rifle", 4, "medium", 2]], abilities: ["Robot", "Advanced Synth", "Let Rip", "Stimpak Supply", "Hidden Armament"], inventory: ["Institute Laser Rifle", "Ballistic Weave", "Synth Component", "Stimpaks", "Wealth 4"] },
  "Mirelurk Queen, Wounded": { id: "09d83c62ccd0b77b", profile: [9, 134, 28, 60, 18, 1, null, null], weapons: [["Pincers", 7, "close", 0], ["Acid Spray", 5, "close", 0]], abilities: ["Aquatic", "Small Weak Point", "Hatchling Spawn", "Immune to Fear", "Big", "Immune to Radiation"] },
  "Miss Nanny Clara": { id: "84ef27c7d4acd119", profile: [6, 90, 15, 15, 15, 1, 2, 150], weapons: [["Pincer", 3, "close", 0], ["Buzzsaw", 3, "close", 0], ["Flamer", 3, "close", 1]], abilities: ["Robot", "Immune to Disease", "Miss Nanny", "Immune to Poison", "Immune to Radiation"] },
  "Mister Gutsy (Vault 95)": { id: "94744447df6a256c", profile: [7, 104, 18, 18, 17, 1, 3, 150], weapons: [["Pincer", 4, "", 0], ["Flamer", 3, "close", 1], ["10mm Auto Pistol", 5, "close", 4]], abilities: ["Robot", "Immune to Disease", "Mister Handy", "Mister Gutsy", "Immune to Poison", "Immune to Radiation"] },
  "Rad Rocky": { id: "530a5988a60d5d5e", profile: [2, 34, 14, 14, 15, 1, 3, 220], weapons: [["Unarmed Strike", 3, "close", 0], ["Tire Iron", 4, "close", 0], ["Sharpshooter's Pipe Revolver", 4, "close", 1]], abilities: ["Let Rip", "Turn and Run"], inventory: ["Road Leathers", "Sharpshooter’s Pipe Revolver", "Tire Iron", "Wealth 1"] },
  "Raider (Starter Set)": { id: "10d970d7fcae4600", profile: [2, 17, 8, 8, 11, 1, 0, 210], weapons: [["Unarmed Strike", 2, "close", 0], ["Tire Iron", 4, "close", 0], ["Pipe Gun", 3, "close", 2]], abilities: ["Let Rip"], inventory: ["Road Leathers", "Pipe Gun", "Tire Iron", "Wealth 1"] },
  "Super Mutant (Starter Set)": { id: "158d5cb771a49a1b", profile: [5, 38, 12, 12, 10, 1, 0, 240], weapons: [["Board", 6, "close", 0], ["Unarmed Strike", 4, "close", 0], ["Pipe Bolt-Action Rifle", 5, "medium", 0]], abilities: ["Barbarian", "Immune to Poison", "Immune to Radiation"], inventory: ["Pipe Bolt-Action Rifle", "Board", "Wealth 1"] },
  "Synth Replica (Starter Set)": { id: "f3745dd427869993", profile: [5, 38, 11, 11, 11, 1, null, null], weapons: [["Auto Pipe Gun", 2, "medium", 4], ["Shock Baton", 5, "close", 0]], abilities: ["Robot", "Immune to Fear", "Immune to Disease", "Third-Generation Synth", "Immune to Poison", "Immune to Radiation"], inventory: ["Auto Pipe Rifle", "Shock Baton", "3d20 Fusion Cells", "Synth Component"] }
};

test("all 11 Starter Set Actors satisfy the reviewed semantic contract", () => {
  const actors = readPack("en", "denizens");
  const starter = actors.filter(actor => actor.flags?.["fallout2d20-compendium"]?.source?.book === "starter_set");
  assert.equal(starter.length, 11);
  for (const [name, contract] of Object.entries(actorContracts)) {
    const actor = starter.find(candidate => candidate.name === name);
    assert.equal(actor?._id, contract.id, name);
    assert.deepEqual([
      actor.system.level.value, actor.system.level.currentXP, actor.system.health.value, actor.system.health.max,
      actor.system.initiative.value, actor.system.defense.value, actor.system.luckPoints ?? null,
      actor.system.carryWeight?.base ?? null
    ], contract.profile, `${name} profile`);
    assert.deepEqual(actor.items.filter(item => item.type === "weapon").map(item => [item.name, item.system.damage.rating, item.system.range, item.system.fireRate]), contract.weapons, `${name} weapons`);
    const abilities = actor.items.filter(item => item.type === "special_ability");
    assert.deepEqual(abilities.map(item => item.name), contract.abilities, `${name} abilities`);
    assert.ok(abilities.every(item => String(item.system.description ?? "").replace(/<[^>]+>/g, "").trim()), `${name} has an empty ability`);
    assert.ok(abilities.every(item => !Number(item.system.weight)), `${name} has a weighted ability`);
    if (contract.inventory) {
      const inventory = actor.items.find(item => item.name === "Inventory")?.system.effect ?? "";
      for (const expected of contract.inventory) assert.ok(inventory.includes(expected), `${name} inventory misses ${expected}`);
    }
  }
});

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
    const results = table.results;
    assert.ok(results.every(result => result._key.startsWith(`!tables.results!${table._id}.`)));
    assert.deepEqual(results.flatMap(result => Array.from({length: result.range[1] - result.range[0] + 1}, (_, i) => result.range[0] + i)).sort((a,b)=>a-b), Array.from({length:20},(_,i)=>i+1));
  }
  const armor = docs.find(doc => doc.name === "Random Armor (Starter Set)");
  const final = armor.results.at(-1);
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
