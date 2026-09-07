import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID, PACKS, packId } from "./config.mjs";

async function load(language, pack) {
  const root = path.join("src", "packs", language, `${pack}.db`);
  return Promise.all((await readdir(root)).filter((file) => file.endsWith(".json")).map(async (file) => ({
    file: path.join(root, file),
    document: JSON.parse(await readFile(path.join(root, file), "utf8"))
  })));
}

const uuid = (language, pack, type, id) => `Compendium.${MODULE_ID}.${packId(language, pack)}.${type}.${id}`;
const legacyPacks = { skills:"skills", apparel_mods:"apparel-mods", weapon_mods:"weapon-mods", books_and_magz:"books-and-magazines", perks:"perks" };

function relinkLegacyReferences(value, language, ids, counter) {
  if (typeof value === "string") {
    value = value.replace(/Compendium\.fallout2d20-compendium\.(en|fr)-([A-Za-z0-9-]+)\.(Item|Actor|RollTable)\.([A-Za-z0-9]+)/g, (match, linkedLanguage, pack, type, id) => {
      if (linkedLanguage === language) return match;
      if (!ids.get(pack)?.has(id)) throw new Error(`${language}: unresolved cross-language reference ${match}`);
      counter.value++;
      return uuid(language, pack, type, id);
    });
    return value.replace(/Compendium\.fallout\.(skills|apparel_mods|weapon_mods|books_and_magz|perks)(?:\.Item)?\.([A-Za-z0-9]+)/g, (match, legacyPack, id) => {
      const pack = legacyPacks[legacyPack];
      if (!ids.get(pack).has(id)) throw new Error(`${language}: unresolved legacy reference ${match}`);
      counter.value++;
      return uuid(language, pack, "Item", id);
    });
  }
  if (Array.isArray(value)) return value.map((entry) => relinkLegacyReferences(entry, language, ids, counter));
  if (value && typeof value === "object") for (const [key, entry] of Object.entries(value)) value[key] = relinkLegacyReferences(entry, language, ids, counter);
  return value;
}

for (const language of ["en", "fr"]) {
  const perks = await load(language, "perks");
  const magazines = await load(language, "books-and-magazines");
  const perksByName = new Map(perks.map((entry) => [entry.document.name, entry]));
  const magazinesByName = new Map(magazines.map((entry) => [entry.document.name, entry]));
  let pairs = 0;

  for (const magazine of magazines) {
    const perk = perksByName.get(magazine.document.name);
    if (!perk) throw new Error(`${language}/${magazine.document.name}: matching magazine perk not found`);
    const perkUuid = uuid(language, "perks", "Item", perk.document._id);
    const label = language === "fr" ? "Fiche d’aptitude associée" : "Associated perk document";
    const section = `<section data-f2d20-links="core"><p><strong>${label}:</strong> @UUID[${perkUuid}]{${perk.document.name}}</p></section>`;
    const description = magazine.document.system.description
      .replace(/<section data-f2d20-links="core">[\s\S]*?<\/section>/g, "")
      .replace(/Compendium\.fallout\.perks\.Item\.[A-Za-z0-9]+/g, perkUuid)
      .trim();
    magazine.document.system.description = description.includes(`@UUID[${perkUuid}]`) ? description : `${description}\n${section}`;
    magazine.document.flags[MODULE_ID].source.uuidLinksReviewed = true;
    await writeFile(magazine.file, `${JSON.stringify(magazine.document, null, 2)}\n`);
    pairs++;
  }

  for (const perk of perks) {
    if (!magazinesByName.has(perk.document.name)) continue;
    const magazine = magazinesByName.get(perk.document.name);
    perk.document.system.requirementsEx.magazineUuids = [uuid(language, "books-and-magazines", "Item", magazine.document._id)];
    perk.document.flags[MODULE_ID].source.uuidLinksReviewed = true;
    perk.document.flags[MODULE_ID].source.magazineAutomationReviewed = true;
    await writeFile(perk.file, `${JSON.stringify(perk.document, null, 2)}\n`);
  }

  const weapons = await load(language, "weapons");
  const mods = new Map((await load(language, "weapon-mods")).map((entry) => [entry.document._id, entry.document]));
  let weaponLinks = 0;
  for (const weapon of weapons) {
    const original = weapon.document.system.mods?.list ?? "";
    const linked = original.replace(/Compendium\.fallout\.weapon_mods\.Item\.([A-Za-z0-9]+)/g, (match, id) => {
      if (!mods.has(id)) throw new Error(`${language}/${weapon.document.name}: missing local weapon mod ${id}`);
      weaponLinks++;
      return uuid(language, "weapon-mods", "Item", id);
    });
    if (linked === original) continue;
    weapon.document.system.mods.list = linked;
    weapon.document.flags[MODULE_ID].source.uuidLinksReviewed = true;
    await writeFile(weapon.file, `${JSON.stringify(weapon.document, null, 2)}\n`);
  }
  const allPacks = new Map();
  for (const pack of PACKS) allPacks.set(pack.name, await load(language, pack.name));
  const ids = new Map([...allPacks].map(([pack, entries]) => [pack, new Set(entries.map((entry) => entry.document._id))]));
  const legacyLinks = { value:0 };
  for (const entries of allPacks.values()) for (const entry of entries) {
    const before = JSON.stringify(entry.document);
    relinkLegacyReferences(entry.document, language, ids, legacyLinks);
    if (JSON.stringify(entry.document) !== before) await writeFile(entry.file, `${JSON.stringify(entry.document, null, 2)}\n`);
  }
  console.log(`Linked ${pairs} magazine/perk pairs, ${weaponLinks} weapon-mod descriptions, and ${legacyLinks.value} legacy source references in ${language}.`);
}
