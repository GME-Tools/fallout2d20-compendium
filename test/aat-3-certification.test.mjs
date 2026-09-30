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

test("AAT #3 inventory certifies every source page and no fake RollTable", () => {
  assert.deepEqual(catalog.source.pagesReviewed, Array.from({ length: 28 }, (_, index) => index + 1));
  assert.equal(catalog.rollTables.length, 0);
});

test("AAT #3 consumables are complete and bilingual", async () => {
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

test("AAT #3 complete actors and armor have French counterparts", async () => {
  const [enDenizens, frDenizens, frApparel] = await Promise.all([documents("en", "denizens"), documents("fr", "denizens"), documents("fr", "apparel")]);
  for (const id of ["1b4ce0097ed5198a", "91957f7226ee31a7", "772d0f6d939dfad5", "74e0af7608dece91"]) {
    assert.ok(byId(enDenizens, id));
    assert.ok(byId(frDenizens, id));
    assert.notEqual(byId(frDenizens, id).name, "");
  }
  assert.equal(byId(frDenizens, "1b4ce0097ed5198a").name, "Crotale à deux têtes");
  assert.equal(byId(frDenizens, "91957f7226ee31a7").name, "Soldat de la RNC");
  assert.equal(byId(frDenizens, "772d0f6d939dfad5").name, "Drone de sécurité, Protectron");
  assert.equal(byId(frApparel, "e26b938157cfb19b").name, "Champ de suppression inertielle");
});
