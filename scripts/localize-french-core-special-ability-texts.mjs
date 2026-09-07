import { readFile,readdir,writeFile } from "node:fs/promises";
import path from "node:path";
import { FRENCH_CORE_SPECIAL_ABILITY_TEXTS as texts,FRENCH_CORE_SPECIAL_ABILITY_TEXT_OVERRIDES as overrides } from "./data/french-core-special-ability-texts.mjs";
const moduleId="fallout2d20-compendium";
for(const pack of ["creatures","npcs"]){
  const enDir=path.join("src","packs","en",`${pack}.db`),frDir=path.join("src","packs","fr",`${pack}.db`),enById=new Map();
  for(const file of (await readdir(enDir)).filter(name=>name.endsWith(".json"))){const doc=JSON.parse(await readFile(path.join(enDir,file),"utf8"));enById.set(doc._id,doc);}
  let count=0;
  for(const file of (await readdir(frDir)).filter(name=>name.endsWith(".json"))){
    const target=path.join(frDir,file),doc=JSON.parse(await readFile(target,"utf8")),source=enById.get(doc._id);
    if(!source)throw new Error(`${pack}/${doc._id}: missing English actor`);
    const sourceById=new Map((source.items??[]).map(item=>[item._id,item]));
    for(const item of doc.items??[]){const canonical=sourceById.get(item._id);if(canonical?.type!=="special_ability"||!(canonical.system?.description??"").trim())continue;const translation=overrides[`${source.name}/${canonical.name}`]??texts[canonical.name];if(!translation)throw new Error(`${pack}/${source.name}/${canonical.name}: missing French special-ability text`);item.system.description=translation;count++;}
    doc.flags[moduleId].source.specialAbilityTextTranslationReviewed=true;
    await writeFile(target,`${JSON.stringify(doc,null,2)}\n`);
  }
  console.log(`Localized ${count} special-ability descriptions in French ${pack}.`);
}
