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

test("AAT #3 checkpoint is limited to source pages 1-11 and has no fake RollTable", () => {
  assert.deepEqual(catalog.checkpoint.sourcePagesReviewed, [1,2,3,4,5,6,7,8,9,10,11]);
  assert.deepEqual(catalog.checkpoint.nextSourcePages, [12,13,14,15]);
  assert.equal(catalog.rollTables.length, 0);
  assert.ok(catalog.pageReview.every(entry => entry.page <= 11));
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
