import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID } from "./config.mjs";

const targetPacks=new Set(["traits","consumables","addictions","books-and-magazines","perks","miscellany","crafting-stations"]);
const sharedNames=new Set(["Calmex","Fury","Jet","Overdrive","Ultra Jet","Future Weapons Today"]);
let changed=0;
for(const language of ["en","fr"])for(const pack of targetPacks){
  const directory=`src/packs/${language}/${pack}.db`;
  for(const file of (await readdir(directory)).filter(file=>file.endsWith(".json"))){
    const target=path.join(directory,file),document=JSON.parse(await readFile(target,"utf8")),source=document.flags?.[MODULE_ID]?.source;
    if(!/^!items![^.!]+$/.test(document._key??"")||!document.img?.startsWith(`modules/${MODULE_ID}/`))continue;
    const wasArtworkDebt=source?.artworkStatus==="placeholder"||/US-203|Owner-approved URL/.test(source?.artworkSource??"");
    if(!wasArtworkDebt)continue;
    const image=decodeURIComponent(document.img.slice(`modules/${MODULE_ID}/`.length)); await access(image);
    const englishName=language==="en"?document.name:null;
    let canonical=englishName;
    if(language==="fr"){
      const enDir=`src/packs/en/${pack}.db`,enFile=(await readdir(enDir)).find(name=>name.endsWith(`__${document._id}.json`));
      canonical=enFile?JSON.parse(await readFile(path.join(enDir,enFile),"utf8")).name:document.name;
    }
    const shared=sharedNames.has(canonical),group=canonical==="Future Weapons Today"?"shared-magazine-future-weapons-today":`shared-substance-${canonical.toLowerCase().replaceAll(" ","-")}`;
    Object.assign(source,{artworkReviewed:true,artworkStatus:shared?"shared":"dedicated",artworkSource:`Owner-supplied repository asset: ${image}; recorded 2026-09-08`});
    if(shared)Object.assign(source,{artworkSharingGroup:group,artworkSharingJustification:canonical==="Future Weapons Today"?"Owner-approved magazine and associated perk sharing.":"Owner-approved consumable and namesake addiction sharing."});
    else{delete source.artworkSharingGroup;delete source.artworkSharingJustification;}
    await writeFile(target,`${JSON.stringify(document,null,2)}\n`);changed++;
  }
}
console.log(`Classified ${changed} owner-added bilingual artwork references.`);
