import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID, SOURCE_ID, documentKey } from "./config.mjs";
import { slugify } from "./lib/files.mjs";

const packs = [
  ["apparel", "Item"], ["apparel-mods", "Item"], ["robot-armor", "Item"],
  ["robot-modules", "Item"], ["consumables", "Item"], ["addictions", "Item"],
  ["diseases", "Item"], ["books-and-magazines", "Item"], ["miscellany", "Item"],
  ["creature-abilities", "Item"], ["creatures", "Actor"], ["npcs", "Actor"]
];

for (const [pack, type] of packs) {
  const sourceRoot = path.join("src/packs/en", `${pack}.db`);
  const targetRoot = path.join("src/packs/fr", `${pack}.db`);
  await rm(targetRoot, { recursive: true, force: true });
  await mkdir(targetRoot, { recursive: true });
  let count = 0;
  for (const file of (await readdir(sourceRoot)).filter(file => file.endsWith(".json"))) {
    const source = JSON.parse(await readFile(path.join(sourceRoot, file), "utf8"));
    const document = structuredClone(source);
    document._key = documentKey(type, document._id);
    document.flags ??= {};
    document.flags[MODULE_ID] = {
      ...(document.flags[MODULE_ID] ?? {}),
      source: {
        book: SOURCE_ID,
        language: "fr",
        translatedFrom: document._id,
        structuralBaseline: true,
        importedFromLegacy: source.flags?.[MODULE_ID]?.source?.importedFromLegacy ?? false,
        translationReviewed: false,
        diceSymbolsReviewed: false,
        errataReviewed: false
      }
    };
    await writeFile(path.join(targetRoot, `${slugify(document.name)}__${document._id}.json`), `${JSON.stringify(document, null, 2)}\n`);
    count++;
  }
  console.log(`${pack}: seeded ${count} structurally paired French documents.`);
}
