import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID } from "./config.mjs";

const catalog = JSON.parse(await readFile("catalog/v1-core-character-creation.json", "utf8"));
const frenchPerkNames = JSON.parse(await readFile("catalog/v1-core-perk-fr-names.json", "utf8"));
const characterPerks = new Set(catalog.categories.perks.entries);
const frenchCharacterPerks = new Set(Object.values(frenchPerkNames));

const fixes = {
  en: {
    "Fortune Finder": [["+3DCD", "+3 CD"], ["+6DCD", "+6 CD"]],
    Scrounger: [["+3CD", "+3 CD"], ["+6CCD", "+6 CD"]]
  },
  fr: {
    Blitz: [["cette attaque inflige +1 de dégâts", "cette attaque inflige +1 @fos[DC] de dégâts"]],
    "Résistance chimique": [["jetez 1 de moins", "jetez 1 @fos[DC] de moins"]],
    Compréhension: [["jetez 1 .", "jetez 1 @fos[DC]."]],
    "Tir groupé": [["relancer jusqu’à 3 de votre jet", "relancer jusqu’à 3 @fos[DC] de votre jet"]],
    "Dénicheur de trésors": [
      ["+3 supplémentaires de capsules", "+3 @fos[DC] supplémentaires de capsules"],
      ["+6 supplémentaires de capsules", "+6 @fos[DC] supplémentaires de capsules"],
      ["+10 supplémentaires de capsules", "+10 @fos[DC] supplémentaires de capsules"]
    ],
    Pistolero: [["ajoutez +1 aux dégâts", "ajoutez +1 @fos[DC] aux dégâts"]],
    "Boyaux plombés": [["relancer le qui détermine", "relancer le @fos[DC] qui détermine"]],
    "Marchand de sable": [["ajoutez +2 aux dégâts", "ajoutez +2 @fos[DC] aux dégâts"]],
    "Mystérieux Étranger": [
      ["Il lance toujours 3d20 pour son attaque, qu’il exécute", "Il lance toujours 3d20 pour son attaque, au lieu des 2d20 habituels, et l’exécute"],
      ["elle inflige 8 de dégâts", "elle inflige 8 @fos[DC] de dégâts"]
    ],
    "Rage de nerd !": [
      ["+1 aux dégâts de toutes vos attaques", "+1 @fos[DC] aux dégâts de toutes vos attaques"],
      ["+2 RD et +2 .", "+2 RD et +2 @fos[DC]."],
      ["+3 RD et +3 .", "+3 RD et +3 @fos[DC]."]
    ],
    Ninja: [["ajoutez +2 aux dégâts", "ajoutez +2 @fos[DC] aux dégâts"]],
    Pyromane: [["ajoutez +1 aux dégâts", "ajoutez +1 @fos[DC] aux dégâts"]],
    Fusilier: [["ajoutez +1 aux dégâts", "ajoutez +1 @fos[DC] aux dégâts"]],
    Farfouilleur: [
      ["+3 supplémentaires de munitions", "+3 @fos[DC] supplémentaires de munitions"],
      ["+6 supplémentaires de munitions", "+6 @fos[DC] supplémentaires de munitions"],
      ["+10 supplémentaires de munitions", "+10 @fos[DC] supplémentaires de munitions"]
    ],
    "La taille compte": [["ajoutez +1 aux dégâts", "ajoutez +1 @fos[DC] aux dégâts"]]
  }
};

function replaceRequired(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`${label}: expected source fragment not found: ${from}`);
  return text.replace(from, to);
}

let reviewed = 0;
for (const language of ["en", "fr"]) for (const category of ["skills", "traits", "perks"]) {
  const root = path.join("src", "packs", language, `${category}.db`);
  for (const file of (await readdir(root)).filter((entry) => entry.endsWith(".json"))) {
    const target = path.join(root, file);
    const document = JSON.parse(await readFile(target, "utf8"));
    const selected = category !== "perks" || (language === "en" ? characterPerks.has(document.name) : frenchCharacterPerks.has(document.name));
    if (!selected) continue;
    for (const [from, to] of fixes[language]?.[document.name] ?? []) {
      if (from === to) continue;
      document.system.description = replaceRequired(document.system.description, from, to, `${language}/${document.name}`);
    }
    const source = document.flags[MODULE_ID].source;
    source.page = catalog.categories[category].pages;
    source.errataReviewed = true;
    source.coreCharacterCreationReviewed = true;
    if (language === "fr") {
      source.translationReviewed = true;
      source.diceSymbolsReviewed = true;
      source.structuralBaseline = false;
    }
    await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
    reviewed++;
  }
}

console.log(`Reviewed ${reviewed} bilingual Core character-creation documents.`);
