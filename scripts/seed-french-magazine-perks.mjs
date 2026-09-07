import { copyFile,mkdir,readFile,readdir } from "node:fs/promises";
import path from "node:path";

const moduleId="fallout2d20-compendium",enDir=path.join("src","packs","en","perks.db"),frDir=path.join("src","packs","fr","perks.db");
await mkdir(frDir,{recursive:true});
const frIds=new Set();for(const file of await readdir(frDir)){if(!file.endsWith(".json"))continue;const doc=JSON.parse(await readFile(path.join(frDir,file),"utf8"));frIds.add(doc._id);}
let created=0;
for(const file of await readdir(enDir)){
  if(!file.endsWith(".json"))continue;const source=JSON.parse(await readFile(path.join(enDir,file),"utf8"));if(frIds.has(source._id))continue;
  const provenance=source.flags?.[moduleId]?.source??{};source.flags??={};source.flags[moduleId]??={};source.flags[moduleId].source={...provenance,language:"fr",structuralBaseline:true,translationReviewed:false,errataReviewed:provenance.errataReviewed??false};
  await import("node:fs/promises").then(({writeFile})=>writeFile(path.join(frDir,file),`${JSON.stringify(source,null,2)}\n`,`utf8`));created++;
}
console.log(`Seeded ${created} missing French magazine perk baseline document(s); existing translations were preserved.`);
