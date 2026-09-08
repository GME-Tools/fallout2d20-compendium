import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MODULE_ID } from "./config.mjs";

const sheet="artwork/sources/generated/us-203/shared-equipment.png";
const groups=[
  ["shared-substance-calmex",["addictions:qm4i02cwDQdD4nSD","consumables:MW9UpIocnupsmcFt"]],
  ["shared-substance-fury",["addictions:H3fKh61SM4JbxMyG","consumables:MPGzjHEzGF9yW97k"]],
  ["shared-substance-jet",["addictions:GYX8KWLwfQqmwghq","consumables:Bomq1g7X0eVXrssc"]],
  ["shared-substance-overdrive",["addictions:FGEnNecZjnkaE7iR","consumables:RcNc9VxnJn25PmUF"]],
  ["shared-substance-ultra-jet",["addictions:MBli9nmbRGQ55TcI","consumables:jhYtRwmXiTvaMuvY"]],
  ["shared-magazine-future-weapons-today",["books-and-magazines:IRIhIXR0X1PnThvd","perks:LJXpGjoI1HYU6Heb"]]
];
const outputRoot="artwork/Generated/us-203"; await mkdir(outputRoot,{recursive:true});
const meta=await sharp(sheet).metadata();
for (const [index,[group,identities]] of groups.entries()) {
  const column=index%3,row=Math.floor(index/3),left=Math.floor(column*meta.width/3),top=Math.floor(row*meta.height/2),right=Math.floor((column+1)*meta.width/3),bottom=Math.floor((row+1)*meta.height/2);
  const output=path.join(outputRoot,`${group}.webp`);
  await sharp(sheet).extract({left,top,width:right-left,height:bottom-top}).resize(512,512,{fit:"cover"}).webp({quality:82,effort:6}).toFile(output);
  for (const identity of identities) {
    const [pack,id]=identity.split(":");
    for (const language of ["en","fr"]) {
      const directory=`src/packs/${language}/${pack}.db`,file=(await readdir(directory)).find(file=>file.endsWith(`__${id}.json`));
      if (!file) throw new Error(`${language}/${identity}: document not found`);
      const target=path.join(directory,file),document=JSON.parse(await readFile(target,"utf8")),source=document.flags?.[MODULE_ID]?.source;
      document.img=`modules/${MODULE_ID}/${output}`;
      Object.assign(source,{artworkReviewed:true,artworkStatus:"shared",artworkSource:`AI-generated private US-203 source ${sheet}, cell ${index+1}; generated 2026-09-07`,artworkSharingGroup:group,artworkSharingJustification:"Owner-approved association between the consumable and addiction, or magazine and associated perk."});
      await writeFile(target,`${JSON.stringify(document,null,2)}\n`);
    }
  }
}
console.log(`Applied ${groups.length} generated sharing groups to ${groups.flatMap(([,ids])=>ids).length} identities.`);
