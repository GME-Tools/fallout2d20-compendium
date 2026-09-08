import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { FRENCH_CORE_CONSUMABLE_NAMES } from "./data/french-core-consumable-names.mjs";
import { slugify } from "./lib/files.mjs";

const root="src/packs/fr/consumables.db",changes=new Map();
for(const file of (await readdir(root)).filter(file=>file.endsWith(".json"))){
  const target=path.join(root,file),document=JSON.parse(await readFile(target,"utf8")),next=FRENCH_CORE_CONSUMABLE_NAMES[document._id];
  if(!next)continue;
  const before=JSON.stringify(document);
  if(document.name!==next){changes.set(document.name,next);document.name=next;}
  const source=document.flags?.["fallout2d20-compendium"]?.source;
  if(source)source.nameTranslationReviewed=true;
  if(JSON.stringify(document)!==before)await writeFile(target,`${JSON.stringify(document,null,2)}\n`);
  const destination=path.join(root,`${slugify(document.name)}__${document._id}.json`);
  if(destination!==target)await rename(target,destination);
}
for(const directory of (await readdir("src/packs/fr",{withFileTypes:true})).filter(entry=>entry.isDirectory()&&entry.name.endsWith(".db"))){
  const pack=path.join("src/packs/fr",directory.name);
  for(const file of (await readdir(pack)).filter(file=>file.endsWith(".json"))){
    const target=path.join(pack,file),before=await readFile(target,"utf8"); let after=before;
    for(const [oldName,newName] of changes)after=after.replaceAll(`]{${oldName}}`,`]{${newName}}`).replaceAll(`"name": "${oldName}"`,`"name": "${newName}"`);
    if(after!==before)await writeFile(target,after);
  }
}
console.log(`Applied ${changes.size} certain French Core consumable name corrections.`);
