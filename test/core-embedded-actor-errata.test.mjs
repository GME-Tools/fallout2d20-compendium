import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { FRENCH_CORE_ACTOR_NAMES } from "../scripts/data/french-core-actor-names.mjs";
import { FRENCH_CORE_EMBEDDED_NAMES } from "../scripts/data/french-core-embedded-names.mjs";

async function actors(language){const output=[];for(const pack of ["creatures","npcs"]){const dir=path.join("src","packs",language,`${pack}.db`);for(const file of await readdir(dir))if(file.endsWith(".json"))output.push(JSON.parse(await readFile(path.join(dir,file),"utf8")));}const reverse=new Map(Object.entries(FRENCH_CORE_ACTOR_NAMES).map(([en,fr])=>[fr,en]));return new Map(output.map(actor=>[language==="fr"?(reverse.get(actor.name)??actor.name):actor.name,actor]));}
const item=(actor,name)=>actor.items.find(entry=>entry.name===name||entry.name===FRENCH_CORE_EMBEDDED_NAMES[entry.type]?.[name]);

for(const language of ["en","fr"]) test(`${language} embedded actor data implements cumulative Core errata`,async()=>{
  const all=await actors(language);
  assert.match(item(all.get("Bloodbug"),"Butchery").system.effect,/blood sac|poche de sang/);
  assert.match(item(all.get("Bloatfly"),"Butchery").system.effect,/bloatfly gland|glande de mouche bouffie/);
  assert.match(item(all.get("Radscorpion"),"Butchery").system.effect,/stinger|dard/);
  assert.match(item(all.get("Stingwing"),"Butchery").system.effect,/barb|dard/);
  const acid=item(all.get("Mirelurk Queen"),"Acid Spray");assert.equal(acid.system.damage.rating,10);assert.equal(acid.system.damage.damageType.poison,true);assert.equal(acid.system.damage.damageEffect.radioactive.value,true);assert.equal(acid.system.damage.damageEffect.piercing.value,true);
  for(const name of ["Machine Gun Turret MK I","Machine Gun Turret MK III"])assert.equal(item(all.get(name),"Machine Gun").system.damage.damageEffect.stun.value,false);
  const sentry=all.get("Sentry Bot");assert.equal(item(sentry,"Self Destruct").system.damage.rating,6);assert.equal(item(sentry,"Self Destruct").system.damage.weaponQuality.blast.value,true);assert.ok(item(sentry,"Big"));
  const brute=all.get("Super Mutant Brute");assert.equal(item(brute,"Small Guns").system.tag,true);assert.equal(item(brute,"Pipe Bolt-Action Rifle").system.damage.weaponQuality.unreliable.value,true);
  const master=all.get("Super Mutant Master");assert.deepEqual([item(master,"Big Guns").system.value,item(master,"Big Guns").system.tag,item(master,"Unarmed").system.value,item(master,"Repair").system.value,item(master,"Speech").system.value,master.system.luckPoints],[4,true,4,2,2,3]);
  const synth=all.get("Synth");assert.deepEqual([item(synth,"Institute Laser").system.attribute,item(synth,"Institute Laser").system.skill,item(synth,"Institute Laser").system.damage.rating,item(synth,"Institute Laser").system.range],["body","guns",4,"close"]);
  const courser=all.get("Synth Courser");assert.equal(item(courser,"Melee Weapons").system.tag,false);assert.deepEqual([item(courser,"Institute Laser").system.attribute,item(courser,"Institute Laser").system.skill,item(courser,"Institute Laser").system.damage.rating],["per","energyWeapons",5]);
  for(const name of ["Synth Strider","Synth Trooper"])assert.equal(item(all.get(name),"Institute Laser").system.damage.rating,4);
  const elder=all.get("Elder");assert.deepEqual([item(elder,"Repair").system.value,item(elder,"Repair").system.tag,item(elder,"Unarmed Strike").system.damage.rating],[3,true,3]);
  const boss=all.get("Raider Boss");assert.deepEqual([item(boss,"Melee Weapons").system.value,item(boss,"Big Guns").system.value,item(boss,"Small Guns").system.value,boss.system.initiative.value],[3,2,4,21]);
  const wastelander=all.get("Wastelander");assert.deepEqual([item(wastelander,"Unarmed Strike").system.attribute,item(wastelander,"Machete").system.skill,item(wastelander,"Double-Barrel Shotgun").system.skill],["str","meleeWeapons","smallGuns"]);
});
