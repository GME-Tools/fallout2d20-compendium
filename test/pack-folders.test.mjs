import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { LANGUAGES, PACKS } from "../scripts/config.mjs";
import { folderId, folderRecords, PACK_FOLDER_DEFINITIONS } from "../scripts/data/pack-folders.mjs";
import { listFiles } from "../scripts/lib/files.mjs";

const noFolders = ["addictions", "ammunition", "crafting-stations", "diseases", "miscellany", "robot-modules", "skills", "traits"];
const expectedCounts = { apparel: 19, "apparel-mods": 22, "books-and-magazines": 11, consumables: 5, denizens: 11, perks: 12, "robot-armor": 10, "roll-tables": 13, weapons: 7, "weapon-mods": 30 };

async function rootDocuments(language, pack) {
  const files = await listFiles(path.resolve("generated/source-packs", language, `${pack}.db`), file => file.endsWith(".json"));
  const documents = await Promise.all(files.map(file => readFile(file, "utf8").then(JSON.parse)));
  return documents.filter(document => /^!(?:items|actors|tables)![^.!]+$/.test(document._key ?? ""));
}

test("only the approved packs define folders", () => {
  assert.deepEqual(Object.keys(PACK_FOLDER_DEFINITIONS).sort(), Object.keys(expectedCounts).sort());
  for (const pack of noFolders) assert.equal(PACK_FOLDER_DEFINITIONS[pack], undefined, pack);
  for (const pack of PACKS) assert.equal(folderRecords("en", pack).length, expectedCounts[pack.name] ?? 0, pack.name);
});

test("folder hierarchies are bilingual, stable and internally resolvable", () => {
  const globalIds = new Set();
  for (const pack of PACKS) {
    const definitions = PACK_FOLDER_DEFINITIONS[pack.name] ?? [];
    const keys = new Set(definitions.map(definition => definition.key));
    for (const definition of definitions) {
      if (definition.parent) assert.ok(keys.has(definition.parent), `${pack.name}/${definition.key}: unknown parent`);
      const id = folderId(pack.name, definition.key);
      assert.match(id, /^[a-f0-9]{16}$/);
      assert.ok(!globalIds.has(id), `${pack.name}/${definition.key}: duplicate ID`);
      globalIds.add(id);
    }
    const en = folderRecords("en", pack);
    const fr = folderRecords("fr", pack);
    assert.deepEqual(en.map(folder => folder._id), fr.map(folder => folder._id));
    for (const record of [...en, ...fr]) {
      assert.equal(record._key, `!folders!${record._id}`);
      assert.equal(record.type, pack.type);
      if (record.folder) assert.ok(en.some(folder => folder._id === record.folder));
    }
  }
});

test("every materialized document has its declared folder assignment", async () => {
  for (const pack of PACKS) {
    const definitions = PACK_FOLDER_DEFINITIONS[pack.name];
    const ids = new Set((definitions ?? []).map(definition => folderId(pack.name, definition.key)));
    for (const language of LANGUAGES) for (const document of await rootDocuments(language, pack.name)) {
      if (!definitions) assert.equal(document.folder, null, `${language}/${pack.name}/${document.name}`);
      else if (pack.name === "perks" && document.folder === null) continue;
      else assert.ok(ids.has(document.folder), `${language}/${pack.name}/${document.name}: unknown folder ${document.folder}`);
    }
  }
});
