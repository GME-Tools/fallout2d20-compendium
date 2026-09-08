import { readFile,readdir,rm,writeFile } from "node:fs/promises";
import path from "node:path";
import { slugify } from "./lib/files.mjs";
import { FRENCH_MAGAZINE_SERIES_2 as translations,FRENCH_PUBLICATION_DESCRIPTIONS_2 as descriptions,FRENCH_PUBLICATION_LABELS_2 as labels } from "./data/french-magazine-series-2.mjs";

const moduleId="fallout2d20-compendium";
async function load(pack,language){const dir=path.join("src","packs",language,`${pack}.db`),entries=[];for(const filename of await readdir(dir)){if(!filename.endsWith(".json"))continue;entries.push({file:path.join(dir,filename),document:JSON.parse(await readFile(path.join(dir,filename),"utf8"))});}return entries;}

for(const pack of ["perks","books-and-magazines"]){
  const english=await load(pack,"en"),french=await load(pack,"fr"),enById=new Map(english.map(e=>[e.document._id,e.document]));let changed=0;
  for(const entry of french){const source=enById.get(entry.document._id),translation=translations[source?.name];if(!translation)continue;
    const doc=entry.document;doc.name=translation.frenchName;
    if(pack==="perks")doc.system.description=`<p>${translation.effect}</p>`;
    else{doc.system.publication=labels[translation.publication];doc.system.description=`<p>${descriptions[translation.publication]}</p><p><strong>Aptitude :</strong> ${translation.effect}</p>`;doc.system.effect=`<p>${translation.effect}</p>`;}
    doc.flags[moduleId]??={};doc.flags[moduleId].source={...(doc.flags[moduleId].source??{}),book:"core_rulebook",language:"fr",translationReviewed:true,structuralBaseline:false};
    const destination=path.join(path.dirname(entry.file),`${slugify(doc.name)}__${doc._id}.json`);await writeFile(destination,`${JSON.stringify(doc,null,2)}\n`,`utf8`);if(destination!==entry.file)await rm(entry.file);changed++;
  }
  if(changed!==Object.keys(translations).length)throw new Error(`${pack}: localized ${changed}, expected ${Object.keys(translations).length}`);
}
console.log(`Localized ${Object.keys(translations).length} remaining magazine issues and paired perks in French.`);
