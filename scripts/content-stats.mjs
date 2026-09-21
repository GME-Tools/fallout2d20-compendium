import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LANGUAGES, PACKS, documentKey } from "./config.mjs";
import { folderRecords } from "./data/pack-folders.mjs";
import { listFiles } from "./lib/files.mjs";
import { flattenDocument } from "./lib/foundry-pack.mjs";
import { collectFrenchWeightComparisons } from "./lib/french-weights.mjs";

const rootDocuments = Object.fromEntries(LANGUAGES.map(language => [language, 0]));
const rollTables = Object.fromEntries(LANGUAGES.map(language => [language, 0]));
let compiledRecords = 0;

for (const language of LANGUAGES) {
  for (const pack of PACKS) {
    const directory = path.resolve("generated/source-packs", language, `${pack.name}.db`);
    const files = await listFiles(directory, file => file.endsWith(".json"));
    compiledRecords += folderRecords(language, pack)
      .flatMap(folder => flattenDocument(folder, folder._key)).length;

    for (const file of files) {
      const document = JSON.parse(await readFile(file, "utf8"));
      if (/^!(?:items|actors|tables)![^.!]+$/.test(document._key ?? "")) {
        rootDocuments[language] += 1;
      }
      if (/^!tables![^.!]+$/.test(document._key ?? "")) rollTables[language] += 1;
      const key = document._key || documentKey(pack.type, document._id);
      compiledRecords += flattenDocument(document, key).length;
    }
  }
}

const frenchWeightFields = (await collectFrenchWeightComparisons(PACKS.map(pack => pack.name)))
  .filter(comparison => !comparison.invalidPhysicalType).length;

const stats = {
  packs: LANGUAGES.length * PACKS.length,
  rootDocuments,
  rootIdentities: Object.values(rootDocuments).reduce((sum, count) => sum + count, 0),
  compiledRecords,
  rollTables,
  frenchWeightFields
};

if (process.argv.includes("--check")) {
  const [referenceLanguage, ...otherLanguages] = LANGUAGES;
  for (const language of otherLanguages) {
    assert.equal(
      rootDocuments[language],
      rootDocuments[referenceLanguage],
      `Root document count differs between ${referenceLanguage} and ${language}`
    );
    assert.equal(
      rollTables[language],
      rollTables[referenceLanguage],
      `RollTable count differs between ${referenceLanguage} and ${language}`
    );
  }
  console.log("Verified generated-source language parity.");
} else {
  console.log(JSON.stringify(stats, null, 2));
}
