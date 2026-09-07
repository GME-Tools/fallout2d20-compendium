import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ammunitionNames = JSON.parse(await readFile("catalog/v1-core-ammunition-fr-names.json", "utf8"));
let changed = 0;

const localize = (value) => ammunitionNames[value] ?? value;

for (const pack of ["weapons", "weapon-mods"]) {
  const root = path.join("src", "packs", "fr", `${pack}.db`);
  for (const filename of (await readdir(root)).filter((file) => file.endsWith(".json"))) {
    const file = path.join(root, filename);
    const document = JSON.parse(await readFile(file, "utf8"));
    const before = JSON.stringify(document);
    if (document.system?.ammo) document.system.ammo = localize(document.system.ammo);
    if (document.system?.modEffects?.ammo) document.system.modEffects.ammo = localize(document.system.modEffects.ammo);
    for (const embedded of Object.values(document.system?.mods ?? {})) {
      if (embedded.system?.modEffects?.ammo) embedded.system.modEffects.ammo = localize(embedded.system.modEffects.ammo);
    }
    if (JSON.stringify(document) === before) continue;
    await writeFile(file, `${JSON.stringify(document, null, 2)}\n`);
    changed++;
  }
}

console.log(`Localized ammunition references in ${changed} French weapon or modification document(s).`);
