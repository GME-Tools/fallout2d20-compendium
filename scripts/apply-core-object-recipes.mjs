import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE_OBJECT_RECIPES } from "./data/core-object-recipes.mjs";
import { PACKS, packId } from "./config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleId = "fallout2d20-compendium";
const aliases = new Map([
  ["Diluted RadAway", "RadAway (Diluted)"],
  ["Diluted Rad-X", "Rad-X (Diluted)"],
  ["Diluted Stimpak", "Stimpak (Diluted)"]
]);
const genericMaterials = new Set(["Common Materials", "Uncommon Materials", "Rare Materials"]);
const localized = {
  fr: {
    title: "Recette de fabrication", station: "Établi", complexity: "Complexité", skill: "Compétence",
    perks: "Aptitudes", rarity: "Rareté", materials: "Matériaux", none: "Aucune",
    stations: { chemistry: "Établi de chimie", cooking: "Poste de cuisine" },
    rarities: { common: "Fréquente", uncommon: "Peu fréquente", rare: "Rare" },
    skills: { Science: "Science", Explosives: "Explosifs", Survival: "Survie" },
    generic: { "Common Materials": "Matériaux fréquents", "Uncommon Materials": "Matériaux peu fréquents", "Rare Materials": "Matériaux rares" },
    perkNames: { Chemist: "Chimiste", "Demolition Expert": "Expert en démolition", "Science! 2": "Scientifique 2", "Science! 3": "Scientifique 3" }
  },
  en: {
    title: "Crafting recipe", station: "Station", complexity: "Complexity", skill: "Skill", perks: "Perks",
    rarity: "Rarity", materials: "Materials", none: "None",
    stations: { chemistry: "Chemistry Station", cooking: "Cooking Station" },
    rarities: { common: "Common", uncommon: "Uncommon", rare: "Rare" }, skills: {}, generic: {}, perkNames: {}
  }
};

async function loadLanguage(language) {
  const documents = [];
  for (const pack of PACKS.filter((entry) => entry.type === "Item")) {
    const directory = path.join(root, "src", "packs", language, `${pack.name}.db`);
    for (const filename of await readdir(directory).catch((error) => error.code === "ENOENT" ? [] : Promise.reject(error))) {
      if (!filename.endsWith(".json")) continue;
      const file = path.join(directory, filename);
      documents.push({ pack: pack.name, file, document: JSON.parse(await readFile(file, "utf8")) });
    }
  }
  return documents;
}

const english = await loadLanguage("en");
const englishById = new Map(english.map((entry) => [entry.document._id, entry]));
const englishByName = new Map();
for (const entry of english) {
  if (!englishByName.has(entry.document.name)) englishByName.set(entry.document.name, entry);
}

for (const language of ["en", "fr"]) {
  const documents = language === "en" ? english : await loadLanguage(language);
  const byId = new Map(documents.map((entry) => [entry.document._id, entry]));
  const labels = localized[language];
  for (const recipe of CORE_OBJECT_RECIPES) {
    const canonicalName = aliases.get(recipe.name) ?? recipe.name;
    const targetEn = english.find((entry) => entry.pack === recipe.pack && entry.document.name === canonicalName);
    if (!targetEn) throw new Error(`Recipe product not found: ${recipe.pack}/${recipe.name}`);
    const target = byId.get(targetEn.document._id);
    if (!target) throw new Error(`Missing ${language} counterpart for ${recipe.pack}/${recipe.name}`);

    const ingredients = recipe.materials.map(({ name, quantity }) => {
      const ingredientEn = genericMaterials.has(name) ? null : englishByName.get(name);
      const ingredient = ingredientEn ? byId.get(ingredientEn.document._id) : null;
      const displayName = labels.generic[name] ?? ingredient?.document.name ?? name;
      return {
        name: displayName,
        canonicalName: name,
        quantity,
        uuid: ingredient ? `Compendium.${moduleId}.${packId(language, ingredient.pack)}.Item.${ingredient.document._id}` : null
      };
    });
    const perks = recipe.perks.map((perk) => labels.perkNames[perk] ?? perk);
    const materialHtml = ingredients.map((ingredient) => {
      const name = ingredient.uuid ? `@UUID[${ingredient.uuid}]{${ingredient.name}}` : ingredient.name;
      return `<li>${name} ×${ingredient.quantity}</li>`;
    }).join("");
    const section = `<section data-f2d20-recipe="core"><h3>${labels.title}</h3><dl><dt>${labels.station}</dt><dd>${labels.stations[recipe.station]}</dd><dt>${labels.complexity}</dt><dd>${recipe.complexity}</dd><dt>${labels.skill}</dt><dd>${labels.skills[recipe.skill] ?? recipe.skill}</dd><dt>${labels.perks}</dt><dd>${perks.join(", ") || labels.none}</dd><dt>${labels.rarity}</dt><dd>${labels.rarities[recipe.rarity]}</dd></dl><h4>${labels.materials}</h4><ul>${materialHtml}</ul></section>`;
    target.document.system.description = `${target.document.system.description.replace(/<section data-f2d20-recipe="core">[\s\S]*?<\/section>/g, "").trim()}\n${section}`;
    target.document.flags[moduleId] ??= {};
    target.document.flags[moduleId].recipe = {
      source: "core_rulebook", page: recipe.page, errata: recipe.name === "Squirrel Stew" ? "V6-2026" : null,
      station: recipe.station, complexity: recipe.complexity, skill: labels.skills[recipe.skill] ?? recipe.skill,
      perks, rarity: recipe.rarity, materials: ingredients
    };
    await writeFile(target.file, `${JSON.stringify(target.document, null, 2)}\n`, "utf8");
  }
}

console.log(`Applied ${CORE_OBJECT_RECIPES.length} recipes to both languages.`);
