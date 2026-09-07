import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID, SOURCE_ID, documentKey } from "./config.mjs";
import { slugify } from "./lib/files.mjs";

const names = JSON.parse(await readFile("catalog/v1-core-big-gun-mod-fr-names.json", "utf8"));
const sourceRoot = "src/packs/en/weapon-mods.db";
const targetRoot = "src/packs/fr/weapon-mods.db";
await mkdir(targetRoot, { recursive: true });
let count = 0;
for (const file of await readdir(sourceRoot)) {
  if (!file.endsWith(".json")) continue;
  const source = JSON.parse(await readFile(path.join(sourceRoot, file), "utf8"));
  if (source.system.weaponType !== "bigGuns") continue;
  const frenchName = names[source.name];
  if (!frenchName) throw new Error(`Missing official French Big Guns mod name: ${source.name}`);
  const document = structuredClone(source);
  document.name = frenchName;
  document.system.perks = document.system.perks.replaceAll("Gun Nut", "Fana d’armes").replaceAll("Science!", "Scientifique");
  document._key = documentKey("Item", document._id);
  document.flags[MODULE_ID].source = {
    book: SOURCE_ID, language: "fr", page: "107-110", translatedFrom: document._id,
    translationReviewed: true, errataReviewed: source.flags[MODULE_ID].source.errataReviewed ?? false
  };
  await writeFile(path.join(targetRoot, `${slugify(frenchName)}__${document._id}.json`), `${JSON.stringify(document, null, 2)}\n`);
  count++;
}
console.log(`Imported ${count} French Big Guns modifications.`);
