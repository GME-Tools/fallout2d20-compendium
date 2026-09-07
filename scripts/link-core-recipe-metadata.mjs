import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID, packId } from "./config.mjs";

async function load(language, pack) {
  const root = path.join("src", "packs", language, `${pack}.db`);
  const entries = [];
  for (const filename of (await readdir(root)).filter((file) => file.endsWith(".json"))) {
    const file = path.join(root, filename);
    const document = JSON.parse(await readFile(file, "utf8"));
    if (document._key !== `!items!${document._id}`) continue;
    entries.push({ file, document });
  }
  return entries;
}

for (const language of ["en", "fr"]) {
  const replacements = [];
  for (const pack of ["crafting-stations", "skills", "perks"]) {
    for (const { document } of await load(language, pack)) {
      const uuid = `Compendium.${MODULE_ID}.${packId(language, pack)}.Item.${document._id}`;
      replacements.push([document.name, `@UUID[${uuid}]{${document.name}}`]);
    }
  }
  replacements.sort(([left], [right]) => right.length - left.length);

  let changed = 0;
  for (const pack of ["ammunition", "weapons", "weapon-mods", "apparel", "apparel-mods", "robot-armor", "robot-modules", "consumables", "miscellany"]) {
    for (const entry of await load(language, pack)) {
      const description = entry.document.system?.description;
      if (!description?.includes("data-f2d20-") || !description.includes("recipe")) continue;
      const updated = description.replace(/<section data-f2d20-(?:weapon-)?recipes?="core">[\s\S]*?<\/section>/g, (matched) => {
        let section = matched;
        for (const [name, link] of replacements) {
          const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          section = section.replace(new RegExp(`(?<=>|, | - )${escaped}(?= \\d+|,|<)`, "g"), link);
        }
        return section;
      });
      if (updated === description) continue;
      entry.document.system.description = updated;
      await writeFile(entry.file, `${JSON.stringify(entry.document, null, 2)}\n`);
      changed++;
    }
  }
  console.log(`Linked station, skill, and perk recipe metadata in ${changed} ${language} document(s).`);
}
