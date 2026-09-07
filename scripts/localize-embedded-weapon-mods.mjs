import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const modRoot = "src/packs/fr/weapon-mods.db";
const weaponRoot = "src/packs/fr/weapons.db";
const translated = new Map();
for (const file of await readdir(modRoot)) {
  if (!file.endsWith(".json")) continue;
  const mod = JSON.parse(await readFile(path.join(modRoot, file), "utf8"));
  translated.set(mod._id, mod);
}
let changed = 0;
for (const file of await readdir(weaponRoot)) {
  if (!file.endsWith(".json")) continue;
  const target = path.join(weaponRoot, file);
  const weapon = JSON.parse(await readFile(target, "utf8"));
  let dirty = false;
  for (const embedded of Object.values(weapon.system.mods ?? {})) {
    const localized = translated.get(embedded._id);
    if (!localized) continue;
    embedded.name = localized.name;
    embedded.system.namePrefix = localized.system.namePrefix;
    embedded.system.perks = localized.system.perks;
    dirty = true;
  }
  if (dirty) {
    await writeFile(target, `${JSON.stringify(weapon, null, 2)}\n`);
    changed++;
  }
}
console.log(`Localized embedded modifications in ${changed} French weapons.`);
