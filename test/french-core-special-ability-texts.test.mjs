import test from "node:test";
import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
import path from "node:path";
for(const pack of ["creatures","npcs"])test(`French ${pack} special-ability descriptions are complete and translated`,async()=>{
  const enDir=path.join("src","packs","en",`${pack}.db`),frDir=path.join("src","packs","fr",`${pack}.db`),enById=new Map();
  for(const file of await readdir(enDir)){if(file.endsWith(".json")){const doc=JSON.parse(await readFile(path.join(enDir,file),"utf8"));enById.set(doc._id,doc);}}
  for(const file of await readdir(frDir)){if(!file.endsWith(".json"))continue;const fr=JSON.parse(await readFile(path.join(frDir,file),"utf8")),en=enById.get(fr._id);assert.ok(en,`${fr._id}: missing English actor`);const enItems=new Map((en.items??[]).map(item=>[item._id,item]));for(const item of fr.items??[]){const source=enItems.get(item._id);if(source?.type!=="special_ability"||!(source.system?.description??"").trim())continue;assert.ok((item.system?.description??"").trim(),`${en.name}/${source.name}: empty French description`);assert.notEqual(item.system.description,source.system.description,`${en.name}/${source.name}: untranslated description`);}assert.equal(fr.flags?.["fallout2d20-compendium"]?.source?.specialAbilityTextTranslationReviewed,true,`${en.name}: missing review flag`);}
});
