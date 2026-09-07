import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const roots = ["ammunition", "weapons", "creatures", "npcs"];
const bleed = /(VAULT-TEC LE COMMONWEALTH|INTRODUCTION RÈGLES DU JEU|MODS? (?:RÉSERVÉS?|DES ARMES)|MOD AJOUT AU NOM|Complications des (?:armes|projectiles))/i;

function clean(value) {
  if (typeof value === "string" && bleed.test(value)) {
    const prefix = value.slice(0, value.search(bleed));
    const plain = prefix.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return `<p>${plain}</p>`;
  }
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) value[key] = clean(child);
  }
  return value;
}

let count = 0;
for (const pack of roots) {
  const directory = `src/packs/fr/${pack}.db`;
  for (const file of (await readdir(directory)).filter(file => file.endsWith(".json"))) {
    const target = path.join(directory, file);
    const document = JSON.parse(await readFile(target, "utf8"));
    const before = JSON.stringify(document);
    clean(document);
    if (JSON.stringify(document) === before) continue;
    document.flags["fallout2d20-compendium"].source.extractionBleedReviewed = true;
    await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
    count++;
  }
}
console.log(`Cleaned PDF extraction bleed from ${count} French documents.`);
