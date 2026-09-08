import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID } from "./config.mjs";

const decisions=[
  {packs:["weapon-mods","apparel-mods","robot-modules"],image:"artwork/Mod.webp",group:"shared-owner-mod-icon",justification:"Owner supplied one common illustration for all weapon, apparel and robot mods."},
  {packs:["diseases"],image:"artwork/Diseases.webp",group:"shared-owner-disease-icon",justification:"Owner supplied one common illustration for all diseases."}
];
let changed=0;
for(const decision of decisions){
  await access(decision.image);
  for(const language of ["en","fr"]) for(const pack of decision.packs){
    const directory=path.join("src","packs",language,`${pack}.db`);
    for(const file of (await readdir(directory)).filter(file=>file.endsWith(".json"))){
      const target=path.join(directory,file),document=JSON.parse(await readFile(target,"utf8"));
      if(!/^!items![^.!]+$/.test(document._key??""))continue;
      const source=document.flags?.[MODULE_ID]?.source;
      document.img=`modules/${MODULE_ID}/${decision.image}`;
      Object.assign(source,{artworkReviewed:true,artworkStatus:"shared",artworkSource:`Owner-supplied repository asset: ${decision.image}; recorded 2026-09-08`,artworkSharingGroup:decision.group,artworkSharingJustification:decision.justification});
      await writeFile(target,`${JSON.stringify(document,null,2)}\n`); changed++;
    }
  }
}
console.log(`Applied owner shared artwork to ${changed} bilingual documents.`);
