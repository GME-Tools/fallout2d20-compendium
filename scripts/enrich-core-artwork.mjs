import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID, PACKS } from "./config.mjs";

const modulePrefix = `modules/${MODULE_ID}/`;
const asset = (folder, file) => `${modulePrefix}artwork/${folder}/${file}`;
const normalize = (value) => value.normalize("NFD").replace(/\p{Diacritic}/gu,"").toLowerCase().replace(/[^a-z0-9]+/g,"");
const overrides = {
  ammunition: {
    "2mm Electromagnetic Cartridge":asset("Ammunition","2mm EC.webp"), ".308 Round":asset("Ammunition","308 Rounds.webp"), ".38 Round":asset("Ammunition","38 rounds.webp"),
    ".44 Magnum Round":asset("Ammunition","44 Magnum rounds.webp"), ".45 Round":asset("Ammunition","45 Rounds.webp"), ".50 Round":asset("Ammunition","50 caliber.webp"),
    "5.56mm Round":asset("Ammunition","556 mm.webp"), "5mm Round":asset("Ammunition","5mm rounds.webp"), "Fusion Cell":asset("Ammunition","Fusion Cells.webp"),
    "Gamma Round":asset("Ammunition","Gamma Rounds.webp"), "Shotgun Shell":asset("Ammunition","Shotgunshells.webp")
  },
  weapons: {
    "10mm Auto Pistol":asset("Weapons","10mm Pistol.webp"), "Buzz-Saw":asset("Weapons","Buzz-Saw Arm Attachment.webp"), "Combat Shotgun":asset("Weapons","combat_shotgun_standard_Fo4_.webp"),
    "Double-Barrel Shotgun":asset("Weapons","Double-barrel_shotgun_%2528Fallout_4%2529.webp"), "Gatling Laser":asset("Weapons","Gattling Laser.webp"), "Gun Bash (1H)":asset("Weapons","10mm Pistol.webp"),
    "Gun Bash":asset("Weapons","Assault Rifle.webp"), "Hunting Rifle":asset("Weapons","hunting_rifle_fo4.webp"), "Institute Laser":asset("Weapons","Institute_pistol_Fallout4_.webp"),
    "Laser Emitter":asset("Weapons","Laser Gun.webp"), "Missile Launcher":asset("Weapons","Missle Launcher.webp"), Pincer:asset("Apparel","Mr Handy Arm 1.webp"),
    "Pipe Bolt-Action":asset("Weapons","pipe_bolt-action_Fo4.webp"), "Pipe Gun":asset("Weapons","pipe_pistol_Fallout4.webp"), "Railway Rifle":asset("Weapons","Railway_rifle_%2528Fallout_4%2529.webp"),
    "Submachine Gun":asset("Weapons","Submachine_gun_FO76.webp"), "Unarmed Strike":asset("Weapons","Unarmmed Strike.webp")
  },
  apparel: {
    "Armor Frame":asset("Apparel","Power Armor Frame.webp"), "Combat Armor":asset("Apparel","Combat Chest Piece.webp"), "Heavy Combat Armor":asset("Apparel","Combat Chest Piece.webp"),
    "Sturdy Combat Armor":asset("Apparel","Combat Chest Piece.webp"), "Formal Clothing":asset("Apparel","Formal Clothing M.webp"), "Leather Armor":asset("Apparel","Leather Chest Piece.webp"),
    "Heavy Leather Armor":asset("Apparel","Leather Chest Piece.webp"), "Sturdy Leather Armor":asset("Apparel","Leather Chest Piece.webp"), "Metal Armor":asset("Apparel","Metal Chest.webp"),
    "Heavy Metal Armor":asset("Apparel","Metal Chest.webp"), "Sturdy Metal Armor":asset("Apparel","Metal Chest.webp"), "Heavy Metal Chest Piece":asset("Apparel","Metal Chest.webp"),
    "Metal Chest Piece":asset("Apparel","Metal Chest.webp"), "Sturdy Metal Chest Piece":asset("Apparel","Metal Chest.webp"), "Raider Armor":asset("Apparel","Raider Chest Piece.webp"),
    "Heavy Raider Armor":asset("Apparel","Raider Chest Piece.webp"), "Sturdy Raider Armor":asset("Apparel","Raider Chest Piece.webp"), "Raider Helm":asset("Apparel","Raider Power Armor Helmet.webp"),
    "Raider Left Arm":asset("Apparel","Raider Right Arm.webp"), "Heavy Raider Left Arm":asset("Apparel","Raider Right Arm.webp"), "Sturdy Raider Left Arm":asset("Apparel","Raider Right Arm.webp"),
    "Synth Armor":asset("Apparel","Synth Chest Piece.webp"), "Heavy Synth Armor":asset("Apparel","Synth Chest Piece.webp"), "Sturdy Synth Armor":asset("Apparel","Synth Chest Piece.webp"),
    "Light Dog Armor":asset("Apparel","Dog Armor.webp"), "Medium Dog Armor":asset("Apparel","Dog Armor.webp"), "T-51 Helm":asset("Apparel","T-51 Helmet.webp"),
    "Vault-Tec Security Armor (Complete)":asset("Apparel","Vault-Tec Security Armor.webp")
  },
  perks: {
    "Adamantium Skeleton":asset("Perks","Adamatium Skeleton.webp"), "Aquaboy / Aquagirl":asset("Perks","Aquaboygirl.webp"), "Grim Reaper's Sprint":asset("Perks","Grim Reapers Spirit.webp"),
    "Party Boy / Party Girl":asset("Perks","Partyboygirl.webp"), "Quick Draw":asset("Perks","Quickdraw.webp"), "Steady Aim":asset("Perks","Stead Aim.webp")
  },
  creatures: { Dogmeat:asset("Creatures","Dog.webp") }
};

const crossArtwork = new Map();
for (const folder of ["Weapons","Creatures","Consumables","Apparel","Tools and Utility Items"]) {
  for (const file of (await readdir(path.join("artwork",folder))).filter((entry) => entry.toLowerCase().endsWith(".webp")))
    crossArtwork.set(normalize(file.replace(/\.webp$/i,"")),asset(folder,file));
}
const abilityAliases = { BooulderThrow:"BoulderThrow", Buzzsaw:"BuzzSawArmAttachment", ChainGun:"Minigun", Inventory:"BackpackLarge", Pincers:"Pincer", RadiationPulse:"GammaGun", Scavenging:"Junk" };

function sharedArtwork(pack, name) {
  if (overrides[pack]?.[name]) return overrides[pack][name];
  if (pack === "creature-abilities") return crossArtwork.get(normalize(abilityAliases[name.replaceAll(" ","")] ?? name));
  if (pack === "robot-armor") {
    if (name === "Mister Gutsy Plating") return asset("Apparel","Mr. Gutsy.webp");
    if (name === "Standard Plating") return asset("Apparel","Mr Handy.webp");
    const location = name.match(/\(([^)]+)\)$/)?.[1];
    const component = {"Arm 1":"Mr Handy Arm 1.webp","Arm 2":"Mr Handy Arm 2.webp","Arm 3":"Mr Handy Arm 3.webp","Main Body":"Mr Handy Main Body.webp",Optics:"Mr Handy Optics.webp",Thruster:"Mr Handy Thrusters.webp"}[location];
    if (component) return asset("Apparel",component);
  }
  return null;
}

async function documents(language, pack) {
  const root = path.join("src", "packs", language, `${pack}.db`);
  return (await Promise.all((await readdir(root)).filter((file) => file.endsWith(".json"))
    .map(async (file) => ({ file:path.join(root,file), document:JSON.parse(await readFile(path.join(root,file),"utf8")) }))))
    .filter((entry) => /^!(?:items|actors|tables)![^.!]+$/.test(entry.document._key ?? ""));
}

async function assertAsset(image) {
  await access(decodeURIComponent(image.slice(modulePrefix.length)));
}

for (const image of new Set(Object.values(overrides).flatMap(Object.values))) await assertAsset(image);

for (const language of ["en", "fr"]) {
  let dedicated = 0, shared = 0, placeholder = 0;
  for (const pack of PACKS) {
    const en = language === "en" ? null : new Map((await documents("en",pack.name)).map((entry) => [entry.document._id,entry.document]));
    for (const entry of await documents(language,pack.name)) {
      const canonical = language === "en" ? entry.document : en.get(entry.document._id);
      const source = entry.document.flags?.[MODULE_ID]?.source;
      if (!source) continue;
      const override = sharedArtwork(pack.name,canonical.name);
      if (override) {
        entry.document.img = override;
        Object.assign(source,{artworkReviewed:true,artworkStatus:"shared",artworkSource:`repository alias for ${canonical.name}`});
      } else if (entry.document.img?.startsWith(modulePrefix)) {
        Object.assign(source,{artworkReviewed:true,artworkStatus:source.artworkStatus ?? "dedicated"});
      } else Object.assign(source,{artworkReviewed:false,artworkStatus:"placeholder"});
      if (source.artworkStatus === "dedicated") dedicated++;
      else if (source.artworkStatus === "shared") shared++;
      else placeholder++;
      await writeFile(entry.file,`${JSON.stringify(entry.document,null,2)}\n`);
    }
  }

  const magazines = await documents(language,"books-and-magazines");
  const magazineByName = new Map(magazines.map((entry) => [entry.document.name,entry.document]));
  for (const entry of await documents(language,"perks")) {
    const magazine = magazineByName.get(entry.document.name);
    if (!magazine?.img?.startsWith(modulePrefix)) continue;
    entry.document.img = magazine.img;
    Object.assign(entry.document.flags[MODULE_ID].source,{artworkReviewed:true,artworkStatus:"shared",artworkSource:"associated Core magazine"});
    await writeFile(entry.file,`${JSON.stringify(entry.document,null,2)}\n`);
  }

  const consumables = new Map((await documents(language,"consumables")).map((entry) => [entry.document.name.replace(/^Mentats$/,"Mentat"),entry.document]));
  for (const entry of await documents(language,"addictions")) {
    const substance = consumables.get(entry.document.name);
    if (!substance?.img?.startsWith(modulePrefix)) continue;
    entry.document.img = substance.img;
    Object.assign(entry.document.flags[MODULE_ID].source,{artworkReviewed:true,artworkStatus:"shared",artworkSource:"associated consumable"});
    await writeFile(entry.file,`${JSON.stringify(entry.document,null,2)}\n`);
  }
  console.log(`Classified ${dedicated} dedicated, ${shared} shared, and ${placeholder} placeholder artwork references in ${language}.`);
}

// Paired documents always use the same illustration and classification.
for (const pack of PACKS) {
  const english = new Map((await documents("en",pack.name)).map((entry) => [entry.document._id,entry.document]));
  for (const entry of await documents("fr",pack.name)) {
    const source = english.get(entry.document._id);
    if (!source) throw new Error(`fr/${pack.name}/${entry.document._id}: missing English artwork source`);
    entry.document.img = source.img;
    const artwork = source.flags[MODULE_ID].source;
    Object.assign(entry.document.flags[MODULE_ID].source,{
      artworkReviewed:artwork.artworkReviewed,
      artworkStatus:artwork.artworkStatus,
      ...(artwork.artworkSource ? {artworkSource:artwork.artworkSource} : {})
    });
    await writeFile(entry.file,`${JSON.stringify(entry.document,null,2)}\n`);
  }
}
