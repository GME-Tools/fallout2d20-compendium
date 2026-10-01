import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const catalog = JSON.parse(await readFile(path.resolve("catalog/astoundingly-awesome-tales-3-certification.json"), "utf8"));
async function documents(language, pack) {
  const directory = path.resolve("generated/source-packs", language, `${pack}.db`);
  return Promise.all((await readdir(directory)).filter(file => file.endsWith(".json")).map(async file => JSON.parse(await readFile(path.join(directory, file), "utf8"))));
}
const byId = (list, id) => list.find(document => document._id === id);
const source = document => document.flags?.["fallout2d20-compendium"]?.source;

test("AAT #3 checkpoint is limited to source pages 1-23 and has no fake RollTable", () => {
  assert.deepEqual(catalog.checkpoint.sourcePagesReviewed, [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]);
  assert.deepEqual(catalog.checkpoint.nextSourcePages, [24,25,26,27]);
  assert.equal(catalog.rollTables.length, 0);
  assert.ok(catalog.pageReview.every(entry => entry.page <= 23));
  assert.equal(catalog.pageReview.find(entry => entry.page === 20)?.status, "out_of_scope");
  assert.equal(catalog.pageReview.find(entry => entry.page === 21)?.status, "corrected");
  assert.equal(catalog.pageReview.find(entry => entry.page === 22)?.status, "mechanical_variant");
  assert.equal(catalog.pageReview.find(entry => entry.page === 23)?.status, "out_of_scope");
});

test("AAT #3 p.8 Wastelander is a distinct mechanical variant", async () => {
  const [en, fr] = await Promise.all([documents("en","denizens"), documents("fr","denizens")]);
  const actor = byId(en, "AAT3WastelandP08");
  const actorFr = byId(fr, "AAT3WastelandP08");
  assert.ok(actor);
  assert.ok(actorFr);
  assert.equal(actor.system.source, "astoundingly_awesome_tales_3");
  assert.equal(source(actor).book, "astoundingly_awesome_tales_3");
  assert.equal(source(actor).page, 8);
  assert.equal(actor.system.carryWeight.base, 200);
  assert.equal(actorFr.system.carryWeight.base, 100);
  assert.deepEqual(["str","per","end","cha","int","agi","luc"].map(k => actor.system.attributes[k].value), [6,5,7,4,5,5,4]);
  assert.equal(actor.system.health.max, 9);
  assert.equal(actor.system.initiative.value, 10);
  assert.equal(actor.system.defense.value, 1);
  assert.equal(actor.items.find(item => item.name === "Energy Weapons")?.system.value, 1);
  assert.equal(actor.items.find(item => item.name === "Melee Weapons")?.system.value, 2);
  assert.equal(actor.items.find(item => item.name === "Small Guns")?.system.value, 2);
  assert.equal(actor.items.find(item => item.name === "Small Guns")?.system.tag, true);
  assert.equal(actor.items.find(item => item.name === "Survival")?.system.tag, true);
  const inventory = actor.items.find(item => item.name === "Inventory")?.system.effect ?? "";
  assert.match(inventory, /Road Leathers/);
  assert.match(inventory, /Double-Barreled Shotgun/);
  assert.match(inventory, /Wealth 1/);
  assert.doesNotMatch(inventory, /Shotgun Shells/);
  const core = byId(en, "Twv5p2s3w1avJkbO");
  assert.ok(core);
  assert.ok(!source(core).appearances?.some(entry => entry.book === "astoundingly_awesome_tales_3"));
});

test("AAT #3 pp.9-10 consumables are complete and bilingual", async () => {
  const [en, fr] = await Promise.all([documents("en", "consumables"), documents("fr", "consumables")]);
  const expected = [{"id":"19a0de054c5e6f95","name":"Biogel","page":9,"hp":5,"cost":60,"rarity":4,"weight":1},{"id":"43269fe9b66161a6","name":"Epoxy","page":9,"hp":0,"cost":50,"rarity":4,"weight":0.1},{"id":"679a3443938974ac","name":"Living “mutant” worm","page":10,"hp":5,"cost":10,"rarity":1,"weight":0.1},{"id":"58c0e3499281f80f","name":"Worm kabob","page":10,"hp":7,"cost":10,"rarity":1,"weight":0.1},{"id":"d1ce79d676261c49","name":"Squid Calamari","page":10,"hp":3,"cost":5,"rarity":1,"weight":0.1},{"id":"8b4bbbe3fabed364","name":"Stuffed Squid","page":10,"hp":6,"cost":8,"rarity":1,"weight":0.1},{"id":"5a66ba7e1ed41064","name":"Mutant Rattler Meat","page":10,"hp":10,"cost":20,"rarity":3,"weight":1},{"id":"edcbf433f3f8c98f","name":"Grilled Rattler","page":10,"hp":12,"cost":60,"rarity":3,"weight":0.1},{"id":"ec62006c4cfe41ed","name":"Skull Canyon Shot","page":10,"hp":4,"cost":20,"rarity":1,"weight":0.1},{"id":"cc5020d669b48a0f","name":"Mutant Rattler Venom Shot","page":10,"hp":0,"cost":25,"rarity":2,"weight":0.1}];
  for (const entry of expected) {
    const enDoc = byId(en, entry.id);
    const frDoc = byId(fr, entry.id);
    assert.ok(enDoc, `missing EN ${entry.name}`);
    assert.ok(frDoc, `missing FR ${entry.name}`);
    assert.equal(enDoc.system.source, "astoundingly_awesome_tales_3");
    assert.equal(source(enDoc).book, "astoundingly_awesome_tales_3");
    assert.equal(source(enDoc).page, entry.page);
    assert.equal(enDoc.system.hp, entry.hp);
    assert.equal(enDoc.system.cost, entry.cost);
    assert.equal(enDoc.system.rarity, entry.rarity);
    assert.equal(enDoc.system.weight, entry.weight);
    assert.equal(frDoc.system.weight, entry.weight / 2);
    assert.equal(source(frDoc).translation, "project");
  }
});

test("AAT #3 p.10 Core reprints reuse identities with Issue #3 provenance", async () => {
  const [en, fr] = await Promise.all([documents("en","consumables"),documents("fr","consumables")]);
  for (const id of ["i1BhSDEcs5JNub1v","D2s5huShfKCtulYC","PVf7RRNJLAIY2b2t","smWip05JhGyTXRU1","UlhNGl3T0UejS5ZW","u9KyfdRIzyQhCjnn"]) {
    for (const doc of [byId(en,id),byId(fr,id)]) {
      assert.ok(doc);
      assert.equal(doc.system.source,"core_rulebook");
      assert.ok(source(doc).appearances.some(entry => entry.book === "astoundingly_awesome_tales_3" && entry.page === 10 && entry.status === "identical"));
    }
  }
});

test("verified collection differences stay explicit pending project approval", async () => {
  const epoxy = catalog.collectionReview.verifiedDifferences.find(entry => entry.sourcePage === 9);
  const shot = catalog.collectionReview.verifiedDifferences.find(entry => entry.sourcePage === 10 && /Lasting/.test(entry.difference));
  assert.equal(epoxy.scope, "open_arbitration");
  assert.equal(shot.scope, "open_arbitration");
  const en = await documents("en","consumables");
  assert.doesNotMatch(byId(en,"43269fe9b66161a6").system.effect, /minimum of 0/i);
  assert.match(byId(en,"ec62006c4cfe41ed").system.effect, /Lasting/);
});


test("AAT #3 p.12 Twinjaw Rattler keeps source mechanics and structured butchery", async () => {
  const [en, fr] = await Promise.all([documents("en","denizens"), documents("fr","denizens")]);
  for (const actor of [byId(en,"1b4ce0097ed5198a"), byId(fr,"1b4ce0097ed5198a")]) {
    assert.ok(actor);
    assert.equal(actor.system.source, "astoundingly_awesome_tales_3");
    assert.equal(source(actor).book, "astoundingly_awesome_tales_3");
    assert.equal(source(actor).page, 12);
    assert.equal(actor.system.level.value, 5);
    assert.equal(actor.system.health.max, 16);
    assert.equal(actor.system.initiative.value, 13);
    assert.equal(actor.system.butchery.tn, 1);
    assert.equal(actor.system.butchery.common, 2);
    assert.ok(!source(actor).appearances?.some(entry => entry.book === "astoundingly_awesome_tales_1_5"));
  }
  const actor = byId(en,"1b4ce0097ed5198a");
  const bite = actor.items.find(item => item.name === "Bite");
  assert.equal(bite.system.attribute, "body");
  assert.equal(bite.system.skill, "melee");
  assert.equal(bite.system.damage.rating, 4);
  assert.equal(bite.system.damage.damageEffect.persistent.value, true);
  const yieldItem = actor.items.find(item => item.flags?.["fallout2d20-compendium"]?.embeddedYield);
  assert.ok(yieldItem);
  assert.equal(yieldItem.flags["fallout2d20-compendium"].canonicalPack, "consumables");
  assert.equal(yieldItem.flags["fallout2d20-compendium"].canonicalItemId, "5a66ba7e1ed41064");
  assert.equal(yieldItem.system.quantityRoll, "2dc");
  assert.match(actor.system.biography, /poison sack/i);
});

test("AAT #3 p.14 NCR Trooper embedded attacks execute the printed tests", async () => {
  const [en, fr] = await Promise.all([documents("en","denizens"), documents("fr","denizens")]);
  const actor = byId(en,"91957f7226ee31a7");
  const actorFr = byId(fr,"91957f7226ee31a7");
  assert.ok(actor);
  assert.ok(actorFr);
  assert.equal(source(actor).page, 14);
  assert.deepEqual(["str","per","end","cha","int","agi","luc"].map(k => actor.system.attributes[k].value), [5,6,5,5,6,7,4]);
  assert.equal(actor.system.health.max, 12);
  assert.equal(actor.system.initiative.value, 13);
  assert.equal(actor.system.defense.value, 1);
  assert.equal(actor.system.carryWeight.base, 200);
  assert.equal(actorFr.system.carryWeight.base, 100);
  assert.equal(actor.items.find(item => item.name === "Athletics")?.system.tag, true);
  assert.equal(actor.items.find(item => item.name === "Small Guns")?.system.tag, true);
  assert.equal(actor.items.find(item => item.name === "Big Guns")?.system.value, 2);
  assert.equal(actor.items.find(item => item.name === "Melee Weapons")?.system.value, 2);
  const attacks = new Map(actor.items.filter(item => item.type === "weapon").map(item => [item.name,item]));
  assert.deepEqual([attacks.get("Unarmed Strike")?.system.attribute, attacks.get("Unarmed Strike")?.system.skill], ["str","unarmed"]);
  assert.deepEqual([attacks.get("10mm Pistol")?.system.attribute, attacks.get("10mm Pistol")?.system.skill], ["agi","smallGuns"]);
  assert.deepEqual([attacks.get("Combat Rifle")?.system.attribute, attacks.get("Combat Rifle")?.system.skill], ["agi","smallGuns"]);
  assert.deepEqual([attacks.get("Gun Bash")?.system.attribute, attacks.get("Gun Bash")?.system.skill], ["str","meleeWeapons"]);
  assert.deepEqual([attacks.get("Combat Knife")?.system.attribute, attacks.get("Combat Knife")?.system.skill], ["str","meleeWeapons"]);
  assert.equal(attacks.get("Gun Bash")?.system.damage.damageEffect.stun.value, true);
  assert.equal(attacks.get("Combat Knife")?.system.damage.damageEffect.piercing.value, true);
  assert.ok(!source(actor).appearances?.some(entry => entry.book === "astoundingly_awesome_tales_1_5"));
});

test("AAT #3 pp.12-15 collection divergences remain explicit unless already approved", () => {
  const diffs = catalog.collectionReview.verifiedDifferences;
  assert.equal(diffs.find(entry => entry.sourcePage === 12 && entry.scope === "approved_project_correction")?.collectionPage, 54);
  assert.ok(diffs.some(entry => entry.sourcePage === 12 && entry.scope === "open_arbitration" && /poison-sack/.test(entry.difference)));
  assert.ok(diffs.some(entry => entry.sourcePage === 14 && entry.collectionPage === 56 && entry.scope === "open_arbitration" && /LUC/.test(entry.difference)));
  assert.ok(catalog.openArbitrations.some(entry => /Twinjaw Rattler/.test(entry)));
  assert.ok(catalog.openArbitrations.some(entry => /NCR Trooper/.test(entry)));
});


test("AAT #3 pp.16-19 create no duplicate reusable identities and keep p.12 Twinjaw provenance", async () => {
  assert.equal(catalog.candidates.filter(entry => entry.page >= 16 && entry.page <= 19).length, 0);
  const [en, fr] = await Promise.all([documents("en","denizens"), documents("fr","denizens")]);
  for (const actor of [byId(en,"1b4ce0097ed5198a"), byId(fr,"1b4ce0097ed5198a")]) {
    assert.ok(actor);
    assert.equal(actor.system.source, "astoundingly_awesome_tales_3");
    assert.equal(source(actor).book, "astoundingly_awesome_tales_3");
    assert.equal(source(actor).page, 12);
    assert.equal(actor.system.butchery.tn, 1);
    assert.equal(actor.system.butchery.common, 2);
    const yieldItem = actor.items.find(item => item.flags?.["fallout2d20-compendium"]?.embeddedYield);
    assert.ok(yieldItem);
    assert.equal(yieldItem.flags["fallout2d20-compendium"].canonicalItemId, "5a66ba7e1ed41064");
  }
});

test("AAT #3 pp.16-19 collection differences stay narrative-only and unapplied", () => {
  const diffs = catalog.collectionReview.verifiedDifferences;
  const p16 = diffs.find(entry => entry.sourcePage === 16);
  const p17 = diffs.find(entry => entry.sourcePage === 17);
  const p19 = diffs.find(entry => entry.sourcePage === 19);
  assert.equal(p16?.collectionPage, 58);
  assert.equal(p17?.collectionPage, 59);
  assert.equal(p19?.collectionPage, 60);
  assert.equal(p16?.scope, "out_of_scope");
  assert.equal(p17?.scope, "out_of_scope");
  assert.equal(p19?.scope, "out_of_scope");
  assert.match(p16?.difference ?? "", /critical success/);
  assert.match(p16?.difference ?? "", /PER \+ Sneak/);
  assert.match(p19?.difference ?? "", /unaware/);
  assert.match(p19?.difference ?? "", /Sneak Attack/);
});


test("AAT #3 p.21 Security Drone follows the 2023 source and uses structured salvage", async () => {
  const [en, fr] = await Promise.all([documents("en","denizens"), documents("fr","denizens")]);
  for (const actor of [byId(en,"772d0f6d939dfad5"), byId(fr,"772d0f6d939dfad5")]) {
    assert.ok(actor);
    assert.equal(actor.system.source, "astoundingly_awesome_tales_3");
    assert.equal(source(actor).book, "astoundingly_awesome_tales_3");
    assert.equal(source(actor).page, 21);
    assert.equal(actor.system.bodyType, "robot");
    assert.equal(actor.system.resistance.physical.locations, "4 (All)");
    assert.equal(actor.system.resistance.energy.locations, "4 (All)");
    assert.equal(actor.system.salvage.tn, 1);
    assert.equal(actor.system.materials.common, 2);
    assert.equal(actor.system.materials.uncommon, 1);
    assert.equal(actor.system.butchery, undefined);
    assert.ok(!source(actor).appearances?.some(entry => entry.book === "astoundingly_awesome_tales_1_5"));
  }
  const actor = byId(en,"772d0f6d939dfad5");
  const armLasers = actor.items.find(item => item.name === "Arm Lasers");
  assert.deepEqual([armLasers?.system.attribute, armLasers?.system.skill], ["body","guns"]);
  assert.deepEqual([armLasers?.system.creatureAttribute, armLasers?.system.creatureSkill], ["body","guns"]);
  assert.equal(armLasers?.system.damage.rating, 3);
  assert.equal(armLasers?.system.fireRate, 4);
  assert.equal(armLasers?.system.damage.damageEffect.burst.value, true);
  assert.equal(armLasers?.system.damage.damageEffect.piercing.value, true);
});

test("AAT #3 p.22 Super Mutant is a distinct bilingual mechanical variant", async () => {
  const [en, fr] = await Promise.all([documents("en","denizens"), documents("fr","denizens")]);
  const actor = byId(en,"AAT3SuperMutP022");
  const actorFr = byId(fr,"AAT3SuperMutP022");
  assert.ok(actor);
  assert.ok(actorFr);
  assert.equal(actor.system.source, "astoundingly_awesome_tales_3");
  assert.equal(source(actor).book, "astoundingly_awesome_tales_3");
  assert.equal(source(actor).page, 22);
  assert.deepEqual(["str","per","end","cha","int","agi","luc"].map(k => actor.system.attributes[k].value), [9,5,7,4,4,5,4]);
  assert.equal(actor.system.health.max, 12);
  assert.equal(actor.system.initiative.value, 10);
  assert.equal(actor.system.defense.value, 1);
  assert.equal(actor.system.carryWeight.base, 240);
  assert.equal(actorFr.system.carryWeight.base, 120);
  assert.equal(actor.system.resistance.radiation.locations, "Immune");
  assert.equal(actor.system.resistance.poison.locations, "Immune");
  assert.equal(actor.system.immunities.radiation, true);
  assert.equal(actor.system.immunities.poison, true);
  const inventory = actor.items.find(item => item.name === "Inventory")?.system.effect ?? "";
  assert.match(inventory, /Super Mutant Helmet/);
  assert.match(inventory, /Super Mutant Leg Guards x2/);
  const attacks = new Map(actor.items.filter(item => item.type === "weapon").map(item => [item.name,item]));
  assert.deepEqual([attacks.get("Unarmed Strike")?.system.attribute, attacks.get("Unarmed Strike")?.system.skill], ["str","unarmed"]);
  assert.deepEqual([attacks.get("Board")?.system.attribute, attacks.get("Board")?.system.skill], ["str","meleeWeapons"]);
  assert.deepEqual([attacks.get("Pipe Bolt-Action Rifle")?.system.attribute, attacks.get("Pipe Bolt-Action Rifle")?.system.skill], ["agi","smallGuns"]);
  const core = byId(en,"9uRMSgaooTRV8AiH");
  assert.ok(core);
  assert.ok(!source(core).appearances?.some(entry => entry.book === "astoundingly_awesome_tales_3"));
  assert.ok(source(core).appearances?.some(entry => entry.book === "astoundingly_awesome_tales_1_5" && entry.page === 103 && entry.status === "identical"));
});

test("AAT #3 pp.20-23 collection changes remain explicit and unapplied", async () => {
  const diffs = catalog.collectionReview.verifiedDifferences;
  assert.ok(diffs.some(entry => entry.sourcePage === 20 && entry.scope === "out_of_scope"));
  assert.ok(diffs.some(entry => entry.sourcePage === 21 && entry.collectionPage === 63 && entry.scope === "open_arbitration" && /Energy DR/.test(entry.difference)));
  assert.ok(diffs.some(entry => entry.sourcePage === 22 && entry.collectionPage === 62 && entry.scope === "open_arbitration" && /Abomination/.test(entry.difference)));
  assert.ok(diffs.some(entry => entry.sourcePage === 23 && entry.collectionPage === 64 && entry.scope === "out_of_scope"));
  assert.ok(catalog.openArbitrations.some(entry => /Security Drone/.test(entry)));
  assert.ok(catalog.openArbitrations.some(entry => /Super Mutant \/ Abomination/.test(entry)));
  const en = await documents("en","denizens");
  const sourceMutant = byId(en,"AAT3SuperMutP022");
  const collectedAbomination = byId(en,"3db5227b46e039ec");
  assert.ok(sourceMutant);
  assert.ok(collectedAbomination);
  assert.equal(source(collectedAbomination).book, "astoundingly_awesome_tales_1_5");
  assert.equal(source(collectedAbomination).page, 62);
  assert.notEqual(sourceMutant._id, collectedAbomination._id);
});
