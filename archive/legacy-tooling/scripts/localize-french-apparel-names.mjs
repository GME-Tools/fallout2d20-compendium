import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID } from "./config.mjs";
import { slugify } from "./lib/files.mjs";

const root = "src/packs/fr/apparel.db";
const exact = {
  "Armor Frame": "Châssis d’armure", "Army Helmet": "Casque militaire",
  "Brotherhood of Steel Fatigues": "Treillis de la Confrérie de l’Acier", "Brotherhood of Steel Hood": "Capuche de la Confrérie de l’Acier",
  "Brotherhood of Steel Uniform": "Uniforme de la Confrérie de l’Acier", "Brotherhood Scribe's Armor": "Armure de scribe de la Confrérie",
  "Brotherhood Scribe's Hat": "Chapeau de scribe de la Confrérie", "Cage Armor": "Armure-cage",
  "Casual Clothing": "Vêtements décontractés", "Casual Hat": "Chapeau décontracté", "Dog Helmet": "Casque pour chien",
  "Drifter Outfit": "Tenue de vagabond", "Engineer's Armor": "Armure d’ingénieur", "Formal Clothing": "Vêtements élégants",
  "Formal Hat": "Chapeau élégant", "Gas Mask": "Masque à gaz", "Hard Hat": "Casque de chantier", "Harness": "Harnais",
  "Hazmat Suit": "Combinaison antiradiations", "Heavy Coat": "Manteau épais", "Hides": "Peaux", "Hood or Cowl": "Capuche ou cagoule",
  "Lab Coat": "Blouse de laboratoire", "Military Fatigues": "Treillis militaire", "Road Leathers": "Cuirs de route",
  "Sack Hood": "Cagoule en sac", "Spike Armor": "Armure à pointes", "Tough Clothing": "Vêtements résistants",
  "Utility Coveralls": "Combinaison utilitaire", "Vault Jumpsuit": "Combinaison d’Abri", "Welder's Visor": "Visière de soudeur"
};

function localize(name) {
  if (exact[name]) return exact[name];
  let result = name
    .replace("Vault-Tec Security Armor (Complete)", "Armure complète de sécurité Vault-Tec")
    .replace("Vault-Tec Security Armor", "Armure de sécurité Vault-Tec").replace("Vault-Tec Security Helmet", "Casque de sécurité Vault-Tec")
    .replace("Heavy Dog Armor", "Armure lourde pour chien").replace("Medium Dog Armor", "Armure moyenne pour chien").replace("Light Dog Armor", "Armure légère pour chien")
    .replace(/^Heavy /, "Armure lourde ").replace(/^Sturdy /, "Armure renforcée ")
    .replace("Combat Armor", "de combat").replace("Combat ", "de combat ")
    .replace("Leather Armor", "de cuir").replace("Leather ", "de cuir ")
    .replace("Metal Armor", "de métal").replace("Metal ", "de métal ")
    .replace("Raider Armor", "de pillard").replace("Raider ", "de pillard ")
    .replace("Synth Armor", "de synthétique").replace("Synth ", "de synthétique ")
    .replace("Chest Piece", "Plastron").replace("Helmet", "Casque").replace("Helm", "Casque")
    .replace("Left Arm", "Bras gauche").replace("Right Arm", "Bras droit").replace("Left Leg", "Jambe gauche").replace("Right Leg", "Jambe droite");
  if (/^(T-(?:45|51|60)|X-01) /.test(result)) result = result.replace(/^([^ ]+) (.+)$/, "$2 d’armure assistée $1");
  return result.replace(/^Armure lourde de /, "Armure lourde de ").replace(/^Armure renforcée de /, "Armure renforcée de ");
}

for (const file of (await readdir(root)).filter(file => file.endsWith(".json"))) {
  const oldPath = path.join(root, file);
  const document = JSON.parse(await readFile(oldPath, "utf8"));
  const original = document.name;
  document.name = localize(original);
  if (document.name === original) throw new Error(`Untranslated apparel name: ${original}`);
  const provenance = document.flags[MODULE_ID].source;
  provenance.structuralBaseline = false;
  provenance.nameTranslationReviewed = true;
  provenance.translationReviewed = false;
  await writeFile(oldPath, `${JSON.stringify(document, null, 2)}\n`);
  const newPath = path.join(root, `${slugify(document.name)}__${document._id}.json`);
  if (newPath !== oldPath) await rename(oldPath, newPath);
}
console.log("Localized all French apparel names; descriptions remain pending editorial review.");
