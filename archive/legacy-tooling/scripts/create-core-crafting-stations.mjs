import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const icon = "systems/fallout/assets/icons/items/miscellany.svg";

const stations = [
  {
    id: "CrftArmorBench01",
    en: { name: "Armor Workbench", skills: "Repair", perks: "Armorer", effect: "Contains the tools needed to work with armor and clothing, but not Power Armor.", description: "An armor workbench contains the tools needed to work with armor and clothing, though not Power Armor. Crafting at this workbench uses the Repair skill and benefits from the Armorer perk." },
    fr: { name: "Établi d’armures", skills: "Réparation", perks: "Armurier", effect: "Fournit les outils nécessaires pour travailler les armures et les vêtements, mais pas les armures assistées.", description: "Un établi d’armures fournit les outils nécessaires pour travailler les armures et les vêtements, mais pas les armures assistées. Son utilisation fait appel à la compétence Réparation et bénéficie de l’aptitude Armurier." }
  },
  {
    id: "CrftChemBench001",
    en: { name: "Chemistry Station", skills: "Science, Explosives", perks: "Chemist, Demolition Expert", effect: "Used to create chems, explosives, and Syringer ammunition.", description: "A chemistry station contains tools used for mixing chemicals to create chems, explosives, and Syringer ammunition. Crafting at this station uses the Science and Explosives skills and benefits from the Chemist and Demolition Expert perks." },
    fr: { name: "Établi de chimie", skills: "Science, Explosifs", perks: "Chimiste, Expert en démolition", effect: "Permet de créer des drogues, des explosifs et des munitions pour pistolet à seringues.", description: "Un établi de chimie fournit les outils nécessaires pour mélanger des produits chimiques afin de créer des drogues, des explosifs et des munitions pour pistolet à seringues. Son utilisation fait appel aux compétences Science et Explosifs et bénéficie des aptitudes Chimiste et Expert en démolition." }
  },
  {
    id: "CrftCookStation1",
    en: { name: "Cooking Station", skills: "Survival", perks: "", effect: "Provides an open flame and tools for cooking food and beverages. It functions for eight hours before requiring 1 Common Material to repair.", description: "A cooking station provides an open flame and the tools used for cooking food and beverages. Crafting at it uses the Survival skill. It can be built without a workbench and functions for eight hours, after which repairing it requires 1 Common Material.", recipe: { complexity: 2, skill: "Survival", perks: [], rarity: "common", materials: [] } },
    fr: { name: "Poste de cuisine", skills: "Survie", perks: "", effect: "Fournit un feu et les ustensiles nécessaires pour cuisiner. Il fonctionne huit heures avant de nécessiter 1 matériau fréquent pour être réparé.", description: "Un poste de cuisine fournit un feu et les ustensiles nécessaires pour cuisiner les aliments et les boissons. Son utilisation fait appel à la compétence Survie. Il peut être fabriqué sans établi et fonctionne pendant huit heures, après quoi sa réparation nécessite 1 matériau fréquent.", recipe: { complexity: 2, skill: "Survie", perks: [], rarity: "common", materials: [] } }
  },
  {
    id: "CrftPowerArmor01",
    en: { name: "Power Armor Station", skills: "Repair, Science", perks: "Armorer, Science!", effect: "Provides the space and tools needed to work on Power Armor.", description: "A Power Armor station is a space for working with Power Armor. Crafting at this station uses the Repair and Science skills and benefits from the Armorer and Science! perks." },
    fr: { name: "Établi d’armures assistées", skills: "Réparation, Science", perks: "Armurier, Scientifique", effect: "Fournit l’espace et les outils nécessaires pour travailler sur les armures assistées.", description: "Un établi d’armures assistées permet de travailler sur les armures assistées. Son utilisation fait appel aux compétences Réparation et Science et bénéficie des aptitudes Armurier et Scientifique." }
  },
  {
    id: "CrftRobotBench01",
    en: { name: "Robot Workbench", skills: "Repair, Science", perks: "Robotics Expert", effect: "Provides the tools and space needed to modify a robot.", description: "A robot workbench provides the tools and space needed to modify a robot. Crafting at this workbench uses the Repair and Science skills and benefits from the Robotics Expert perk." },
    fr: { name: "Établi de robots", skills: "Réparation, Science", perks: "Expert en robotique", effect: "Fournit les outils et l’espace nécessaires pour modifier un robot.", description: "Un établi de robots fournit les outils et l’espace nécessaires pour modifier un robot. Son utilisation fait appel aux compétences Réparation et Science et bénéficie de l’aptitude Expert en robotique." }
  },
  {
    id: "CrftWeaponBench1",
    en: { name: "Weapons Workbench", skills: "Repair, Science", perks: "Gun Nut, Science!, Blacksmith", effect: "Contains tools for working with weapons of various kinds.", description: "A weapons workbench contains tools for working with weapons of various kinds. Crafting at this workbench uses the Repair and Science skills and benefits from the Gun Nut, Science!, and Blacksmith perks." },
    fr: { name: "Établi d’armes", skills: "Réparation, Science", perks: "Fana d’armes, Scientifique, Forgeron", effect: "Fournit les outils nécessaires pour travailler sur différents types d’armes.", description: "Un établi d’armes fournit les outils nécessaires pour travailler sur différents types d’armes. Son utilisation fait appel aux compétences Réparation et Science et bénéficie des aptitudes Fana d’armes, Scientifique et Forgeron." }
  }
];

for (const language of ["en", "fr"]) {
  const output = path.join(root, "src", "packs", language, "crafting-stations.db");
  await mkdir(output, { recursive: true });
  for (const entry of await readdir(output)) {
    if (entry.endsWith(".json")) await rm(path.join(output, entry));
  }
  for (const station of stations) {
    const text = station[language];
    const document = {
      _id: station.id,
      _key: `!items!${station.id}`,
      name: text.name,
      type: "object_or_structure",
      img: icon,
      effects: [],
      folder: null,
      system: {
        description: `<p>${text.description}</p>`,
        favorite: false,
        source: "core_rulebook",
        constructionTime: 0,
        effect: `<p>${text.effect}</p>`,
        itemType: "crafting_table",
        materials: { common: 0, uncommon: 0, rare: 0 },
        parentItem: "",
        perks: text.perks,
        rarity: "common",
        skills: text.skills
      },
      flags: {
        "fallout2d20-compendium": {
          source: { book: "core_rulebook", language, page: 209, errataReviewed: true, translationReviewed: language === "fr" },
          ...(text.recipe ? { recipe: { ...text.recipe, station: "cooking", errata: "V6-2026" } } : {})
        }
      }
    };
    const filename = `${text.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}__${station.id}.json`;
    await writeFile(path.join(output, filename), `${JSON.stringify(document, null, 2)}\n`, "utf8");
  }
}

console.log(`Created ${stations.length} bilingual Core crafting stations.`);
