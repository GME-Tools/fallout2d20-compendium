import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { FRENCH_CORE_ACTOR_NAMES } from "../scripts/data/french-core-actor-names.mjs";
import { FRENCH_CORE_EMBEDDED_NAMES } from "../scripts/data/french-core-embedded-names.mjs";

async function actors(language){const output=[];for(const pack of ["denizens"]){const dir=path.join("generated", "source-packs",language,`${pack}.db`);for(const file of await readdir(dir))if(file.endsWith(".json"))output.push(JSON.parse(await readFile(path.join(dir,file),"utf8")));}const reverse=new Map(Object.entries(FRENCH_CORE_ACTOR_NAMES).map(([en,fr])=>[fr,en]));return new Map(output.map(actor=>[language==="fr"?(reverse.get(actor.name)??actor.name):actor.name,actor]));}
const item=(actor,name)=>actor.items.find(entry=>entry.name===name||entry.name===FRENCH_CORE_EMBEDDED_NAMES[entry.type]?.[name]);

for(const language of ["en","fr"]) test(`${language} embedded actor data implements cumulative Core errata`,async()=>{
  const all=await actors(language);
  assert.match(item(all.get("Bloodbug"),"Blood Sac").system.description,/blood sac|poche de sang/);
  assert.match(item(all.get("Bloatfly"),"Bloatfly Gland").system.description,/bloatfly gland|glande de mouche bouffie/);
  assert.match(item(all.get("Radscorpion"),"Radscorpion Stinger").system.description,/stinger|dard/);
  assert.match(item(all.get("Stingwing"),"Stingwing Barb").system.description,/barb|dard/);
  const acid=item(all.get("Mirelurk Queen"),"Acid Spray");assert.equal(acid.system.damage.rating,10);assert.equal(acid.system.damage.damageType.poison,true);assert.equal(acid.system.damage.damageType.radiation,false);assert.equal(acid.system.damage.damageEffect.radioactive.value,true);assert.equal(acid.system.damage.damageEffect.piercing.value,true);
  assert.ok(item(all.get("Mongrel Dog"),"Immune to Radiation"));
  assert.equal(all.get("Mongrel Dog").system.immunities.radiation,true);
  assert.match(item(all.get("Mole Rat"),"Keen Senses").system.description,/above ground|à la surface/);
  assert.equal(all.get("Radscorpion").system.butchery.rare,0);
  assert.doesNotMatch(item(all.get("Radscorpion"),"Radscorpion Meat").system.description,/rare material|matériau rare/);
  assert.equal(item(all.get("Radstag"),"Immune to Radiation"),undefined);
  for(const name of ["Machine Gun Turret MK I","Machine Gun Turret MK III"])assert.equal(item(all.get(name),"Machine Gun").system.damage.damageEffect.stun.value,false);
  const threeShotTurret=all.get("Machine Gun Turret 3-Shot (Wall Mount)");
  assert.equal(threeShotTurret.system.guns.value,5);
  const threeShotAttack=item(threeShotTurret,"Machine Gun");
  assert.deepEqual([threeShotAttack.system.attribute,threeShotAttack.system.skill,threeShotTurret.system.body.value+threeShotTurret.system.guns.value],["body","guns",13]);
  const nanny=all.get("Miss Nanny");
  assert.deepEqual([item(nanny,"Big Guns").system.value,item(nanny,"Big Guns").system.tag,item(nanny,"Big Guns").system.defaultAttribute],[3,true,"end"]);
  assert.deepEqual([item(nanny,"Medicine").system.value,item(nanny,"Medicine").system.tag,item(nanny,"Repair").system.value,item(nanny,"Speech").system.tag],[2,true,1,false]);
  assert.deepEqual([item(nanny,"Pincer").system.damage.rating,item(nanny,"Pincer").system.range,item(nanny,"Buzzsaw").system.range],[2,"",""]);
  assert.deepEqual([item(nanny,"Flamer").system.attribute,item(nanny,"Flamer").system.skill],["end","bigGuns"]);
  const sentry=all.get("Sentry Bot");assert.equal(item(sentry,"Self Destruct").system.damage.rating,6);assert.equal(item(sentry,"Self Destruct").system.damage.weaponQuality.blast.value,true);assert.ok(item(sentry,"Big"));
  const chainGun=item(sentry,"Chain Gun");assert.equal(chainGun.system.damage.damageEffect.burst.value,true);assert.equal(chainGun.system.damage.weaponQuality.blast.value,false);
  assert.equal(item(sentry,"Self Destruct").system.damage.damageEffect.vicious.value,false);
  assert.equal(item(sentry,"Missile Launcher").system.damage.weaponQuality.twoHanded.value,false);
  const protectron=all.get("Protectron");
  for(const ability of ["Fire Hazard Detection","Holster Your Weapon","Health and Safety","Defibrillator","Subway Token"])assert.ok(item(protectron,ability),ability);
  assert.match(item(protectron,"Defibrillator").system.description,/(?:TN|SR) 7/);
  const brute=all.get("Super Mutant Brute");assert.equal(item(brute,"Small Guns").system.tag,true);assert.equal(item(brute,"Pipe Bolt-Action Rifle").system.damage.weaponQuality.unreliable.value,true);
  const mutant=all.get("Super Mutant");assert.equal(item(mutant,"Pipe Bolt-Action Rifle").system.damage.weaponQuality.unreliable.value,true);
  assert.equal(item(all.get("Super Mutant Behemoth"),"Barbarian"),undefined);
  const master=all.get("Super Mutant Master");assert.deepEqual([item(master,"Big Guns").system.value,item(master,"Big Guns").system.tag,item(master,"Unarmed").system.value,item(master,"Repair").system.value,item(master,"Speech").system.value,master.system.luckPoints],[4,true,4,2,2,3]);
  assert.equal(item(master,"Small Guns").system.tag,false);
  assert.match(item(master,"Inventory").system.effect,/2 (?:CD|DC) (?:Junk Items|objets de bric-à-brac)/);
  const suicider=all.get("Super Mutant Suicider");assert.deepEqual([item(suicider,"Unarmed Strike").system.damage.rating,item(suicider,"Pipe Bolt-Action").system.attribute,item(suicider,"Pipe Bolt-Action").system.damage.weaponQuality.unreliable.value],[4,"agi",true]);
  const synth=all.get("Synth");assert.deepEqual([item(synth,"Institute Laser").system.attribute,item(synth,"Institute Laser").system.skill,item(synth,"Institute Laser").system.damage.rating,item(synth,"Institute Laser").system.range],["body","guns",4,"close"]);
  const courser=all.get("Synth Courser");assert.equal(item(courser,"Melee Weapons").system.tag,false);assert.deepEqual([item(courser,"Institute Laser").system.attribute,item(courser,"Institute Laser").system.skill,item(courser,"Institute Laser").system.damage.rating],["per","energyWeapons",5]);
  for(const name of ["Synth Strider","Synth Trooper"])assert.equal(item(all.get(name),"Institute Laser").system.damage.rating,4);
  for(const name of ["Synth Strider","Synth Trooper"]){
    const inventory=item(all.get(name),"Inventory").system.effect;
    assert.match(inventory,/Synth Helmet ×1|Casque d’armure de synthétique robuste ×1/);
    assert.match(inventory,/Synth Chest Piece ×1|Plastron d’armure de synthétique robuste ×1/);
    assert.match(inventory,/Synth Leg ×2|Jambes d’armure de synthétique robuste ×2/);
    assert.match(inventory,/Synth Arm ×2|Bras d’armure de synthétique robuste ×2/);
    assert.doesNotMatch(inventory,/Heavy Synth armor|Armure de synthétique lourde/);
  }
  const elder=all.get("Elder");assert.deepEqual([item(elder,"Repair").system.value,item(elder,"Repair").system.tag,item(elder,"Unarmed Strike").system.damage.rating],[3,true,3]);
  const paladin=all.get("Paladin");
  assert.match(item(paladin,"Well Equipped").system.description,/Once per combat|Une fois par combat/);
  assert.doesNotMatch(item(paladin,"Well Equipped").system.description,/Twice per combat|Deux fois par combat/);
  assert.deepEqual(paladin.flags["fallout2d20-compendium"].powerArmorProfile,{personalStrength:7,armorStrength:11,locationHealth:{arms:10,head:10,legs:10,torso:17}});
  assert.match(item(paladin,"Power Armor").system.description,/STR is 7|FOR propre[^<]*7/);
  assert.match(item(paladin,"Power Armor").system.description,/10 Arms|10 aux bras/);
  for(const [actorName,weaponName] of [["Elder","Long Laser Rifle"],["Knight","Long Laser Rifle"],["Paladin","Improved Long Laser Rifle"],["Lancer","Long Laser Rifle"]]){
    const laser=item(all.get(actorName),weaponName);
    assert.doesNotMatch(`${laser.system.description} ${laser.system.mods.list}`,/laser musket|mousquet laser|hand-crank|crank capacitor/i);
    assert.match(laser.system.mods.list,/Photon Agitator|Agitateur de photons/);
    assert.match(laser.system.mods.list,/Recoil Compensating Stock|Crosse à compensateur de recul/);
  }
  const boss=all.get("Raider Boss");assert.deepEqual([item(boss,"Melee Weapons").system.value,item(boss,"Big Guns").system.value,item(boss,"Small Guns").system.value,boss.system.initiative.value],[3,2,4,21]);
  const bossRifle=item(boss,"Hunting Rifle");assert.deepEqual([bossRifle.system.attribute,bossRifle.system.skill,boss.system.attributes.agi.value+item(boss,"Small Guns").system.value],["agi","smallGuns",12]);
  const veteran=all.get("Raider Veteran");assert.deepEqual([veteran.system.health.value,veteran.system.health.max],[21,21]);assert.ok(item(veteran,"Combat Rifle"));
  for(const actorName of ["Gunner","Mercenary"])assert.ok(item(all.get(actorName),"Combat Rifle"));
  assert.ok(all.get("Institute Scientist"));
  const merchantInventory=item(all.get("Merchant"),"Inventory").system.effect;
  for(const expected of [/Double-Barrel Shotgun|Fusil à canon scié/,/Molotov/,/Drifter Outfit|Tenue de vagabond/,/10mm Auto Pistol|Pistolet automatique 10 mm/,/Wealth 6|Richesse 6/])assert.match(merchantInventory,expected);
  const wastelander=all.get("Wastelander");assert.deepEqual([item(wastelander,"Unarmed Strike").system.attribute,item(wastelander,"Machete").system.skill,item(wastelander,"Double-Barrel Shotgun").system.skill],["str","meleeWeapons","smallGuns"]);
  assert.deepEqual([wastelander.system.meleeDamage.base,item(wastelander,"Machete").system.damage.rating,item(wastelander,"Unarmed Strike").system.fireRate],[0,3,0]);
  assert.match(item(wastelander,"Inventory").system.effect,/Road Leathers|Cuirs de route/);
});
