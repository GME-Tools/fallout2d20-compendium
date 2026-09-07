import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID, SOURCE_ID, documentKey } from "./config.mjs";
import { slugify } from "./lib/files.mjs";

const legacyPath = "lang/packs/fr/fallout.skills.json";
const raw = await readFile(legacyPath, "utf8");
const legacy = JSON.parse(raw.replace(/,\s*([}\]])/g, "$1"));
const translations = new Map(legacy.entries.map(entry => [entry.id, entry]));
const englishRoot = "src/packs/en/skills.db";
const frenchRoot = "src/packs/fr/skills.db";
await rm(frenchRoot, { recursive: true, force: true });
await mkdir(frenchRoot, { recursive: true });

let imported = 0;
for (const filename of (await readdir(englishRoot)).filter(file => file.endsWith(".json")).sort()) {
  const document = JSON.parse(await readFile(path.join(englishRoot, filename), "utf8"));
  const translation = translations.get(document.name);
  if (!translation) throw new Error(`Missing French skill translation for ${document.name}`);
  document.name = translation.name;
  document.system.description = translation.description;
  document._key = documentKey("Item", document._id);
  document.flags[MODULE_ID].source = {
    book: SOURCE_ID,
    language: "fr",
    page: document.flags[MODULE_ID].source.page ?? "44-46",
    translatedFrom: document._id,
    translationReviewed: false,
    errataReviewed: document.flags[MODULE_ID].source.errataReviewed ?? false,
    ...(document.flags[MODULE_ID].source.errata ? { errata: document.flags[MODULE_ID].source.errata } : {})
  };
  const target = path.join(frenchRoot, `${slugify(document.name)}__${document._id}.json`);
  await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
  imported++;
}
console.log(`Imported ${imported} French skills.`);
