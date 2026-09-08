import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID } from "./config.mjs";
import { FRENCH_CORE_ACTOR_NAMES } from "./data/french-core-actor-names.mjs";
import { FRENCH_CORE_EMBEDDED_NAMES } from "./data/french-core-embedded-names.mjs";
const frenchToEnglish=new Map(Object.entries(FRENCH_CORE_ACTOR_NAMES).map(([en,fr])=>[fr,en]));

const attackRules = {
  creatures: {
    Bloodbug: { Proboscis: ["body", "melee"] }, Brahmin: { Headbutt: ["body", "melee"] }, Deathclaw: { Slam: ["body", "melee"] },
    "Mirelurk Hunter": { Pincers: ["body", "melee"] }, "Mutant Hound": { Bite: ["body", "melee"] },
    Radscorpion: { Claws: ["body", "melee"], Sting: ["body", "melee"] }, "Glowing One": { Unarmed: ["body", "melee"] },
    Protectron: { "Arm Lasers": ["body", "guns"] }, "Sentry Bot": { "Missle Launcher": ["body", "guns"] },
  },
  npcs: {
    Elder: { "Long Laser Rifle": ["per", "energyWeapons"] }, Knight: { "Long Laser Rifle": ["per", "energyWeapons"] },
    Paladin: { "Improved Long Laser Rifle": ["per", "energyWeapons"] }, Scribe: { "Laser Pistol": ["per", "energyWeapons"] },
    Lancer: { "Long Laser Rifle": ["per", "energyWeapons"] }, "Raider Psycho": { "Molotov Cocktail": ["per", "explosives"] },
    "Children of Atom": { "Gamma Gun": ["per", "energyWeapons"] }, Gunner: { "Laser Gun": ["per", "energyWeapons"] },
    Mercenary: { "Double-Barrel Shotgun": ["agi", "smallGuns"], "Molotov Cocktail": ["per", "explosives"] },
    Minuteman: { "Laser Musket": ["per", "energyWeapons"] }, "Institute Scientist": { "Institute Laser": ["per", "energyWeapons"] },
    Merchant: { "Molotov Cocktail": ["per", "explosives"] }, "Super Mutant Suicider": { "Pipe Bolt-Action": ["per", "smallGuns"] }
  }
};

function item(actor, name) { return (actor.items ?? []).find(entry => entry.name === name || entry.name === FRENCH_CORE_EMBEDDED_NAMES[entry.type]?.[name]); }
function skill(actor, name, value, tag) { const entry = item(actor, name); if (!entry) throw new Error(`${actor.name}: missing ${name}`); if (value != null) entry.system.value = value; if (tag != null) entry.system.tag = tag; }
function damage(actor, name, rating) { const entry = item(actor, name); if (!entry) throw new Error(`${actor.name}: missing ${name}`); entry.system.damage.rating = rating; }
function toggle(object, path, value) { const parts=path.split("."); let target=object; for(const part of parts.slice(0,-1)) target=target[part] ??= {}; target[parts.at(-1)]=value; }
function setAttack(actor,name,{attribute,skill:skillName,rating,range,fireRate,types={},effects={},qualities={}}={}) { const attack=item(actor,name); if(!attack) throw new Error(`${actor.name}: missing ${name}`); if(attribute!=null)attack.system.attribute=attribute;if(skillName!=null)attack.system.skill=skillName;if(rating!=null)attack.system.damage.rating=rating;if(range!=null)attack.system.range=range;if(fireRate!=null)attack.system.fireRate=fireRate;for(const[k,v]of Object.entries(types))toggle(attack.system,`damage.damageType.${k}`,v);for(const[k,v]of Object.entries(effects))toggle(attack.system,`damage.damageEffect.${k}.value`,v);for(const[k,v]of Object.entries(qualities))toggle(attack.system,`damage.weaponQuality.${k}.value`,v);return attack; }
function inventory(actor, en, fr, language) { const entry=item(actor,"Inventory"); if(!entry) throw new Error(`${actor.name}: missing Inventory`); entry.system.effect=`<p>${language === "fr" ? fr : en}</p>`; }
function ensureSkill(actor,name,id,attribute) { let entry=item(actor,name); if(entry)return entry; entry={_id:id,name,type:"skill",img:"systems/fallout/assets/icons/items/skill.svg",system:{description:"",favorite:false,value:0,tag:false,defaultAttribute:attribute,summary:""},effects:[],folder:null};actor.items.push(entry);return entry; }

for (const language of ["en", "fr"]) for (const pack of ["creatures", "npcs"]) {
  const root = `src/packs/${language}/${pack}.db`;
  for (const file of (await readdir(root)).filter(file => file.endsWith(".json"))) {
    const target = path.join(root, file);
    const actor = JSON.parse(await readFile(target, "utf8"));
    const actorKey=language === "fr" ? (frenchToEnglish.get(actor.name)??actor.name) : actor.name;
    let dirty = false;
    for (const [name, [attribute, skillName]] of Object.entries(attackRules[pack][actorKey] ?? {})) {
      const attack = item(actor, name); if (!attack) throw new Error(`${actor.name}: missing attack ${name}`);
      attack.system.attribute = attribute; attack.system.skill = skillName; dirty = true;
    }
    if (actorKey === "Mister Handy" || actorKey === "Mister Gutsy") { const entry=item(actor,"Energy Weapons")??item(actor,"Big Guns"); entry.name="Big Guns"; entry.system.value=actorKey === "Mister Handy" ? 3 : 4; entry.system.tag=true; damage(actor,"Pincer",2); item(actor,"Flamer").system.attribute="end"; item(actor,"Flamer").system.skill="bigGuns"; dirty=true; }
    if (actorKey === "Super Mutant Behemoth") { actor.items = actor.items.filter(i => i.name !== "Missle Launcher"); dirty=true; }
    if (actorKey === "Raider Veteran") { damage(actor, "Molotov Cocktail", 4); dirty=true; }
    if (actorKey === "Lancer") { damage(actor, "Unarmed Strike", 2); dirty=true; }
    if (actorKey === "Gunner") { damage(actor, "Unarmed Strike", 2); dirty=true; }
    if (actorKey === "Zetan (Aliens)") { item(actor,"Alien Blaster").system.damage.weaponQuality.blast.value=false; dirty=true; }
    if (actorKey === "Scribe") { skill(actor,"Lockpick",1,null); dirty=true; }
    if (actorKey === "Children of Atom") { skill(actor,"Speech",null,true); dirty=true; }
    if (actorKey === "Minuteman") { skill(actor,"Energy Weapons",null,true); skill(actor,"Small Guns",2,false); skill(actor,"Survival",2,true); dirty=true; }
    if (actorKey === "Vault Dweller") { skill(actor,"Survival",null,false); dirty=true; }
    if (actorKey === "Bloodbug") { item(actor,"Butchery").system.effect=language === "fr" ? "<p>Un test réussi d’END + Survie de difficulté 0 rapporte 1 portion de viande de sanguinaire et 1 poche de sang.</p>" : "<p>A successful END + Survival test with a difficulty of 0 yields 1 portion of bloodbug meat and 1 blood sac.</p>"; dirty=true; }
    if (actorKey === "Bloatfly") { item(actor,"Butchery").system.effect=language === "fr" ? "<p>Un test réussi d’END + Survie de difficulté 0 rapporte 1 portion de viande de mouche bouffie et 1 glande de mouche bouffie.</p>" : "<p>A successful END + Survival test with a difficulty of 0 yields 1 portion of bloatfly meat and 1 bloatfly gland.</p>"; dirty=true; }
    if (actorKey === "Radscorpion") { item(actor,"Butchery").system.effect=language === "fr" ? "<p>Un test réussi d’END + Survie de difficulté 1 rapporte 2 DC portions de viande de radscorpion. Un Effet rapporte aussi 1 dard de radscorpion et 1 matériau rare ; deux Effets peuvent fournir un œuf de radscorpion à la place.</p>" : "<p>A successful END + Survival test with a difficulty of 1 yields 2 CD portions of radscorpion meat. An Effect also yields 1 radscorpion stinger and 1 rare material; two Effects may yield a radscorpion egg instead.</p>"; dirty=true; }
    if (actorKey === "Stingwing") { item(actor,"Butchery").system.effect=language === "fr" ? "<p>Un test réussi d’END + Survie de difficulté 0 rapporte 1 DC portions de viande de taon mutant. Un Effet rapporte aussi 1 dard de taon mutant.</p>" : "<p>A successful END + Survival test with a difficulty of 0 yields 1 CD portions of stingwing meat. An Effect also yields 1 stingwing barb.</p>"; dirty=true; }
    if (actorKey === "Mirelurk Queen") { setAttack(actor,"Acid Spray",{rating:10,types:{poison:true},effects:{piercing:true,radioactive:true}}); dirty=true; }
    if (actorKey === "Radstag") { setAttack(actor,"Antlers",{attribute:"body",skill:"melee"}); dirty=true; }
    if (actorKey === "Mister Handy") { item(actor,"Pincer").system.range=""; item(actor,"Buzzsaw").system.range=""; dirty=true; }
    if (actorKey === "Mister Gutsy") { item(actor,"Pincer").system.range=""; dirty=true; }
    if (actorKey === "Machine Gun Turret MK I" || actorKey === "Machine Gun Turret MK III") { toggle(item(actor,"Machine Gun").system,"damage.damageEffect.stun.value",false); dirty=true; }
    if (actorKey === "Sentry Bot") {
      if (!item(actor,"Self Destruct")) { const attack=structuredClone(item(actor,"Unarmed Strike")); attack._id="SentrySelfDst001"; attack.name="Self Destruct"; actor.items.push(attack); }
      setAttack(actor,"Self Destruct",{attribute:"body",skill:"melee",rating:6,types:{physical:true,energy:false,radiation:false,poison:false},qualities:{blast:true}});
      if (!item(actor,"Big")) actor.items.push({_id:"SentryBigAbility",name:"Big",type:"special_ability",img:"systems/fallout/assets/icons/mysterious-stranger.svg",system:{description:language === "fr" ? "<p>Le robot gagne +1 PV par niveau, sa Défense diminue de 1 (minimum 1) et il ne subit un coup critique que si une attaque inflige au moins 7 dégâts après résistance.</p>" : "<p>The robot gains +1 HP per level, its Defense decreases by 1 (minimum 1), and it suffers a Critical Hit only when an attack inflicts 7+ damage after resistance.</p>",favorite:false},effects:[],folder:null});
      dirty=true;
    }
    if (actorKey === "Super Mutant Brute") { skill(actor,"Small Guns",null,true); actor.system.resistance.energy.locations="2 (Head)"; toggle(item(actor,"Pipe Bolt-Action Rifle").system,"damage.weaponQuality.unreliable.value",true); dirty=true; }
    if (actorKey === "Super Mutant Master") { ensureSkill(actor,"Repair","SMasterRepair001","int"); ensureSkill(actor,"Speech","SMasterSpeech001","cha"); skill(actor,"Big Guns",4,true); skill(actor,"Unarmed",4,null); skill(actor,"Repair",2,null); skill(actor,"Speech",2,null); actor.system.luckPoints=3; actor.system.resistance.physical.locations="4 (All)"; actor.system.resistance.energy.locations="2 (Head); 4 (Arms, Legs, Torso)"; setAttack(actor,"Unarmed Strike",{attribute:"str",skill:"unarmed"}); setAttack(actor,"Minigun",{attribute:"end",skill:"bigGuns"}); setAttack(actor,"Missle Launcher",{attribute:"end",skill:"bigGuns"}); inventory(actor,"Minigun OR Missile Launcher, Assorted Human Bones (2 Junk Items), Wealth 1, Army Helmet, Sturdy Raider Chest Piece, Sturdy Raider Arms ×2, Sturdy Raider Legs ×2","Minigun OU Lance-missiles, Ossements humains variés (2 objets de bric-à-brac), Richesse 1, Casque militaire, Plastron de pillard robuste, Bras de pillard robustes ×2, Jambes de pillard robustes ×2",language); dirty=true; }
    if (actorKey === "Super Mutant Suicider") { inventory(actor,"Wealth 1, Pipe Bolt-Action Rifle. If killed before arming and detonating the mini nuke, 1 mini nuke can be looted; if killed by the explosion, the body instead yields 1 Rare Material.","Richesse 1, Fusil à verrou artisanal. S’il est tué avant d’armer et de faire exploser la mini-bombe nucléaire, celle-ci peut être récupérée ; s’il est tué par l’explosion, son corps rapporte à la place 1 matériau rare.",language); dirty=true; }
    if (actorKey === "Synth") { setAttack(actor,"Institute Laser",{attribute:"body",skill:"guns",rating:4,range:"close",fireRate:3,effects:{burst:true,vicious:true},qualities:{closeQuarters:true,inaccurate:true}}); dirty=true; }
    if (actorKey === "Synth Courser") { skill(actor,"Melee Weapons",null,false); setAttack(actor,"Institute Laser",{attribute:"per",skill:"energyWeapons",rating:5,range:"close",fireRate:3,effects:{burst:true,vicious:true,piercing:true},qualities:{inaccurate:true,twoHanded:true}}); item(actor,"Institute Laser").system.damage.damageEffect.piercing.rank=1; inventory(actor,"Synth Component, Heavy Synth Chest Piece, Heavy Synth Arm, Heavy Synth Leg, Institute Laser Rifle (Full Stock, Photon Agitator, Improved Barrel)","Composant de synthétique, Plastron de synthétique lourd, Bras de synthétique lourd, Jambe de synthétique lourde, Fusil laser de l’Institut (Crosse pleine, Agitateur de photons, Canon amélioré)",language); dirty=true; }
    if (actorKey === "Synth Strider" || actorKey === "Synth Trooper") { setAttack(actor,"Institute Laser",{attribute:"body",skill:"guns",rating:4,range:"medium",fireRate:3,effects:{burst:true,vicious:true}}); inventory(actor,`${actorKey === "Synth Strider" ? "Sturdy" : "Heavy"} Synth armor, Institute Laser Gun (Photon Agitator, Long Barrel, Short Scope), Shock Baton, 3d20 Fusion Cells`,`${actorKey === "Synth Strider" ? "Armure de synthétique robuste" : "Armure de synthétique lourde"}, Fusil laser de l’Institut (Agitateur de photons, Canon long, Lunette courte), Matraque électrique, 3d20 Cellules à fusion`,language); dirty=true; }
    if (actorKey === "Elder") { skill(actor,"Repair",3,true); actor.system.meleeDamage.base=1; damage(actor,"Unarmed Strike",3); dirty=true; }
    if (actorKey === "Raider") { actor.system.resistance.physical.locations="1 (Arms, Torso, Legs)"; actor.system.resistance.energy.locations="1 (Arms, Torso, Legs)"; dirty=true; }
    if (actorKey === "Raider Boss") { skill(actor,"Melee Weapons",3,true); skill(actor,"Big Guns",2,true); skill(actor,"Small Guns",4,true); actor.system.initiative.value=21; const grenade=item(actor,"Molotov Cocktail")??item(actor,"Frag Grenade"); grenade.name="Frag Grenade"; grenade.system.attribute="per"; grenade.system.skill="explosives"; setAttack(actor,"Hunting Rifle",{attribute:"per",skill:"smallGuns"}); dirty=true; }
    if (actorKey === "Merchant") { inventory(actor,"Double-Barrel Shotgun, Molotov Cocktail","Fusil à canon scié, Cocktail Molotov",language); dirty=true; }
    if (actorKey === "Wastelander") { setAttack(actor,"Unarmed Strike",{attribute:"str",skill:"unarmed"}); setAttack(actor,"Machete",{attribute:"str",skill:"meleeWeapons"}); setAttack(actor,"Double-Barrel Shotgun",{attribute:"agi",skill:"smallGuns"}); inventory(actor,"Machete, Double-Barrel Shotgun, 10+5 CD Shotgun Shells, Wealth 1","Machette, Fusil à canon scié, 10+5 DC Cartouches de fusil, Richesse 1",language); dirty=true; }
    if (dirty) {
      actor.flags[MODULE_ID].source.errata = "Fallout 2d20 Core Rulebook Errata, version 6.0 (February 2026)";
      actor.flags[MODULE_ID].source.errataReviewed = true;
      await writeFile(target, `${JSON.stringify(actor,null,2)}\n`);
    }
  }
}
console.log("Applied embedded attack, skill, damage, and inventory-removal errata in both languages.");
