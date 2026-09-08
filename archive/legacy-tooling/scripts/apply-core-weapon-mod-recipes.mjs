import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE_WEAPON_MOD_RECIPES } from "./data/core-weapon-mod-recipes.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleId = "fallout2d20-compendium";
const scale = { 1:{common:2,uncommon:0,rare:0}, 2:{common:3,uncommon:0,rare:0}, 3:{common:4,uncommon:2,rare:0}, 4:{common:5,uncommon:3,rare:0}, 5:{common:6,uncommon:4,rare:2}, 6:{common:7,uncommon:5,rare:3}, 7:{common:8,uncommon:6,rare:4} };
const i18n = {
  en: { title:"Crafting recipe", station:"Weapons Workbench", complexity:"Complexity", skill:"Skill", perks:"Perks", rarity:"Rarity", materials:"Materials", none:"None", common:"Common Materials", uncommon:"Uncommon Materials", rare:"Rare Materials", rarities:{common:"Common",uncommon:"Uncommon",rare:"Rare"} },
  fr: { title:"Recette de fabrication", station:"Établi d’armes", complexity:"Complexité", skill:"Compétence", perks:"Aptitudes", rarity:"Rareté", materials:"Matériaux", none:"Aucune", common:"Matériaux fréquents", uncommon:"Matériaux peu fréquents", rare:"Matériaux rares", rarities:{common:"Fréquente",uncommon:"Peu fréquente",rare:"Rare"} }
};
const translate = (value) => value.replace(/^Repair$/, "Réparation").replace(/^Science!/, "Scientifique").replace(/^Gun Nut/, "Fana d’armes").replace(/^Blacksmith/, "Forgeron");

async function load(language) {
  const directory = path.join(root,"src","packs",language,"weapon-mods.db");
  return Promise.all((await readdir(directory)).filter((file)=>file.endsWith(".json")).map(async(filename)=>({filename,file:path.join(directory,filename),document:JSON.parse(await readFile(path.join(directory,filename),"utf8"))})));
}

const english = await load("en");
const assignments = new Map(english.map((entry)=>[entry.document._id,[]]));
const resolutions = new Map();
for (const row of CORE_WEAPON_MOD_RECIPES) {
  const key = `${row.family}/${row.group}/${row.name}`;
  let matches = row.id ? english.filter(({document})=>document._id===row.id && document.name===row.name) : row.folder ? english.filter(({document})=>document.name===row.name && document.folder===row.folder) : english.filter(({document})=>document.name===row.name && document.system.weaponType===row.family);
  let resolution = row.id ? "exact-id" : row.folder ? "exact-folder" : "family-name";
  if (!matches.length) {
    matches = english.filter(({document})=>document.name===row.name);
    resolution = "name-fallback";
  }
  if (!matches.length) throw new Error(`No weapon mod represents ${key}`);
  resolutions.set(key,{resolution,candidates:matches.length});
  for (const match of matches) assignments.get(match.document._id).push(row);
}

for (const language of ["en","fr"]) {
  const entries = language === "en" ? english : await load(language);
  for (const entry of entries) {
    const rows = assignments.get(entry.document._id) ?? [];
    entry.document.system.description = entry.document.system.description.replace(/<section data-f2d20-weapon-recipes="core">[\s\S]*?<\/section>/g, "").trim();
    entry.document.flags[moduleId] ??= {};
    delete entry.document.flags[moduleId].weaponModRecipes;
    if (!rows.length) {
      await writeFile(entry.file,`${JSON.stringify(entry.document,null,2)}\n`,`utf8`);
      continue;
    }
    const text = i18n[language];
    const recipes = rows.map((row)=>{
      const key=`${row.family}/${row.group}/${row.name}`, resolution=resolutions.get(key);
      return { key, source:"core_rulebook", page:row.page, station:row.station, family:row.family, group:row.group, complexity:row.complexity,
        skill:language==="fr"?translate(row.skill):row.skill, perks:language==="fr"?row.perks.map(translate):row.perks, rarity:row.rarity,
        materials:{...scale[Math.min(row.complexity,7)]}, ...resolution };
    });
    entry.document.flags[moduleId].weaponModRecipes=recipes;
    const blocks=recipes.map((recipe)=>`<article><h4>${recipe.family} - ${recipe.group}</h4><dl><dt>${text.complexity}</dt><dd>${recipe.complexity}</dd><dt>${text.skill}</dt><dd>${recipe.skill}</dd><dt>${text.perks}</dt><dd>${recipe.perks.join(", ")||text.none}</dd><dt>${text.rarity}</dt><dd>${text.rarities[recipe.rarity]}</dd></dl><h5>${text.materials}</h5><ul>${Object.entries(recipe.materials).filter(([,n])=>n).map(([kind,n])=>`<li>${text[kind]} ×${n}</li>`).join("")}</ul></article>`).join("");
    entry.document.system.description += `\n<section data-f2d20-weapon-recipes="core"><h3>${text.title} - ${text.station}</h3>${blocks}</section>`;
    await writeFile(entry.file,`${JSON.stringify(entry.document,null,2)}\n`,`utf8`);
  }
}

const fallback = [...resolutions.values()].filter(({resolution})=>resolution==="name-fallback").length;
if(fallback)throw new Error(`${fallback} weapon-mod recipe rows still require unsafe name fallback resolution`);
console.log(`Applied ${CORE_WEAPON_MOD_RECIPES.length} weapon-mod recipe rows in both languages (${fallback} fallback resolution(s)).`);
