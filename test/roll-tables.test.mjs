import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

test("paired trinket tables contain a complete d20 range", async () => {
  for (const language of ["en", "fr"]) {
    const root = path.join("generated/source-packs", language, "roll-tables.db");
    const documents = await Promise.all((await readdir(root)).map(async file => JSON.parse(await readFile(path.join(root, file), "utf8"))));
    const table = documents.find(document => document.name === (language === "en" ? "Random Trinkets" : "Babioles aléatoires"));
    const results = documents.filter(document => document._key.startsWith(`!tables.results!${table._id}.`));
    assert.equal(table.formula, "1d20");
    assert.equal(results.length, 20);
    assert.deepEqual(results.map(result => result.range[0]).sort((a, b) => a - b), Array.from({ length: 20 }, (_, index) => index + 1));
    assert.deepEqual(new Set(table.results), new Set(results.map(result => result._id)));
  }
});

test("each language provides every Core random table but no starting-equipment table", async () => {
  for (const language of ["en", "fr"]) {
    const root = path.join("generated/source-packs", language, "roll-tables.db");
    const documents = await Promise.all((await readdir(root)).map(async file => JSON.parse(await readFile(path.join(root, file), "utf8"))));
    const tables = documents.filter(document => document._key.startsWith("!tables!") && document.flags?.["fallout2d20-compendium"]?.source?.book === "core_rulebook");
    assert.equal(tables.length, 32);
    assert.ok(tables.every((table) => !/Starting Equipment|Équipement de départ|Tag Skills|atouts personnels/i.test(table.name)));
    for (const table of tables) {
      const [dice, faces] = table.formula.split("d").map(Number);
      const results = documents.filter((document) => document._key.startsWith(`!tables.results!${table._id}.`));
      const covered = new Set(results.flatMap((result) => Array.from({ length: result.range[1] - result.range[0] + 1 }, (_, index) => result.range[0] + index)));
      for (let total = dice; total <= dice * faces; total++) assert.ok(covered.has(total), `${language}/${table.name} does not cover ${total}`);
    }
  }
});

test("Errata V6 hit-location tables preserve exact d20 coverage and bilingual results", async () => {
  const expected = {
    en: {
      "Hit Locations (Quadruped)": [[1, 2, "Head"], [3, 8, "Torso"], [9, 11, "Left Front Leg"], [12, 14, "Right Front Leg"], [15, 17, "Left Hind Leg"], [18, 20, "Right Hind Leg"]],
      "Hit Locations (Flying Insect)": [[1, 2, "Head"], [3, 8, "Torso"], [9, 11, "Left Wing (as leg)"], [12, 14, "Right Wing (as leg)"], [15, 17, "Legs"], [18, 20, "Legs"]]
    },
    fr: {
      "Localisations de touche (Quadrupède)": [[1, 2, "Tête"], [3, 8, "Torse"], [9, 11, "Patte avant gauche"], [12, 14, "Patte avant droite"], [15, 17, "Patte arrière gauche"], [18, 20, "Patte arrière droite"]],
      "Localisations de touche (Insecte volant)": [[1, 2, "Tête"], [3, 8, "Torse"], [9, 11, "Aile gauche (comme une patte)"], [12, 14, "Aile droite (comme une patte)"], [15, 17, "Pattes"], [18, 20, "Pattes"]]
    }
  };
  for (const language of ["en", "fr"]) {
    const root = path.join("generated/source-packs", language, "roll-tables.db");
    const documents = await Promise.all((await readdir(root)).map(async file => JSON.parse(await readFile(path.join(root, file), "utf8"))));
    for (const [name, rows] of Object.entries(expected[language])) {
      const table = documents.find(document => document.name === name);
      assert.equal(table.formula, "1d20");
      assert.deepEqual(table.flags["fallout2d20-compendium"].source.errata, ["errata-v6-2026"]);
      assert.deepEqual(table.results.map(id => {
        const result = documents.find(document => document._id === id);
        return [...result.range, result.name];
      }), rows);
    }
  }
});

test("Random Publication recursively targets every publication issue table", async () => {
  for (const language of ["en", "fr"]) {
    const root = path.join("generated/source-packs", language, "roll-tables.db");
    const documents = await Promise.all((await readdir(root)).map(async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"))));
    const publication = documents.find((document) => document._key === `!tables!${document._id}` && document.name === (language === "en" ? "Random Publication" : "Publication aléatoire"));
    const results = documents.filter((document) => document._key.startsWith(`!tables.results!${publication._id}.`));
    const nested = results.filter((result) => result.type === "pack");
    assert.equal(nested.length, 10);
    assert.ok(nested.every((result) => result.documentCollection === `fallout2d20-compendium.${language}-roll-tables`));
    const tableIds = new Set(documents.filter((document) => document._key === `!tables!${document._id}`).map((document) => document._id));
    assert.ok(nested.every((result) => tableIds.has(result.documentId)));
  }
});
