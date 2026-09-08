import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { FRENCH_CORE_EMBEDDED_NAMES as names } from "./data/french-core-embedded-names.mjs";
import { FRENCH_CORE_SPECIAL_ABILITY_TEXTS as texts } from "./data/french-core-special-ability-texts.mjs";

const p = text => `<p>${text}</p>`;
const effects = {
  Butchery:p("Les récupérateurs peuvent dépecer une [créature] morte avec un test d’END + Survie de difficulté 0 réussi. Ils obtiennent 1 portion de viande de [créature] et 1 matériau peu commun."),
  Inventory:p("Le corps d’une goule morte contient 2 @fos[DC] objets de bric-à-brac, récupérables normalement."),
  Salvage:p("Les récupérateurs peuvent démonter une [créature] détruite avec un test d’INT + Sciences de difficulté 1 réussi. Ils obtiennent 3 @fos[DC] cellules à fusion, +1 @fos[DC] par PA dépensé, et 1 matériau peu commun par Effet obtenu."),
  Scavenging:p("À la mort de la [créature], lancez 4d20 pour déterminer les capsules trouvées, puis 4 @fos[DC] et effectuez un jet sur la table de bric-à-brac aléatoire par Effet obtenu. À la discrétion du MJ, son corps ou repaire contient aussi jusqu’à trois armes et 3d20 munitions adaptées.")
};

const enDir = "src/packs/en/creature-abilities.db";
const frDir = "src/packs/fr/creature-abilities.db";
const english = new Map();
for (const file of (await readdir(enDir)).filter(file => file.endsWith(".json"))) {
  const document = JSON.parse(await readFile(path.join(enDir, file), "utf8"));
  english.set(document._id, document);
}

let count = 0;
for (const file of (await readdir(frDir)).filter(file => file.endsWith(".json"))) {
  const target = path.join(frDir, file);
  const document = JSON.parse(await readFile(target, "utf8"));
  const source = english.get(document._id);
  const name = names[source?.type]?.[source?.name];
  if (!name) throw new Error(`${source?.type}/${source?.name}: missing French creature-ability name`);
  document.name = name;
  if (source.type === "special_ability" && (source.system?.description ?? "").trim()) {
    const description = texts[source.name];
    if (!description) throw new Error(`${source.name}: missing French creature-ability description`);
    document.system.description = description;
  }
  if (effects[source.name]) document.system.effect = effects[source.name];
  document.flags["fallout2d20-compendium"].source.translationReviewed = true;
  await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
  count++;
}
console.log(`Localized ${count} standalone French creature abilities.`);
