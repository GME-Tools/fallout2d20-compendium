import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  FRENCH_CORE_SUPPORT_DESCRIPTIONS as descriptions,
  FRENCH_CORE_SUPPORT_EFFECTS as effects,
  FRENCH_APPAREL_MOD_DESCRIPTION_GROUPS
} from "./data/french-core-support-descriptions.mjs";

const baseName = name => name.replace(/ \((?:Arm [123]|Main Body|Optics|Thruster|Torso)\)$/, "");
const apparelModDescriptions = Object.fromEntries(
  FRENCH_APPAREL_MOD_DESCRIPTION_GROUPS.flatMap(group => group.names.map(name => [name, group.text]))
);
descriptions["apparel-mods"] = apparelModDescriptions;

for (const pack of new Set([...Object.keys(descriptions), ...Object.keys(effects)])) {
  const english = new Map();
  for (const file of (await readdir(`src/packs/en/${pack}.db`)).filter(file => file.endsWith(".json"))) {
    const document = JSON.parse(await readFile(path.join(`src/packs/en/${pack}.db`, file), "utf8"));
    english.set(document._id, document);
  }

  let count = 0;
  for (const file of (await readdir(`src/packs/fr/${pack}.db`)).filter(file => file.endsWith(".json"))) {
    const target = path.join(`src/packs/fr/${pack}.db`, file);
    const document = JSON.parse(await readFile(target, "utf8"));
    const source = english.get(document._id);
    const base = baseName(source.name);
    const description = descriptions[pack]?.[source.name] ?? descriptions[pack]?.[base];
    const effect = effects[pack]?.[source.name] ?? effects[pack]?.[base];
    if (!description && !effect) continue;

    if (description) {
      const recipe = document.system.description.match(/\s*<section data-f2d20-recipe=["']core["']>[\s\S]*$/i)?.[0] ?? "";
      document.system.description = description + recipe;
    }
    if (effect) document.system.effect = effect;
    document.flags["fallout2d20-compendium"].source.translationReviewed = true;
    await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
    count++;
  }
  console.log(`Localized ${count} French ${pack} support records.`);
}
