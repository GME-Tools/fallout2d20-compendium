import { readFile,readdir,writeFile } from "node:fs/promises";
import path from "node:path";

const aliases={
  "Combat Rilfe":"Combat Rifle","Missle Launcher":"Missile Launcher","Laser Pistol":"Laser Gun",
  "Long Laser Rifle":"Laser Gun","Improved Long Laser Rifle":"Laser Gun","Pipe Bolt-Action Rifle":"Pipe Bolt-Action",
  "Shock Baton":"Baton"
};
const moduleId="fallout2d20-compendium",enWeapons=new Map(),frWeapons=new Map();
for(const file of (await readdir("src/packs/en/weapons.db")).filter(name=>name.endsWith(".json"))){const doc=JSON.parse(await readFile(path.join("src/packs/en/weapons.db",file),"utf8"));enWeapons.set(doc.name,doc);}
for(const file of (await readdir("src/packs/fr/weapons.db")).filter(name=>name.endsWith(".json"))){const doc=JSON.parse(await readFile(path.join("src/packs/fr/weapons.db",file),"utf8"));frWeapons.set(doc._id,doc);}
for(const pack of ["creatures","npcs"]){
  const enDir=path.join("src/packs/en",`${pack}.db`),frDir=path.join("src/packs/fr",`${pack}.db`),enById=new Map();
  for(const file of (await readdir(enDir)).filter(name=>name.endsWith(".json"))){const doc=JSON.parse(await readFile(path.join(enDir,file),"utf8"));enById.set(doc._id,doc);}
  let count=0;
  for(const file of (await readdir(frDir)).filter(name=>name.endsWith(".json"))){const target=path.join(frDir,file),doc=JSON.parse(await readFile(target,"utf8")),source=enById.get(doc._id),sourceItems=new Map((source.items??[]).map(item=>[item._id,item]));for(const item of doc.items??[]){const canonical=sourceItems.get(item._id);if(canonical?.type!=="weapon"||!(canonical.system?.description??"").trim())continue;const standalone=enWeapons.get(aliases[canonical.name]??canonical.name),translation=standalone&&frWeapons.get(standalone._id)?.system?.description;if(!translation)throw new Error(`${pack}/${source.name}/${canonical.name}: no standalone French weapon description`);item.system.description=translation;count++;}doc.flags[moduleId].source.embeddedWeaponTextTranslationReviewed=true;await writeFile(target,`${JSON.stringify(doc,null,2)}\n`);}console.log(`Localized ${count} embedded weapon descriptions in French ${pack}.`);
}
