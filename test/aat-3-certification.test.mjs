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

test("AAT #3 checkpoint is limited to source pages 1-28 and has no fake RollTable", () => {
  assert.deepEqual(catalog.checkpoint.sourcePagesReviewed, [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28]);
  assert.deepEqual(catalog.checkpoint.nextSourcePages, []);
  assert.equal(catalog.rollTables.length, 0);
  assert.equal(catalog.openArbitrations.length, 0);
  assert.ok(catalog.pageReview.every(entry => entry.page <= 28));
  assert.equal(catalog.pageReview.find(entry => entry.page === 21)?.status, "corrected");
  assert.equal(catalog.pageReview.find(entry => entry.page === 22)?.status, "corrected");
  assert.equal(catalog.pageReview.find(entry => entry.page === 26)?.status, "corrected");
  assert.equal(catalog.pageReview.find(entry => entry.page === 27)?.status, "corrected");
  assert.equal(catalog.pageReview.find(entry => entry.page === 28)?.status, "out_of_scope");
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

test("owner-approved 2024 consumable corrections are applied", async () => {
  const epoxy = catalog.collectionReview.verifiedDifferences.find(entry => entry.sourcePage === 9);
  const shot = catalog.collectionReview.verifiedDifferences.find(entry => entry.sourcePage === 10 && /Lasting/.test(entry.difference));
  assert.equal(epoxy.scope, "approved_project_correction");
  assert.equal(shot.scope, "approved_project_correction");
  const [en, fr] = await Promise.all([documents("en","consumables"), documents("fr","consumables")]);
  assert.match(byId(en,"43269fe9b66161a6").system.effect, /minimum of 0/i);
  assert.match(byId(fr,"43269fe9b66161a6").system.effect, /minimum de 0/i);
  assert.doesNotMatch(byId(en,"ec62006c4cfe41ed").system.effect, /Lasting/);
  assert.doesNotMatch(byId(fr,"ec62006c4cfe41ed").system.effect, /Persistant/);
  for (const doc of [byId(en,"43269fe9b66161a6"), byId(en,"ec62006c4cfe41ed")]) {
    assert.ok(source(doc).appearances.some(entry => entry.book === "astoundingly_awesome_tales_1_5" && entry.status === "corrected" && entry.ownerApproved === true));
  }
});

test("AAT #3 p.12 Twinjaw Rattler uses the authoritative 2024 correction", async () => {
  const [en, fr] = await Promise.all([documents("en","denizens"), documents("fr","denizens")]);
  for (const actor of [byId(en,"1b4ce0097ed5198a"), byId(fr,"1b4ce0097ed5198a")]) {
    assert.ok(actor);
    assert.equal(actor.system.source, "astoundingly_awesome_tales_3");
    assert.equal(source(actor).book, "astoundingly_awesome_tales_3");
    assert.equal(source(actor).page, 12);
    assert.equal(actor.system.bodyType, "quadruped");
    assert.equal(actor.system.butchery.tn, 1);
    assert.equal(actor.system.butchery.common, 2);
    assert.ok(source(actor).appearances.some(entry => entry.book === "astoundingly_awesome_tales_1_5" && entry.page === 54 && entry.status === "corrected" && entry.ownerApproved === true));
  }
  const actor = byId(en,"1b4ce0097ed5198a");
  const bite = actor.items.find(item => item.name === "Bite");
  assert.deepEqual([bite.system.attribute,bite.system.skill],[ "body","melee" ]);
  assert.equal(bite.system.damage.rating, 4);
  assert.equal(bite.system.damage.damageEffect.persistent.value, true);
  const yieldItem = actor.items.find(item => item.flags?.["fallout2d20-compendium"]?.embeddedYield);
  assert.ok(yieldItem);
  assert.equal(yieldItem.flags["fallout2d20-compendium"].canonicalItemId, "5a66ba7e1ed41064");
  assert.equal(yieldItem.system.quantityRoll, "2dc");
  assert.doesNotMatch(actor.system.biography, /poison sack/i);
  assert.match(actor.items.find(item => item.name === "Twin Heads")?.system.description ?? "", /Major action/i);
  assert.match(actor.items.find(item => item.name === "Death Rattle")?.system.description ?? "", /Once per battle/i);
});

test("AAT #3 p.14 NCR Trooper uses the authoritative 2024 correction", async () => {
  const [en, fr] = await Promise.all([documents("en","denizens"), documents("fr","denizens")]);
  const actor = byId(en,"91957f7226ee31a7");
  const actorFr = byId(fr,"91957f7226ee31a7");
  assert.ok(actor);
  assert.ok(actorFr);
  assert.equal(source(actor).page, 14);
  assert.deepEqual(["str","per","end","cha","int","agi","luc"].map(k => actor.system.attributes[k].value), [5,6,5,5,6,7,3]);
  assert.equal(actor.system.origin, "Human");
  assert.equal(actorFr.system.origin, "Humain");
  assert.equal(actor.system.health.max, 12);
  assert.equal(actor.system.initiative.value, 13);
  assert.equal(actor.system.defense.value, 1);
  assert.equal(actor.system.carryWeight.base, 200);
  assert.equal(actorFr.system.carryWeight.base, 100);
  const inventory = actor.items.find(item => item.name === "Inventory")?.system.effect ?? "";
  assert.match(inventory, /12\+4 DC 10mm Rounds/);
  const attacks = new Map(actor.items.filter(item => item.type === "weapon").map(item => [item.name,item]));
  assert.deepEqual([attacks.get("Unarmed Strike")?.system.attribute, attacks.get("Unarmed Strike")?.system.skill], ["str","unarmed"]);
  assert.deepEqual([attacks.get("10mm Pistol")?.system.attribute, attacks.get("10mm Pistol")?.system.skill], ["agi","smallGuns"]);
  assert.deepEqual([attacks.get("Combat Rifle")?.system.attribute, attacks.get("Combat Rifle")?.system.skill], ["agi","smallGuns"]);
  assert.deepEqual([attacks.get("Gun Bash")?.system.attribute, attacks.get("Gun Bash")?.system.skill], ["str","meleeWeapons"]);
  assert.deepEqual([attacks.get("Combat Knife")?.system.attribute, attacks.get("Combat Knife")?.system.skill], ["str","meleeWeapons"]);
  assert.ok(source(actor).appearances.some(entry => entry.book === "astoundingly_awesome_tales_1_5" && entry.page === 56 && entry.status === "corrected" && entry.ownerApproved === true));
});

test("AAT #3 pp.12-15 collection corrections are owner-approved", () => {
  const diffs = catalog.collectionReview.verifiedDifferences;
  assert.ok(diffs.some(entry => entry.sourcePage === 12 && entry.collectionPage === 54 && entry.scope === "approved_project_correction" && /poison-sack/.test(entry.difference)));
  assert.ok(diffs.some(entry => entry.sourcePage === 14 && entry.collectionPage === 56 && entry.scope === "approved_project_correction" && /LUC/.test(entry.difference)));
  assert.equal(catalog.openArbitrations.length, 0);
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


test("AAT #3 p.21 Security Drone uses the authoritative 2024 correction and complete salvage text", async () => {
  const [en, fr] = await Promise.all([documents("en","denizens"), documents("fr","denizens")]);
  for (const actor of [byId(en,"772d0f6d939dfad5"), byId(fr,"772d0f6d939dfad5")]) {
    assert.ok(actor);
    assert.equal(actor.system.source, "astoundingly_awesome_tales_3");
    assert.equal(source(actor).page, 21);
    assert.equal(actor.system.bodyType, "robot");
    assert.equal(actor.system.resistance.physical.locations, "4 (All)");
    assert.equal(actor.system.resistance.energy.locations, "3 (All)");
    assert.equal(actor.system.salvage.tn, 1);
    assert.equal(actor.system.materials.common, 2);
    assert.equal(actor.system.materials.uncommon, 1);
    assert.ok(source(actor).appearances.some(entry => entry.book === "astoundingly_awesome_tales_1_5" && entry.page === 63 && entry.status === "corrected" && entry.ownerApproved === true));
  }
  const actor = byId(en,"772d0f6d939dfad5");
  assert.match(actor.system.biography, /\+1 DC per AP spent/i);
  assert.match(actor.system.biography, /Each Effect yields 1 uncommon material/i);
  const armLasers = actor.items.find(item => item.name === "Arm Lasers" && item.type === "weapon");
  assert.deepEqual([armLasers?.system.attribute, armLasers?.system.skill], ["body","guns"]);
  assert.equal(armLasers?.system.damage.rating, 3);
  assert.equal(armLasers?.system.fireRate, 4);
});

test("AAT #3 p.22 keeps the 2023 Super Mutant only as a superseded source variant", async () => {
  const [en, fr] = await Promise.all([documents("en","denizens"), documents("fr","denizens")]);
  const actor = byId(en,"AAT3SuperMutP022");
  const actorFr = byId(fr,"AAT3SuperMutP022");
  assert.ok(actor);
  assert.ok(actorFr);
  assert.equal(actor.system.source, "astoundingly_awesome_tales_3");
  assert.equal(source(actor).page, 22);
  assert.equal(catalog.candidates.find(entry => entry.id === "AAT3SuperMutP022")?.status, "superseded_source_variant");
});

test("AAT #3 pp.20-23 apply the owner-approved 2024 mechanical corrections", async () => {
  const diffs = catalog.collectionReview.verifiedDifferences;
  assert.ok(diffs.some(entry => entry.sourcePage === 21 && entry.collectionPage === 63 && entry.scope === "approved_project_correction"));
  assert.ok(diffs.some(entry => entry.sourcePage === 22 && entry.collectionPage === 62 && entry.scope === "approved_project_correction"));
  const [en, fr] = await Promise.all([documents("en","denizens"), documents("fr","denizens")]);
  const abom = byId(en,"3db5227b46e039ec");
  const abomFr = byId(fr,"3db5227b46e039ec");
  assert.ok(abom);
  assert.ok(abomFr);
  assert.equal(source(abom).book, "astoundingly_awesome_tales_1_5");
  assert.equal(source(abom).page, 62);
  assert.equal(abom.system.origin, "Mutated Human");
  const unarmed = abom.items.find(item => item.name === "Unarmed Strike");
  assert.deepEqual([unarmed?.system.attribute, unarmed?.system.skill], ["str","unarmed"]);
  const inventory = abom.items.find(item => item.name === "Inventory")?.system.effect ?? "";
  assert.match(inventory, /Board/);
  assert.match(inventory, /Scrapped and Damaged Armor/);
  assert.match(inventory, /Wealth 1/);
});

test("AAT #3 p.26 Skull Canyon Zetan uses the authoritative 2024 correction", async () => {
  const [en, fr] = await Promise.all([documents("en","denizens"), documents("fr","denizens")]);
  const actor = byId(en,"74e0af7608dece91");
  const actorFr = byId(fr,"74e0af7608dece91");
  assert.ok(actor);
  assert.ok(actorFr);
  assert.equal(actor.system.source, "astoundingly_awesome_tales_3");
  assert.equal(source(actor).page, 26);
  assert.equal(actor.system.level.value, 5);
  assert.equal(actor.system.level.currentXP, 38);
  assert.equal(actor.system.origin, "Mutated Alien");
  assert.equal(actorFr.system.origin, "Alien mutant");
  assert.deepEqual([actor.system.body.value, actor.system.mind.value, actor.system.melee.value, actor.system.guns.value, actor.system.other.value], [7,5,0,4,2]);
  const attacks = new Map(actor.items.filter(item => item.type === "weapon").map(item => [item.name,item]));
  for (const name of [".44 Pistol","Assault Rifle","Laser Gun"]) assert.deepEqual([attacks.get(name)?.system.attribute, attacks.get(name)?.system.skill], ["body","guns"]);
  const inventory = actor.items.find(item => item.name === "Inventory")?.system.effect ?? "";
  assert.match(inventory, /2d20 5\.56mm Rounds or Power Cells/);
  assert.ok(source(actor).appearances.some(entry => entry.book === "astoundingly_awesome_tales_1_5" && entry.page === 66 && entry.status === "corrected" && entry.ownerApproved === true));
});

test("AAT #3 p.26 Inertia Suppression Field has one clean FR overlay and is not a power-armor frame", async () => {
  const [en, fr] = await Promise.all([documents("en","apparel"), documents("fr","apparel")]);
  const item = byId(en,"e26b938157cfb19b");
  const itemFr = byId(fr,"e26b938157cfb19b");
  assert.ok(item);
  assert.ok(itemFr);
  assert.equal(item.system.powerArmor.isFrame, false);
  assert.equal(item.system.resistance.physical, 3);
  assert.equal(item.system.resistance.energy, 3);
  assert.equal(item.system.resistance.radiation, 0);
  assert.ok(Object.values(item.system.location).every(Boolean));
  assert.equal(item.system.weight, 0.1);
  assert.equal(itemFr.system.weight, 0.05);
  assert.ok(source(item).appearances?.some(entry => entry.book === "astoundingly_awesome_tales_1_5" && entry.page === 66 && entry.status === "identical"));
  assert.ok(source(itemFr).appearances?.some(entry => entry.book === "astoundingly_awesome_tales_1_5" && entry.page === 66 && entry.status === "identical"));
  const overlays = (await readdir(path.resolve("src/packs/locales/fr/apparel.db"))).filter(file => file.includes("e26b938157cfb19b"));
  assert.deepEqual(overlays, ["champ_de_suppression_d_inertie__e26b938157cfb19b.json"]);
});

test("AAT #3 pp.24-27 use the approved 2024 corrections and integrate Sally Jessup", async () => {
  const diffs = catalog.collectionReview.verifiedDifferences;
  assert.ok(diffs.some(entry => entry.sourcePage === 26 && entry.collectionPage === 66 && entry.scope === "approved_project_correction" && /45 XP/.test(entry.difference)));
  assert.ok(diffs.some(entry => entry.sourcePage === 26 && entry.collectionPage === 66 && entry.scope === "identical_mechanics" && /Inertia Suppression Field/.test(entry.difference)));
  assert.ok(diffs.some(entry => entry.sourcePage === 27 && entry.collectionPage === 67 && entry.scope === "approved_project_correction" && /Sally Jessup/.test(entry.difference)));
  const [en, fr] = await Promise.all([documents("en","denizens"), documents("fr","denizens")]);
  const sally = byId(en,"AAT3SallyP067XXX");
  const sallyFr = byId(fr,"AAT3SallyP067XXX");
  assert.ok(sally);
  assert.ok(sallyFr);
  assert.equal(source(sally).book, "astoundingly_awesome_tales_1_5");
  assert.equal(source(sally).page, 67);
  assert.deepEqual(["str","per","end","cha","int","agi","luc"].map(k => sally.system.attributes[k].value), [8,6,8,5,5,8,4]);
  assert.equal(sally.system.health.max, 18);
  assert.equal(sally.system.defense.value, 2);
  assert.equal(sally.system.level.currentXP, 90);
  assert.equal(sally.system.initiative.value, 14);
  assert.equal(sally.system.meleeDamage.value, 1);
});

test("AAT #3 p.28 remains scenario reward procedure and records the collection cleanup", () => {
  assert.equal(catalog.candidates.filter(entry => entry.page === 28).length, 0);
  const diff = catalog.collectionReview.verifiedDifferences.find(entry => entry.sourcePage === 28 && entry.collectionPage === 68);
  assert.equal(diff?.scope, "out_of_scope");
  assert.match(diff?.difference ?? "", /15 already received/);
  assert.match(diff?.difference ?? "", /caps already received/);
  assert.match(diff?.difference ?? "", /60 XP each/);
});
