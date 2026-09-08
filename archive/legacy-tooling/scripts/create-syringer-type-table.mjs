import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID, packId } from "./config.mjs";

const tableId="SyringeTypeTbl01";
const types=[
  ["SyrBerserkAmmo01","Berserk Syringe","Seringue frénétique"],
  ["SyrBleedOutAmmo1","Bleed-Out Syringe","Seringue hémorragique"],
  ["SyrBloatflyAmmo1","Bloatfly Larva Syringe","Seringue à larve de mouche bouffie"],
  ["SyrEndangerolA01","Endangerol Syringe","Seringue d’Endangerol"],
  ["SyrLockJointAm01","Lock Joint Syringe","Seringue bloque-articulation"],
  ["SyrMindCloudAm01","Mind Cloud Syringe","Seringue de confusion"],
  ["SyrPaxAmmo000001","Pax Syringe","Seringue Pax"],
  ["SyrRadVenomAm001","Radscorpion Venom Syringe","Seringue au venin de radscorpion"],
  ["SyrYellowBelly01","Yellow Belly Syringe","Seringue trouillarde"]
];
for(const language of ["en","fr"]){
  const root=`src/packs/${language}/roll-tables.db`;
  for(const file of (await readdir(root)).filter(file=>/^syringer_type_\d+__SyrTypeResult\d+\.json$/.test(file))) await rm(path.join(root,file));
  const resultIds=types.map((_,i)=>`SyrTypeResult${String(i+1).padStart(3,"0")}`);
  const table={_id:tableId,_key:`!tables!${tableId}`,name:language==="en"?"Random Syringer Ammunition Type":"Type de munition de seringue aléatoire",description:language==="en"?"<p>Project utility table: roll once for each batch of Syringer ammunition found to determine its instantiated Core Rulebook syringe type.</p>":"<p>Table utilitaire du projet : lancez une fois par lot de munitions de seringue trouvé pour déterminer le type de seringue du Livre de base.</p>",img:"icons/svg/d20-grey.svg",formula:"1d9",replacement:true,displayRoll:true,folder:null,results:resultIds,flags:{[MODULE_ID]:{source:{book:"core_rulebook",language,errataReviewed:true,artworkReviewed:false,artworkStatus:"placeholder",projectGenerated:true,derivation:"Owner-approved utility table over the nine Core Rulebook syringe ammunition types; 2026-09-08."}}}};
  await writeFile(path.join(root,`${language==="en"?"random_syringer_ammunition_type":"type_de_munition_de_seringue_aleatoire"}__${tableId}.json`),`${JSON.stringify(table,null,2)}\n`);
  for(const [index,[ammoId,enName,frName]] of types.entries()){
    const id=resultIds[index],name=language==="en"?enName:frName,uuid=`Compendium.${MODULE_ID}.${packId(language,"ammunition")}.Item.${ammoId}`;
    const result={_id:id,_key:`!tables.results!${tableId}.${id}`,name,description:`@UUID[${uuid}]{${name}}`,type:"text",img:"icons/svg/d20-black.svg",weight:1,range:[index+1,index+1],drawn:false};
    await writeFile(path.join(root,`syringer_type_${String(index+1).padStart(2,"0")}__${id}.json`),`${JSON.stringify(result,null,2)}\n`);
  }
  for(const file of (await readdir(root)).filter(file=>/^random_ammunition_(11|12)__/.test(file))){
    const target=path.join(root,file),result=JSON.parse(await readFile(target,"utf8")),label=language==="en"?"Syringer Ammo (4+2 CD; determine type)":"Munitions de seringue (4+2 DC ; déterminer le type)";
    result.name=label; result.description=`@UUID[Compendium.${MODULE_ID}.${packId(language,"roll-tables")}.RollTable.${tableId}]{${label}}`; result.type="pack"; result.documentCollection=`${MODULE_ID}.${packId(language,"roll-tables")}`; result.documentId=tableId;
    await writeFile(target,`${JSON.stringify(result,null,2)}\n`);
  }
}
console.log("Created the bilingual 1d9 Syringer ammunition type table and repaired Random Ammunition links.");
