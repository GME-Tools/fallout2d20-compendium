import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ClassicLevel } from "classic-level";
import { LANGUAGES, PACKS, documentKey, packId } from "./config.mjs";
import { listFiles } from "./lib/files.mjs";
import { flattenDocument } from "./lib/foundry-pack.mjs";
import { folderRecords } from "./data/pack-folders.mjs";

let records = 0;
for (const language of LANGUAGES) {
  for (const pack of PACKS) {
    const sourceFiles = await listFiles(path.resolve("generated/source-packs", language, `${pack.name}.db`), file => file.endsWith(".json"));
    const expected = new Map();
    for (const folder of folderRecords(language, pack)) {
      for (const [recordKey, value] of flattenDocument(folder, folder._key)) {
        assert(!expected.has(recordKey), `${language}/${pack.name}: duplicate expected folder key ${recordKey}`);
        expected.set(recordKey, value);
      }
    }
    for (const file of sourceFiles) {
      const sourceDocument = JSON.parse(await readFile(file, "utf8"));
      const document = sourceDocument;
      const key = document._key || documentKey(pack.type, document._id);
      for (const [recordKey, value] of flattenDocument(document, key)) {
        assert(!expected.has(recordKey), `${language}/${pack.name}: duplicate source LevelDB key ${recordKey}`);
        expected.set(recordKey, value);
      }
    }

    const database = new ClassicLevel(path.resolve("packs", packId(language, pack.name)), {
      keyEncoding: "utf8",
      valueEncoding: "json",
      readOnly: true
    });
    await database.open();
    const actual = new Map();
    for await (const [key, value] of database.iterator()) actual.set(key, value);
    await database.close();

    assert.deepEqual(actual, expected, `${language}/${pack.name}: compiled LevelDB differs from its readable sources`);
    records += actual.size;
  }
}

console.log(`Verified ${records} records in ${LANGUAGES.length * PACKS.length} Foundry v14 LevelDB packs.`);
