import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { FRENCH_CORE_ACTOR_NAMES } from "../scripts/data/french-core-actor-names.mjs";

async function actor(language, pack, name) {
  const root = path.join("src/packs", language, `${pack}.db`);
  for (const file of await readdir(root)) {
    if (!file.endsWith(".json")) continue;
    const document = JSON.parse(await readFile(path.join(root, file), "utf8"));
    if (document.name === (language === "fr" ? FRENCH_CORE_ACTOR_NAMES[name] : name)) return document;
  }
  assert.fail(`Missing ${language}/${pack}/${name}`);
}

for (const language of ["en", "fr"]) test(`${language} scalar actor errata V6 are retained`, async () => {
  const deathclaw = await actor(language, "creatures", "Deathclaw");
  assert.equal(deathclaw.system.health.max, 31);
  assert.equal(deathclaw.system.defense.value, 1);
  assert.match(deathclaw.system.origin, language === "fr" ? /Reptile Mutant/ : /Mutated Lizard/);
  const radstag = await actor(language, "creatures", "Radstag");
  assert.equal(radstag.system.body.value, 6);
  assert.equal(radstag.system.health.max, 11);
  assert.equal((await actor(language, "creatures", "Glowing One")).system.health.max, 17);
  const hound = await actor(language, "creatures", "Mutant Hound");
  assert.deepEqual([hound.system.body.value, hound.system.mind.value], [6, 4]);
  const handy = await actor(language, "npcs", "Mister Handy");
  assert.deepEqual(["str","per","end","cha","int","agi","luc"].map(k => handy.system.attributes[k].value), [6,8,5,7,7,7,5]);
  assert.equal(handy.system.health.max, 16);
  assert.equal(handy.system.luckPoints, 3);
  const gutsy = await actor(language, "npcs", "Mister Gutsy");
  assert.deepEqual(["str","per","end","cha","int","agi","luc"].map(k => gutsy.system.attributes[k].value), [6,9,7,5,7,8,4]);
  assert.equal(gutsy.system.health.max, 18);
  assert.equal(gutsy.system.initiative.value, 19);
  const wastelander = await actor(language, "npcs", "Wastelander");
  assert.deepEqual(["str","per","end","cha","int","agi","luc"].map(k => wastelander.system.attributes[k].value), [6,5,7,4,5,5,4]);
  assert.equal(wastelander.system.initiative.value, 10);
  assert.equal(wastelander.system.carryWeight.base, language === "fr" ? 105 : 210);
});
