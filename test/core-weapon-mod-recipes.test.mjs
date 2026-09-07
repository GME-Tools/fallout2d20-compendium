import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { CORE_WEAPON_MOD_RECIPES } from "../scripts/data/core-weapon-mod-recipes.mjs";

async function load(language){const dir=path.join("src","packs",language,"weapon-mods.db");return Promise.all((await readdir(dir)).filter(f=>f.endsWith(".json")).map(async f=>JSON.parse(await readFile(path.join(dir,f),"utf8"))));}

test("weapon-mod recipe inventory covers every Core table row",()=>{
  assert.equal(CORE_WEAPON_MOD_RECIPES.length,146);
  assert.deepEqual(Object.fromEntries(["smallGuns","energyWeapons","bigGuns","meleeWeapons"].map(f=>[f,CORE_WEAPON_MOD_RECIPES.filter(r=>r.family===f).length])),{smallGuns:36,energyWeapons:30,bigGuns:32,meleeWeapons:48});
});

test("every weapon-mod recipe row resolves in both languages",async()=>{
  const en=await load("en"),fr=new Map((await load("fr")).map(d=>[d._id,d]));
  const expected=new Set(CORE_WEAPON_MOD_RECIPES.map(r=>`${r.family}/${r.group}/${r.name}`));
  const found=new Set();
  for(const item of en){const recipes=item.flags?.["fallout2d20-compendium"]?.weaponModRecipes??[];for(const recipe of recipes)found.add(recipe.key);if(recipes.length){assert.match(item.system.description,/data-f2d20-weapon-recipes="core"/);assert.deepEqual(fr.get(item._id)?.flags?.["fallout2d20-compendium"]?.weaponModRecipes?.map(r=>r.key),recipes.map(r=>r.key));}}
  assert.deepEqual([...found].sort(),[...expected].sort());
});

test("weapon-mod recipes never rely on ambiguous name fallbacks",async()=>{
  for(const language of ["en","fr"])for(const document of await load(language))for(const recipe of document.flags?.["fallout2d20-compendium"]?.weaponModRecipes??[])assert.notEqual(recipe.resolution,"name-fallback",`${language}/${recipe.key}`);
});
