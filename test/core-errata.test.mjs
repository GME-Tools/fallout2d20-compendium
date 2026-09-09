import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function documents(pack) {
  const root = path.join("generated/source-packs/en", `${pack}.db`);
  const files = await readdir(root);
  return Promise.all(files.filter(file => file.endsWith(".json")).map(async file =>
    JSON.parse(await readFile(path.join(root, file), "utf8"))
  ));
}

async function documentNamed(pack, name) {
  const matches = (await documents(pack)).filter(document => document.name === name);
  assert.equal(matches.length, 1, `expected one ${name} in ${pack}`);
  return matches[0];
}

const value = property => property?.value ?? 0;

test("Fusion Core uses the corrected Scrounger perk reference", async () => {
  const fusionCore = await documentNamed("ammunition", "Fusion Core");
  assert.match(fusionCore.system.description, /Scrounger perk/);
  assert.doesNotMatch(fusionCore.system.description, /Scavenger perk/);
  assert.equal(fusionCore.flags["fallout2d20-compendium"].source.errataReviewed, true);
});

test("corrected weapon qualities are retained", async () => {
  const weapons = new Map((await documents("weapons")).map(document => [document.name, document]));
  assert.equal(value(weapons.get("Sledgehammer").system.damage.weaponQuality.two_handed), 1);
  assert.equal(value(weapons.get("Nuka Grenade").system.damage.damageEffect.breaking), 1);
  for (const name of ["Nuke Mine", "Plasma Mine", "Pulse Mine"]) {
    const qualities = weapons.get(name).system.damage.weaponQuality;
    assert.equal(value(qualities.mine), 1, `${name} must have Mine`);
    assert.equal(value(qualities.thrown), 0, `${name} must not have Thrown`);
  }
});

test("corrected Core weapon mods are retained", async () => {
  const mods = await documents("weapon-mods");
  const named = name => mods.filter(mod => mod.name === name);
  assert.equal(named("Large Magazine")[0].system.cost, 8);
  assert.ok(named("Full Stock").every(mod => value(mod.system.modEffects.damage.weaponQuality.two_handed) === 1));
  assert.equal(named("Shielded Barrel")[0].system.perks, "Gun Nut 3");
  assert.equal(named("Full Capacitors").length, 1);
  const boostingCoil = named("Capacitor Boosting Coil");
  assert.equal(boostingCoil.length, 1);
  assert.equal(boostingCoil[0].system.cost, 82);
  assert.equal(boostingCoil[0].system.weight, 2);
  assert.equal(boostingCoil[0].system.modEffects.damage.rating, 1);
  assert.equal(value(boostingCoil[0].system.modEffects.damage.damageEffect.vicious), 1);

  const baseballBarbed = named("Barbed").filter(mod =>
    mod._id === "SBiPJoDN1jWmENgs" || mod._id === "Sem0JhmbNdppKdJW"
  );
  assert.equal(baseballBarbed.length, 2);
  for (const mod of baseballBarbed) {
    const damage = mod.system.modEffects.damage;
    assert.equal(mod.system.cost, 1);
    assert.equal(damage.rating, 0);
    assert.equal(value(damage.damageEffect.piercing_x), 1);
    assert.equal(value(damage.damageEffect.persistent), 0);
  }
});

test("weapon descriptions retain corrected mod lists", async () => {
  const weapons = new Map((await documents("weapons")).map(document => [document.name, document]));
  assert.match(weapons.get("Hunting Rifle").system.description, /Hair Trigger/);
  assert.doesNotMatch(weapons.get("Hunting Rifle").system.description, /Tuned/);
  assert.doesNotMatch(weapons.get("Submachine Gun").system.description, /Armor Piercing Receiver|Rapid|Short Barrel/);
  assert.doesNotMatch(weapons.get("Pipe Bolt-Action").system.description, /Stub Barrel/);
});
