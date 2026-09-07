import { ClassicLevel } from "classic-level";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { LANGUAGES, PACKS, documentKey, packId } from "./config.mjs";
import { listFiles } from "./lib/files.mjs";
import { flattenDocument } from "./lib/foundry-pack.mjs";

const outputArgumentIndex = process.argv.indexOf("--output");
const outputArgument = outputArgumentIndex >= 0 ? process.argv[outputArgumentIndex + 1] : "packs-v14";
if (!outputArgument) throw new Error("--output requires a directory path");
const outputRoot = path.resolve(outputArgument);
await mkdir(outputRoot, { recursive: true });

for (const language of LANGUAGES) {
  for (const pack of PACKS) {
    const id = packId(language, pack.name);
    const output = path.join(outputRoot, id);
    const files = await listFiles(path.resolve("src/packs", language, `${pack.name}.db`), file => file.endsWith(".json"));
    await rm(output, { recursive: true, force: true });
    const database = new ClassicLevel(output, { keyEncoding: "utf8", valueEncoding: "json" });
    await database.open();
    const batch = database.batch();
    let records = 0;
    const keys = new Set();
    for (const file of files) {
      const document = JSON.parse(await readFile(file, "utf8"));
      const key = document._key || documentKey(pack.type, document._id);
      for (const [recordKey, value] of flattenDocument(document, key)) {
        if (keys.has(recordKey)) throw new Error(`${id}: duplicate LevelDB key ${recordKey}`);
        keys.add(recordKey);
        batch.put(recordKey, value);
        records += 1;
      }
    }
    await batch.write();
    await database.close();
    console.log(`${id}: ${files.length} source files, ${records} LevelDB records`);
  }
}
