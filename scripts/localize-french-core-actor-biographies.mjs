import { readFile,readdir,writeFile } from "node:fs/promises";
import path from "node:path";

const moduleId="fallout2d20-compendium";
const biographies=JSON.parse(await readFile("catalog/v1-core-fr-actor-biographies.json","utf8"));
const origins={
  "Alien, Normal Creature":"Extra-terrestre, Créature Normale","Mammal, Normal Creature":"Mammifère, Créature Normale","Mutated Arachnid, Normal Creature":"Arachnide Mutant, Créature Normale",
  "Mutated Crustacean, Normal Creature":"Crustacé Mutant, Créature Normale","Mutated Human, Normal Creature":"Humain Mutant, Créature Normale","Mutated Insect, Normal Creature":"Insecte Mutant, Créature Normale",
  "Mutated Lizard, Normal Creature":"Reptile Mutant, Créature Normale","Mutated Mammal, Normal Creature":"Mammifère Mutant, Créature Normale","Robot, Normal Creature":"Robot, Créature Normale","Robotic Synth, Normal Creature":"Synthétique Robotique, Créature Normale",
  "Ghoul, Normal Character":"Goule, Personnage Normal","Human Raider, Major Character":"Pillard Humain, Personnage Majeur","Human Raider, Normal Character":"Pillard Humain, Personnage Normal","Human Raider, Notable Character":"Pillard Humain, Personnage Notable",
  "Human, Major Character":"Humain, Personnage Majeur","Human, Normal Character":"Humain, Personnage Normal","Human, Notable Character":"Humain, Personnage Notable","Mutated Human, Normal Character":"Humain Mutant, Personnage Normal",
  "Mutated Human, Notable Character":"Humain Mutant, Personnage Notable","Robot, Notable Character":"Robot, Personnage Notable","Robotic Synth, Notable Character":"Synthétique Robotique, Personnage Notable"
};

for(const pack of ["creatures","npcs"]){
  const enDir=path.join("src","packs","en",`${pack}.db`),frDir=path.join("src","packs","fr",`${pack}.db`),enById=new Map();
  for(const filename of (await readdir(enDir)).filter(f=>f.endsWith(".json"))){const doc=JSON.parse(await readFile(path.join(enDir,filename),"utf8"));enById.set(doc._id,doc);}
  let changed=0;
  for(const filename of (await readdir(frDir)).filter(f=>f.endsWith(".json"))){const file=path.join(frDir,filename),doc=JSON.parse(await readFile(file,"utf8")),source=enById.get(doc._id),biography=biographies[source?.name],origin=origins[source?.system?.origin];if(!biography)throw new Error(`Missing French biography for ${source?.name??doc._id}`);if(!origin)throw new Error(`Missing French origin for ${source?.system?.origin}`);doc.system.biography=`<p>${biography}</p>`;doc.system.origin=origin;doc.flags[moduleId]??={};doc.flags[moduleId].source={...(doc.flags[moduleId].source??{}),language:"fr",biographyTranslationReviewed:true,originTranslationReviewed:true,structuralBaseline:false};await writeFile(file,`${JSON.stringify(doc,null,2)}\n`);changed++;}
  console.log(`Localized ${changed} French ${pack} biographies and origins.`);
}
