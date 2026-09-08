import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artworkNames = {
  "Berserk Syringe": "Berserk", "Bleed-Out Syringe": "Bleedout", "Bloatfly Larva Syringe": "Bloatfly Larvae",
  "Endangerol Syringe": "Endangerol", "Lock Joint Syringe": "Lock Joint", "Mind Cloud Syringe": "Mind Cloud",
  "Pax Syringe": "Pax", "Radscorpion Venom Syringe": "Radscorpion Venom", "Yellow Belly Syringe": "Yellow Belly"
};
const definitions = [
  ["SyrBerserkAmmo01", "Berserk Syringe", "Seringue frénétique", 50,
    "If one or more Effects are rolled for the weapon's damage, the target becomes frenzied and berserk, attacking the nearest living creature (friend or foe) for the remainder of the scene.",
    "Si un ou plusieurs Effets sont obtenus sur les dégâts de l’arme, la cible devient frénétique et attaque la créature vivante la plus proche, alliée ou ennemie, jusqu’à la fin de la scène."],
  ["SyrBleedOutAmmo1", "Bleed-Out Syringe", "Seringue hémorragique", 17,
    "The weapon gains the Persistent damage effect.", "L’arme gagne l’effet de dégâts Persistants."],
  ["SyrBloatflyAmmo1", "Bloatfly Larva Syringe", "Seringue à larve de mouche bouffie", 10,
    "If one or more Effects are rolled for the weapon's damage, a Bloatfly emerges from the target's remains when it dies.",
    "Si un ou plusieurs Effets sont obtenus sur les dégâts de l’arme, une mouche bouffie émerge des restes de la cible lorsqu’elle meurt."],
  ["SyrEndangerolA01", "Endangerol Syringe", "Seringue d’Endangerol", 60,
    "If one or more Effects are rolled for the weapon's damage, the target's Physical damage resistance is reduced by 2 for the remainder of the scene.",
    "Si un ou plusieurs Effets sont obtenus sur les dégâts de l’arme, la résistance aux dégâts physiques de la cible est réduite de 2 jusqu’à la fin de la scène."],
  ["SyrLockJointAm01", "Lock Joint Syringe", "Seringue bloque-articulation", 40,
    "The weapon gains the Stun damage effect.", "L’arme gagne l’effet de dégâts Étourdissants."],
  ["SyrMindCloudAm01", "Mind Cloud Syringe", "Seringue de confusion", 73,
    "If one or more Effects are rolled, the target adds +2 difficulty to all PER tests for a number of rounds equal to the number of Effects rolled.",
    "Si un ou plusieurs Effets sont obtenus, la difficulté de tous les tests de PER de la cible augmente de +2 pendant un nombre de rounds égal au nombre d’Effets obtenus."],
  ["SyrPaxAmmo000001", "Pax Syringe", "Seringue Pax", 39,
    "If one or more Effects are rolled, the target cannot take hostile or aggressive actions for a number of rounds equal to the number of Effects rolled.",
    "Si un ou plusieurs Effets sont obtenus, la cible ne peut entreprendre aucune action hostile ou agressive pendant un nombre de rounds égal au nombre d’Effets obtenus."],
  ["SyrRadVenomAm001", "Radscorpion Venom Syringe", "Seringue au venin de radscorpion", 65,
    "The weapon adds +1 CD damage and gains the Persistent (Poison) damage effect.",
    "L’arme inflige +1 DC de dégâts et gagne l’effet de dégâts Persistants (poison)."],
  ["SyrYellowBelly01", "Yellow Belly Syringe", "Seringue trouillarde", 55,
    "If one or more Effects are rolled, the target must spend at least one action each turn moving directly away from all enemies. This lasts for a number of rounds equal to the number of Effects rolled.",
    "Si un ou plusieurs Effets sont obtenus, la cible doit consacrer au moins une action par tour à s’éloigner directement de tous ses ennemis. Cet effet dure un nombre de rounds égal au nombre d’Effets obtenus."]
];

for (const language of ["en", "fr"]) {
  const directory = path.join(root, "src", "packs", language, "ammunition.db");
  await mkdir(directory, { recursive: true });
  const templateFile = (await readdir(directory)).find((name) => name.endsWith("__SyrBerserkAmmo01.json"));
  if (!templateFile) throw new Error(`Missing ${language} Syringer ammunition variant template`);
  const generic = JSON.parse(await readFile(path.join(directory, templateFile), "utf8"));
  for (const existing of await readdir(directory)) {
    if (!existing.endsWith(".json")) continue;
    const candidate = JSON.parse(await readFile(path.join(directory, existing), "utf8"));
    if (candidate.flags?.["fallout2d20-compendium"]?.syringerEffect) await rm(path.join(directory, existing));
  }
  for (const [id, enName, frName, cost, enEffect, frEffect] of definitions) {
    for (const existing of await readdir(directory)) {
      if (existing.endsWith(`__${id}.json`)) await rm(path.join(directory, existing));
    }
    const name = language === "en" ? enName : frName;
    const effect = language === "en" ? enEffect : frEffect;
    const document = structuredClone(generic);
    document._id = id;
    document._key = `!items!${id}`;
    document.name = name;
    document.img = `modules/fallout2d20-compendium/artwork/Ammunition/Syringer Ammo, ${artworkNames[enName]}.webp`;
    document.system.cost = cost;
    document.system.description = `<p>${effect}</p><p><strong>${language === "en" ? "Quantity found" : "Quantité trouvée"}:</strong> 4+2 DC</p>`;
    document.flags["fallout2d20-compendium"] = {
      source: { book: "core_rulebook", language, page: 117, errataReviewed: true, translationReviewed: language === "fr", artworkReviewed: true, artworkStatus: "dedicated" },
      syringerEffect: { key: enName.replace(/ Syringe$/, ""), text: effect }
    };
    const slug = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    await writeFile(path.join(directory, `${slug}__${id}.json`), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }
}

console.log(`Created ${definitions.length} bilingual Syringer ammunition variants.`);
