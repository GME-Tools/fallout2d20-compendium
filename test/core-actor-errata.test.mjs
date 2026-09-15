import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { FRENCH_CORE_ACTOR_NAMES } from "../scripts/data/french-core-actor-names.mjs";

async function actor(language, pack, name) {
  const root = path.join("generated/source-packs", language, `${pack}.db`);
  for (const file of await readdir(root)) {
    if (!file.endsWith(".json")) continue;
    const document = JSON.parse(await readFile(path.join(root, file), "utf8"));
    if (document.name === (language === "fr" ? FRENCH_CORE_ACTOR_NAMES[name] : name)) return document;
  }
  assert.fail(`Missing ${language}/${pack}/${name}`);
}

for (const language of ["en", "fr"]) test(`${language} scalar actor errata V6 are retained`, async () => {
  const deathclaw = await actor(language, "denizens", "Deathclaw");
  assert.equal(deathclaw.system.health.max, 31);
  assert.equal(deathclaw.system.defense.value, 1);
  assert.match(deathclaw.system.origin, language === "fr" ? /Reptile Mutant/ : /Mutated Lizard/);
  const radstag = await actor(language, "denizens", "Radstag");
  assert.equal(radstag.system.body.value, 6);
  assert.equal(radstag.system.health.max, 11);
  assert.equal(radstag.system.immunities.radiation, true);
  assert.equal((await actor(language, "denizens", "Glowing One")).system.health.max, 17);
  const hound = await actor(language, "denizens", "Mutant Hound");
  assert.deepEqual([hound.system.body.value, hound.system.mind.value], [6, 4]);
  const bite = hound.items.find(item => item.name === (language === "fr" ? "Morsure" : "Bite"));
  assert.equal(bite.flags["fallout2d20-compendium"].fixedTargetNumber, 12);
  const handy = await actor(language, "denizens", "Mister Handy");
  assert.deepEqual(["str","per","end","cha","int","agi","luc"].map(k => handy.system.attributes[k].value), [6,8,5,7,7,7,5]);
  assert.equal(handy.system.health.max, 16);
  assert.equal(handy.system.luckPoints, 3);
  const nanny = await actor(language, "denizens", "Miss Nanny");
  assert.deepEqual(["str","per","end","cha","int","agi","luc"].map(k => nanny.system.attributes[k].value), [6,8,5,7,7,7,5]);
  assert.equal(nanny.system.health.max, 16);
  assert.equal(nanny.system.luckPoints, 3);
  const gutsy = await actor(language, "denizens", "Mister Gutsy");
  assert.deepEqual(["str","per","end","cha","int","agi","luc"].map(k => gutsy.system.attributes[k].value), [6,9,7,5,7,8,4]);
  assert.equal(gutsy.system.health.max, 18);
  assert.equal(gutsy.system.initiative.value, 19);
  const wastelander = await actor(language, "denizens", "Wastelander");
  assert.deepEqual(["str","per","end","cha","int","agi","luc"].map(k => wastelander.system.attributes[k].value), [6,5,7,4,5,5,4]);
  assert.equal(wastelander.system.initiative.value, 10);
  assert.equal(wastelander.system.carryWeight.base, language === "fr" ? 105 : 210);

  const bodyResistance = (document, type) => ["head", "torso", "armL", "armR", "legL", "legR"]
    .map(part => document.system.body_parts[part].resistance[type]);
  assert.deepEqual(bodyResistance(await actor(language, "denizens", "Super Mutant Brute"), "energy"), [2, 2, 2, 2, 3, 3]);
  assert.deepEqual(bodyResistance(await actor(language, "denizens", "Super Mutant Master"), "energy"), [2, 4, 4, 4, 4, 4]);
  assert.deepEqual(bodyResistance(await actor(language, "denizens", "Synth Courser"), "energy"), [2, 5, 5, 5, 5, 5]);
  assert.deepEqual(bodyResistance(await actor(language, "denizens", "Synth Trooper"), "energy"), [4, 4, 4, 4, 4, 4]);
  assert.deepEqual(bodyResistance(await actor(language, "denizens", "Scribe"), "radiation"), [0, 2, 2, 2, 2, 2]);
  assert.deepEqual(bodyResistance(await actor(language, "denizens", "Raider"), "physical"), [0, 1, 1, 1, 1, 1]);
  const zetan = await actor(language, "denizens", "Zetan (Aliens)");
  assert.deepEqual([zetan.system.immunities.radiation, zetan.system.immunities.poison], [false, false]);
});
