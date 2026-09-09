import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const expected = {
  "Other Found Items": { formula: "1d20", results: 8 },
  "Random Encounter Type": { formula: "1d20", results: 5 },
  "Random Ordinary Encounters": { formula: "1d20", results: 18 },
  "Random Object Encounters": { formula: "1d20", results: 9 },
  "Random Campsite Encounters": { formula: "1d20", results: 6 },
  "Random Choke Point Encounters": { formula: "1d20", results: 5 },
  "Random Factions for Animosity Encounters": { formula: "1d20", results: 9 }
};

async function documents(language) {
  const root = path.join("generated/source-packs", language, "roll-tables.db");
  return Promise.all((await readdir(root)).filter(file => file.endsWith(".json")).map(file => readFile(path.join(root, file), "utf8").then(JSON.parse)));
}

test("GM Toolkit tables have bilingual parity, complete ranges, and project-French provenance", async () => {
  const byLanguage = { en: await documents("en"), fr: await documents("fr") };
  const tableIds = {};
  for (const language of ["en", "fr"]) {
    const tables = byLanguage[language].filter(document => document._key === `!tables!${document._id}` && document.flags?.["fallout2d20-compendium"]?.source?.book === "gamemaster_toolkit");
    assert.equal(tables.length, 7);
    tableIds[language] = tables.map(table => table._id).sort();
    for (const table of tables) {
      const english = language === "en" ? table.name : Object.keys(expected)[tables.indexOf(table)];
      const contract = language === "en" ? expected[english] : expected[byLanguage.en.find(candidate => candidate._id === table._id).name];
      assert.ok(contract, `${language}/${table.name}`);
      assert.equal(table.formula, contract.formula);
      const results = byLanguage[language].filter(document => document._key.startsWith(`!tables.results!${table._id}.`));
      assert.equal(results.length, contract.results, `${language}/${table.name}`);
      assert.deepEqual(new Set(table.results), new Set(results.map(result => result._id)));
      const coverage = results.flatMap(result => Array.from({ length: result.range[1] - result.range[0] + 1 }, (_, index) => result.range[0] + index)).sort((a, b) => a - b);
      assert.deepEqual(coverage, Array.from({ length: 20 }, (_, index) => index + 1), `${language}/${table.name}`);
      assert.ok(results.every(result => result.weight === result.range[1] - result.range[0] + 1));
      const source = table.flags["fallout2d20-compendium"].source;
      assert.equal(source.edition, language === "en" ? "en-digital-2021-04-22" : "fr-project-1.1.0");
      assert.equal(source.translation, language === "en" ? "original" : "project");
    }
  }
  assert.deepEqual(tableIds.en, tableIds.fr);
});

test("GM Toolkit encounter-type links resolve within each language", async () => {
  for (const language of ["en", "fr"]) {
    const all = await documents(language);
    const table = all.find(document => document._key === `!tables!${document._id}` && document.name === (language === "en" ? "Random Encounter Type" : "Type de rencontre aléatoire"));
    const results = all.filter(document => document._key.startsWith(`!tables.results!${table._id}.`));
    const tableIds = new Set(all.filter(document => document._key === `!tables!${document._id}`).map(document => document._id));
    for (const result of results) {
      const match = result.description.match(new RegExp(`Compendium\\.fallout2d20-compendium\\.${language}-roll-tables\\.RollTable\\.([A-Za-z0-9]{16})`));
      assert.ok(match, `${language}/${result.name}: missing local table link`);
      assert.ok(tableIds.has(match[1]), `${language}/${result.name}: unresolved ${match[1]}`);
    }
  }
});
