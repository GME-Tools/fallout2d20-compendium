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
    compiledRecords += folderRecords(language, pack).flatMap(folder => flattenDocument(folder, folder._key)).length;
    for (const file of files) {
      const document = JSON.parse(await readFile(file, "utf8"));
      if (/^!(?:items|actors|tables)![^.!]+$/.test(document._key ?? "")) rootDocuments[language] += 1;
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
  rootIdentities: rootDocuments.en + rootDocuments.fr,
  compiledRecords,
  rollTables,
  frenchWeightFields
};

if (process.argv.includes("--check")) {
  const state = await readFile("docs/STATE.md", "utf8");
  const expectations = [
    [`${stats.packs} categorical bilingual packs`, "pack count"],
    [`${stats.rootDocuments.en.toLocaleString("en-US")} root documents per language; ${stats.rootIdentities.toLocaleString("en-US")} total`, "root document counts"],
    [`${stats.compiledRecords.toLocaleString("en-US")} compiled LevelDB records`, "compiled record count"],
    [`${stats.rollTables.en} RollTables per language`, "RollTable count"],
    [`${stats.frenchWeightFields.toLocaleString("en-US")} audited French weight/capacity fields`, "French weight count"]
  ];
  for (const [expected, label] of expectations) assert.ok(state.includes(expected), `docs/STATE.md ${label} is stale; expected ${JSON.stringify(expected)}`);
  console.log("Verified docs/STATE.md statistics against generated sources.");
} else {
  console.log(JSON.stringify(stats, null, 2));
}
