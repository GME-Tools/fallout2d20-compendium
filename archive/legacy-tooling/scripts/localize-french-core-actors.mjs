import { readFile,readdir,rm,writeFile } from "node:fs/promises";
import path from "node:path";
import { slugify } from "./lib/files.mjs";
import { FRENCH_CORE_ACTOR_NAMES } from "./data/french-core-actor-names.mjs";

const moduleId="fallout2d20-compendium";
for(const pack of ["creatures","npcs"]){
  const enDir=path.join("src","packs","en",`${pack}.db`),frDir=path.join("src","packs","fr",`${pack}.db`);
  const enById=new Map(await Promise.all((await readdir(enDir)).filter(f=>f.endsWith(".json")).map(async f=>{const d=JSON.parse(await readFile(path.join(enDir,f),"utf8"));return[d._id,d];})));
  let changed=0;
  for(const filename of (await readdir(frDir)).filter(f=>f.endsWith(".json"))){const file=path.join(frDir,filename),doc=JSON.parse(await readFile(file,"utf8")),source=enById.get(doc._id),name=FRENCH_CORE_ACTOR_NAMES[source?.name];if(!name)throw new Error(`Missing official French actor name for ${source?.name??doc._id}`);doc.name=name;doc.flags[moduleId]??={};doc.flags[moduleId].source={...(doc.flags[moduleId].source??{}),language:"fr",nameTranslationReviewed:true};const destination=path.join(frDir,`${slugify(name)}__${doc._id}.json`);await writeFile(destination,`${JSON.stringify(doc,null,2)}\n`);if(destination!==file)await rm(file);changed++;}
  console.log(`Localized ${changed} French ${pack}.`);
}
