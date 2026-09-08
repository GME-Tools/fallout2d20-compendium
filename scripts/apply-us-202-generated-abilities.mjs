import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MODULE_ID } from "./config.mjs";

const sheets = [
  { file:"artwork/sources/generated/us-202/abilities-01.png", names:["Acid Spray","Action Packed","Aggressive","Alien","Antlers","Aquatic","Arm Lasers","Atoms Glow","Attack Dog","Barbarian","Barbed Stinger","Big","Bite","Booulder Throw","Burrow","Butchery"] },
  { file:"artwork/sources/generated/us-202/abilities-02.png", names:["Chems or Kaboom","Claws","Companion","Dive-Bomb","Feral","Flying","Ghoul","Glowing","Hatchling Spawn","Headbutt","Heavy Object","Immune to Disease","Immune to Fear","Immune to Poison","Immune to Radiation","In Charge"] },
  { file:"artwork/sources/generated/us-202/abilities-03.png", names:["Instutute Access","Keen Senses","Laser","Let Rip","Little","Massive Strength","Master Trader","Modified Mini Nuke","Molotov","Night Vision","Pincers","Play Dead","Power Armor","Pre-War Expertise","Radio Transmission","Rend"] },
  { file:"artwork/sources/generated/us-202/abilities-04.png", names:["Robot","Salvage","Self-Destruct","Shopkeep","Slam","Small Weak Point","Sneaky","Sting","The Chain That Binds","Third Generation Synth","Vertibird Training","Warning Howl","Weak Spot","Well Equipped",null,null] }
];
const secondArm = "artwork/sources/generated/us-202/arm-lasers-variant.png";
const outDir = "artwork/Creature Abilities";
await mkdir(outDir, { recursive:true });
const generated = new Map();
for (const sheet of sheets) {
  const input = sharp(sheet.file);
  const meta = await input.metadata();
  for (let index=0; index<sheet.names.length; index++) {
    const name = sheet.names[index]; if (!name) continue;
    const left = Math.floor(index%4 * meta.width/4), top = Math.floor(Math.floor(index/4) * meta.height/4);
    const right = Math.floor((index%4+1)*meta.width/4), bottom = Math.floor((Math.floor(index/4)+1)*meta.height/4);
    const target = path.join(outDir, `${name.replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"").toLowerCase()}.webp`);
    await sharp(sheet.file).extract({left,top,width:right-left,height:bottom-top}).resize(512,512,{fit:"cover"}).webp({quality:80,effort:6}).toFile(target);
    generated.set(name,{target,sheet:sheet.file,index:index+1});
  }
}
await sharp(secondArm).resize(512,512,{fit:"cover"}).webp({quality:80,effort:6}).toFile(path.join(outDir,"arm-lasers-variant.webp"));

for (const language of ["en","fr"]) {
  const directory = `src/packs/${language}/creature-abilities.db`;
  for (const file of (await readdir(directory)).filter(file=>file.endsWith(".json"))) {
    const target = path.join(directory,file), document=JSON.parse(await readFile(target,"utf8"));
    const source=document.flags?.[MODULE_ID]?.source;
    if (source?.artworkStatus !== "placeholder") continue;
    let entry=generated.get(language === "en" ? document.name : null);
    if (language === "fr") {
      const enFile=(await readdir("src/packs/en/creature-abilities.db")).find(name=>name.endsWith(`__${document._id}.json`));
      if (enFile) entry=generated.get(JSON.parse(await readFile(path.join("src/packs/en/creature-abilities.db",enFile),"utf8")).name);
    }
    if (!entry) continue;
    const isDuplicate=["Ghoul","Self-Destruct"].includes(language === "en" ? document.name : JSON.parse(await readFile(path.join("src/packs/en/creature-abilities.db",(await readdir("src/packs/en/creature-abilities.db")).find(name=>name.endsWith(`__${document._id}.json`))),"utf8")).name);
    document.img=`modules/${MODULE_ID}/${entry.target}`;
    Object.assign(source,{artworkReviewed:true,artworkStatus:isDuplicate?"shared":"dedicated",artworkSource:`AI-generated for private US-202 use from ${entry.sheet}, cell ${entry.index}; generated 2026-09-07`,...(isDuplicate?{artworkSharingGroup:`shared-generated-${path.basename(entry.target,".webp")}`,artworkSharingJustification:"Same canonical ability name and visual meaning."}:{})});
    await writeFile(target,`${JSON.stringify(document,null,2)}\n`);
  }
}
