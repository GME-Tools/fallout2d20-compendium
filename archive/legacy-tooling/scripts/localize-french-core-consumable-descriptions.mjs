import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { FRENCH_CORE_CONSUMABLE_DESCRIPTIONS as descriptions } from "./data/french-core-consumable-descriptions.mjs";
import { FRENCH_CORE_CONSUMABLE_DESCRIPTION_SUPPLEMENTS as supplements } from "./data/french-core-consumable-description-supplements.mjs";
import { FRENCH_CORE_CONSUMABLE_EFFECTS as effects } from "./data/french-core-consumable-effects.mjs";

const english = new Map();
for (const file of (await readdir("src/packs/en/consumables.db")).filter(file => file.endsWith(".json"))) {
  const document = JSON.parse(await readFile(path.join("src/packs/en/consumables.db", file), "utf8"));
  english.set(document._id, document);
}

let count = 0;
for (const file of (await readdir("src/packs/fr/consumables.db")).filter(file => file.endsWith(".json"))) {
  const target = path.join("src/packs/fr/consumables.db", file);
  const document = JSON.parse(await readFile(target, "utf8"));
  const source = english.get(document._id);
  const description = descriptions[source.name] ?? supplements[source.name];
  const hasEffect = Object.hasOwn(effects, source.name);
  if (!description && !hasEffect) continue;

  if (description) {
    const recipe = document.system.description.match(/\s*<section data-f2d20-recipe=["']core["']>[\s\S]*$/i)?.[0] ?? "";
    document.system.description = description + recipe;
  }
  if (hasEffect) document.system.effect = effects[source.name];
  document.flags["fallout2d20-compendium"].source.translationReviewed = true;
  await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
  count++;
}
console.log(`Localized ${count} French consumable records.`);
