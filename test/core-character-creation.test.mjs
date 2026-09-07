import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const catalog = JSON.parse(await readFile("catalog/v1-core-character-creation.json", "utf8"));
const names = JSON.parse(await readFile("catalog/v1-core-perk-fr-names.json", "utf8"));
const moduleId = "fallout2d20-compendium";

async function documents(language, pack) {
  const root = path.join("src", "packs", language, `${pack}.db`);
  return Promise.all((await readdir(root)).filter((file) => file.endsWith(".json")).map(async (file) =>
    JSON.parse(await readFile(path.join(root, file), "utf8"))
  ));
}

test("Core character-creation inventory is exact and reviewed in both languages", async () => {
  for (const [pack, definition] of Object.entries(catalog.categories)) {
    const en = await documents("en", definition.pack);
    const selectedEn = pack === "perks" ? en.filter((document) => definition.entries.includes(document.name)) : en;
    assert.deepEqual(selectedEn.map((document) => document.name).sort(), [...definition.entries].sort());
    const fr = new Map((await documents("fr", definition.pack)).map((document) => [document._id, document]));
    for (const source of selectedEn) {
      const translated = fr.get(source._id);
      assert.ok(translated, `${pack}/${source.name}: missing French document`);
      for (const document of [source, translated]) {
        const review = document.flags[moduleId].source;
        assert.equal(review.coreCharacterCreationReviewed, true, `${document.name}: source review pending`);
        assert.equal(review.errataReviewed, true, `${document.name}: errata review pending`);
        assert.ok(document.system.description.replace(/<[^>]+>/g, "").trim().length >= 20, `${document.name}: incomplete description`);
      }
      assert.equal(translated.flags[moduleId].source.translationReviewed, true, `${translated.name}: translation review pending`);
      assert.equal(translated.flags[moduleId].source.structuralBaseline, false);
      if (pack === "perks") {
        assert.equal(translated.name, names[source.name]);
        for (const property of ["rank", "requirements", "requirementsEx"])
          assert.deepEqual(translated.system[property], source.system[property], `${translated.name}: changed ${property}`);
      }
    }
  }
});

test("all French character-perk dice symbols lost by PDF extraction are restored", async () => {
  const expected = { Blitz:1,"Résistance chimique":1,Compréhension:1,"Tir groupé":1,"Dénicheur de trésors":3,Pistolero:1,"Boyaux plombés":1,"Marchand de sable":1,"Mystérieux Étranger":1,"Rage de nerd !":3,Ninja:1,Pyromane:1,Fusilier:1,Farfouilleur:3,"La taille compte":1 };
  const perks = await documents("fr", "perks");
  for (const [name, count] of Object.entries(expected)) {
    const document = perks.find((entry) => entry.name === name);
    assert.ok(document, name);
    assert.equal(document.system.description.match(/@fos\[DC\]/g)?.length ?? 0, count, name);
    assert.equal(document.flags[moduleId].source.diceSymbolsReviewed, true, name);
  }
});

test("character-creation errata and known extraction defects are applied", async () => {
  const perks = new Map((await documents("en", "perks")).map((document) => [document.name, document]));
  const traits = new Map((await documents("en", "traits")).map((document) => [document.name, document]));
  assert.equal(perks.get("Armorer").system.requirementsEx.levelIncrease, 4);
  assert.equal(perks.get("Gun Nut").system.rank.max, 4);
  assert.match(perks.get("Barbarian").system.description, /physical and energy Damage Resistance/);
  assert.match(traits.get("Vault Kid").system.description, /reduce the difficulty of all END tests.*by 1, to a minimum of 0/s);
  assert.doesNotMatch(perks.get("Fortune Finder").system.description, /DCD|CCD/);
  assert.doesNotMatch(perks.get("Scrounger").system.description, /DCD|CCD/);
});
