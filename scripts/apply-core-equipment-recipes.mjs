import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE_EQUIPMENT_RECIPES } from "./data/core-equipment-recipes.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleId = "fallout2d20-compendium";
const aliases = { "Ultra-Light Build": "Ultra Light Build", "Hacking Module": "Hacking Mod" };
const materialScale = {
  1: { common: 2, uncommon: 0, rare: 0 }, 2: { common: 3, uncommon: 0, rare: 0 },
  3: { common: 4, uncommon: 2, rare: 0 }, 4: { common: 5, uncommon: 3, rare: 0 },
  5: { common: 6, uncommon: 4, rare: 2 }, 6: { common: 7, uncommon: 5, rare: 3 },
  7: { common: 8, uncommon: 6, rare: 4 }
};
const labels = {
  en: { title: "Crafting recipe", station: "Station", complexity: "Complexity", skill: "Skill", perks: "Perks", rarity: "Rarity", materials: "Materials", common: "Common Materials", uncommon: "Uncommon Materials", rare: "Rare Materials", none: "None", stations: { armor: "Armor Workbench", "power-armor": "Power Armor Station", robot: "Robot Workbench" }, rarities: { common: "Common", uncommon: "Uncommon", rare: "Rare" } },
  fr: { title: "Recette de fabrication", station: "Établi", complexity: "Complexité", skill: "Compétence", perks: "Aptitudes", rarity: "Rareté", materials: "Matériaux", common: "Matériaux fréquents", uncommon: "Matériaux peu fréquents", rare: "Matériaux rares", none: "Aucune", stations: { armor: "Établi d’armures", "power-armor": "Établi d’armures assistées", robot: "Établi de robots" }, rarities: { common: "Fréquente", uncommon: "Peu fréquente", rare: "Rare" } }
};
const translate = (value) => value.replace(/^Repair$/, "Réparation").replace(/^Armorer/, "Armurier").replace(/^Science!/, "Scientifique").replace(/^Blacksmith/, "Forgeron").replace(/^Robotics Expert/, "Expert en robotique");

async function load(language, pack) {
  const directory = path.join(root, "src", "packs", language, `${pack}.db`);
  return Promise.all((await readdir(directory)).filter((file) => file.endsWith(".json")).map(async (filename) => ({ filename, file: path.join(directory, filename), document: JSON.parse(await readFile(path.join(directory, filename), "utf8")) })));
}

function matchesRecipe(documentName, canonical, recipe) {
  if (documentName === canonical || documentName.startsWith(`${canonical} (`)) return true;
  return recipe.group === "upgrades" && documentName.startsWith(`${canonical} `);
}

for (const language of ["en", "fr"]) {
  const packCache = new Map();
  for (const recipe of CORE_EQUIPMENT_RECIPES) {
    if (!packCache.has(recipe.pack)) packCache.set(recipe.pack, await load(language, recipe.pack));
    const canonical = aliases[recipe.name] ?? recipe.name.replace(/^X-01 /, "");
    const matches = packCache.get(recipe.pack).filter(({ document }) => matchesRecipe(document.name, canonical, recipe));
    // French documents share IDs but not names: resolve through the English pack when needed.
    let targets = matches;
    if (language === "fr") {
      const english = await load("en", recipe.pack);
      const englishMatches = english.filter(({ document }) => matchesRecipe(document.name, canonical, recipe));
      const ids = new Set(englishMatches.map(({ document }) => document._id));
      targets = packCache.get(recipe.pack).filter(({ document }) => ids.has(document._id));
    }
    if (!targets.length) throw new Error(`No ${language} target for ${recipe.pack}/${recipe.name}`);
    for (const target of targets) {
      const text = labels[language];
      const materials = { ...materialScale[Math.min(recipe.complexity, 7)] };
      if (recipe.station === "power-armor" && /Chest ?Piece/.test(target.document.name)) materials.uncommon += 1;
      if (recipe.pack === "robot-armor" && /Main Body|Corps principal/.test(target.document.name)) materials.uncommon += 1;
      const perks = language === "fr" ? recipe.perks.map(translate) : recipe.perks;
      const skill = language === "fr" ? translate(recipe.skill) : recipe.skill;
      const materialList = Object.entries(materials).filter(([, amount]) => amount).map(([kind, amount]) => `<li>${text[kind]} ×${amount}</li>`).join("");
      const section = `<section data-f2d20-recipe="core"><h3>${text.title}</h3><dl><dt>${text.station}</dt><dd>${text.stations[recipe.station]}</dd><dt>${text.complexity}</dt><dd>${recipe.complexity}</dd><dt>${text.skill}</dt><dd>${skill}</dd><dt>${text.perks}</dt><dd>${perks.join(", ") || text.none}</dd><dt>${text.rarity}</dt><dd>${text.rarities[recipe.rarity]}</dd></dl><h4>${text.materials}</h4><ul>${materialList}</ul></section>`;
      target.document.system.description = `${target.document.system.description.replace(/<section data-f2d20-recipe="core">[\s\S]*?<\/section>/g, "").trim()}\n${section}`;
      target.document.flags[moduleId] ??= {};
      target.document.flags[moduleId].recipe = { source: "core_rulebook", page: recipe.page, station: recipe.station, group: recipe.group, complexity: recipe.complexity, skill, perks, rarity: recipe.rarity, materials };
      await writeFile(target.file, `${JSON.stringify(target.document, null, 2)}\n`, "utf8");
    }
  }
}

console.log(`Applied ${CORE_EQUIPMENT_RECIPES.length} armor, Power Armor, and robot recipe rows in both languages.`);
