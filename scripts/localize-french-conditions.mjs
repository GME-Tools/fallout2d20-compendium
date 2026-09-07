import { readFile,readdir,rename,writeFile } from "node:fs/promises";
import path from "node:path";
import { slugify } from "./lib/files.mjs";

const addiction = {
  "Buffout":["Buffout","La difficulté de tous vos tests de FOR et d’END augmente de +1 quand vous n’êtes pas sous l’effet d’un type de Buffout (Buffout, Buffjet ou Bufftats)."],
  "Calmex":["Calmex","Vous subissez des complications sur vos tests d’AGI sur un résultat de 18 ou plus quand vous n’êtes pas sous l’effet du Calmex."],
  "Daddy-O":["Daddy-O","La difficulté de tous vos tests de PER et d’INT augmente de +1 quand vous n’êtes pas sous l’effet du Daddy-O."],
  "Day Tripper":["Daytripper","La difficulté de tous vos tests de CHR et de CHA augmente de +1 quand vous n’êtes pas sous l’effet du Daytripper."],
  "Fury":["Fureur","La difficulté de tous vos tests de FOR et de PER augmente de +1 quand vous n’êtes pas sous l’effet de la Fureur."],
  "Jet":["Jet","La difficulté de tous vos tests d’AGI augmente de +1 quand vous n’êtes pas sous l’effet d’un type de Jet (Jet ou Jet Fuel ; l’Ultra Jet possède une dépendance différente)."],
  "Med-X":["Med-X","La difficulté de tous vos tests d’AGI augmente de +1 et vous subissez +1 DC de dégâts supplémentaires de toutes les attaques physiques quand vous n’êtes pas sous l’effet du Med-X."],
  "Mentat":["Mentats","La difficulté de tous vos tests de CHR augmente de +1 quand vous n’êtes pas sous l’effet d’un type de Mentats (ordinaires, fruits rouges, orange ou raisin)."],
  "Overdrive":["Overdrive","La difficulté de tous vos tests de FOR et d’AGI augmente de +1 quand vous n’êtes pas sous l’effet de l’Overdrive."],
  "Psycho":["Psycho","La difficulté de tous vos tests de FOR augmente de +1 et vous subissez +1 DC de dégâts de toutes les attaques physiques quand vous n’êtes pas sous l’effet d’un type de Psycho (Psycho, Psycho Jet, Psychobuff ou Psychotats)."],
  "Ultra Jet":["Ultra Jet","La difficulté de tous vos tests d’AGI augmente de +1 et vous générez 1 PA de moins lorsque vous réussissez un test de compétence (minimum 0) quand vous n’êtes pas sous l’effet de l’Ultra Jet. Cette dépendance est permanente et ne peut être soignée par aucun moyen connu."],
  "X-Cell":["X-Cell","La difficulté de tous vos tests augmente de +1 quand vous n’êtes pas sous l’effet du X-Cell."]
};

const disease = {
  "Blood Worms":["Vers sanguins","Les attaques qui vous ciblent infligent +2 DC de dégâts."],
  "Bone Worms":["Vers osseux","Les attaques qui vous ciblent et touchent vos bras ou vos jambes infligent +4 DC de dégâts."],
  "Buzz Brain":["Céphalée","Les tests d’INT gagnent +1 difficulté."],
  "Dysentery":["Dysenterie","Divisez par deux le nombre d’heures entre les degrés de la jauge de soif."],
  "Fever Claw":["Mains tremblantes","Vos attaques à distance infligent 2 DC de dégâts de moins, jusqu’à un minimum de 1 DC."],
  "Flap Limb":["Membre agité","Les tests de FOR gagnent +1 difficulté."],
  "Glowing Pustules":["Pustules luisantes","Lorsque vous subissez une Blessure, tous ceux qui se trouvent à Portée de main subissent 1 DC de dégâts de radiation."],
  "Heat Flashes":["Bouffées de chaleur","Les tests d’END gagnent +1 difficulté."],
  "Jelly Fingers":["Doigts mous","Vous devez dépenser 1 PA pour effectuer une attaque à distance."],
  "Lock Joint":["Artibloc","Vous devez dépenser 1 PA pour effectuer une attaque de corps à corps."],
  "Needle Spine":["Aiguillose","Votre charge maximale diminue de 10."],
  "Parasites":["Parasites","Divisez par deux le nombre d’heures entre les degrés de la jauge de faim."],
  "Rad Worms":["Radvers","Lorsque vous subissez des dégâts de radiation, ajoutez +2 au total de ces dégâts."],
  "Shell Shock":["Psychose traumatique","Lorsque vous subissez une Blessure, retirez 1 PA de la réserve du groupe si possible."],
  "Sludge Lung":["Poumons encrassés","Subissez 1 point de Fatigue. Vous ne pouvez ajouter des PA à la réserve du groupe que si elle en contient 3 ou moins."],
  "Snot Ear":["Oreille coulante","Les tests de PER gagnent +1 difficulté."],
  "Swamp Gas":["Gaz des marais","Les tests de CHA gagnent +1 difficulté."],
  "Swamp Itch":["Démangeaisons des marais","Les tests d’AGI gagnent +1 difficulté."],
  "The Whoopsies":["Flatulences","Vous devez dépenser deux fois plus de points de Chance pour obtenir l’Effet voulu."],
  "Weeping Sores":["Irritations suintantes","Lorsque vous subissez des dégâts physiques, vous subissez +1 dégât physique au début de votre prochain tour, en ignorant la résistance aux dégâts."]
};

for(const [pack,map] of [["addictions",addiction],["diseases",disease]]){
  const enDir=path.join("src","packs","en",`${pack}.db`),frDir=path.join("src","packs","fr",`${pack}.db`);
  const english=new Map();for(const file of await readdir(enDir)){const doc=JSON.parse(await readFile(path.join(enDir,file),"utf8"));english.set(doc._id,doc);}
  for(const file of await readdir(frDir)){
    if(!file.endsWith(".json"))continue;const oldPath=path.join(frDir,file),doc=JSON.parse(await readFile(oldPath,"utf8")),source=english.get(doc._id),entry=map[source?.name];
    if(!entry)throw new Error(`Missing official French ${pack} translation for ${source?.name??doc._id}`);
    doc.name=entry[0];doc.system.description=`<p>${entry[1]}</p>`;doc.flags["fallout2d20-compendium"].source.translationReviewed=true;doc.flags["fallout2d20-compendium"].source.structuralBaseline=false;
    const newPath=path.join(frDir,`${slugify(doc.name)}__${doc._id}.json`);await writeFile(newPath,`${JSON.stringify(doc,null,2)}\n`,`utf8`);if(newPath!==oldPath)await rename(oldPath,`${oldPath}.obsolete`).then(()=>import("node:fs/promises").then(({rm})=>rm(`${oldPath}.obsolete`)));
  }
}
console.log("Localized 12 addictions and 20 diseases from the official French Core Rulebook.");
