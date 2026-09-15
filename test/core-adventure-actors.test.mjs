import test from"node:test";import assert from"node:assert/strict";import{readFile,readdir}from"node:fs/promises";import path from"node:path";
const expected={
  AdvGhoulJoseph01:{pack:"denizens",name:"Joseph, Ghoul",fr:"Joseph, goule",level:2,hp:14,page:"405-406"},AdvQuartermaster:{pack:"denizens",name:"Quartermaster",fr:"Intendant",level:4,hp:15,page:"407-408"},AdvScavenger0001:{pack:"denizens",name:"Scavenger",fr:"Récupérateur",level:2,hp:8,page:"407"},
  AdvSynthReplica1:{pack:"denizens",name:"Synth Replica",fr:"Copie synthétique",level:4,hp:10,page:"411"},AdvJessiePedigru:{pack:"denizens",name:"Jessie Pedigrue, Synth Replica",fr:"Jessie Pedigrue, copie synthétique",level:4,hp:16,page:"412-413"},AdvSynthStrider1:{pack:"denizens",name:"Institute Compound Synth Strider",fr:"Synthétique marcheur du complexe de l’Institut",level:7,hp:13,page:"414-415"},
  AdvIncompleteSyn:{pack:"denizens",name:"Incomplete Synth",fr:"Synthé incomplet",level:2,hp:8,page:"416-417"},AdvChiefScient01:{pack:"denizens",name:"Chief Scientist",fr:"Responsable scientifique",level:2,hp:14,page:"416-417"},AdvSynthRepFinal:{pack:"denizens",name:"Synth Replicas (Doppelgangers)",fr:"Copies synthétiques (sosies)",level:4,hp:10,page:"417-418"}
};
async function docs(language,pack){const map=new Map();for(const file of await readdir(`generated/source-packs/${language}/${pack}.db`)){if(!file.endsWith(".json"))continue;const d=JSON.parse(await readFile(path.join(`generated/source-packs/${language}/${pack}.db`,file),"utf8"));if(d.flags?.["fallout2d20-compendium"]?.source?.adventure)map.set(d._id,d)}return map}
test("Core adventure exposes all nine bilingual draggable actor profiles",async()=>{const maps={};for(const language of["en","fr"])for(const pack of["denizens"])maps[`${language}/${pack}`]=await docs(language,pack);assert.equal(maps["en/denizens"].size,9);assert.equal(maps["fr/denizens"].size,9);for(const[id,spec]of Object.entries(expected)){const en=maps[`en/${spec.pack}`].get(id),fr=maps[`fr/${spec.pack}`].get(id);assert.ok(en&&fr,id);assert.equal(en.name,spec.name);assert.equal(fr.name,spec.fr);assert.equal(en.system.level.value,spec.level);assert.equal(en.system.health.value,spec.hp);assert.equal(en.flags["fallout2d20-compendium"].source.page,spec.page);assert.equal(fr.system.level.value,en.system.level.value);assert.equal(fr.system.health.value,en.system.health.value);assert.notEqual(fr.system.biography,en.system.biography);assert.ok(en.items.length>0);assert.equal(fr.items.length,en.items.length);const frItems=new Map(fr.items.map(i=>[i._id,i]));for(const item of en.items){const translated=frItems.get(item._id);assert.ok(translated,`${id}/${item.name}`);for(const field of["description","effect"])if(item.system?.[field])assert.notEqual(translated.system?.[field],item.system[field],`${id}/${item.name}/${field}`)}}});

test("Joseph has the complete Act I skill and attack profile",async()=>{
  for(const language of["en","fr"]){
    const joseph=(await docs(language,"denizens")).get("AdvGhoulJoseph01");
    const bySource=id=>joseph.items.find(item=>item.flags?.core?.sourceId?.endsWith(`Item.${id}`));
    assert.deepEqual([bySource("HEegw2EUmmEzfdDM").system.value,bySource("HEegw2EUmmEzfdDM").system.tag],[1,false]);
    assert.deepEqual([bySource("UQ4TLtVUR2kRlYkb").system.value,bySource("UQ4TLtVUR2kRlYkb").system.tag],[2,false]);
    assert.equal(joseph.items.find(item=>item._id==="O0GOoAmCfcN8pf1i").system.fireRate,0);
  }
});

test("Act II Scavenger and Jessie profiles match their printed mechanics",async()=>{
  for(const language of["en","fr"]){
    const adventure=await docs(language,"denizens");
    const scavenger=adventure.get("AdvScavenger0001");
    assert.equal(scavenger.items.find(item=>item._id==="O0GOoAmCfcN8pf1i").system.fireRate,0);
    const jessie=adventure.get("AdvJessiePedigru");
    const bySource=id=>jessie.items.find(item=>item.flags?.core?.sourceId?.endsWith(`Item.${id}`));
    assert.deepEqual([bySource("F4uIprrKWh9ApMaU").system.value,bySource("F4uIprrKWh9ApMaU").system.tag],[2,false]);
    assert.deepEqual([bySource("R8YnBNUwhZhG89iQ").system.value,bySource("R8YnBNUwhZhG89iQ").system.tag],[1,false]);
    assert.equal(jessie.items.find(item=>item._id==="O0GOoAmCfcN8pf1i").system.damage.rating,2);
    const baton=jessie.items.find(item=>item._id==="A77iQQLjMKpTG4D1");
    assert.deepEqual([baton.system.attribute,baton.system.skill,baton.system.damage.rating,baton.system.damage.damageType.energy,baton.system.damage.damageEffect.stun.value,baton.system.range],["str","meleeWeapons",6,true,true,""]);
    assert.match(baton.name,/Stun Baton|Matraque étourdissante/);
    for(const id of["R1cEgj76GzWZz47l","f89CMk7Rc3bLagZJ","zGniGCOK3g4EsDsY","cmiI9eWQ1hYPuqv2","F3rxaIUI94K7YRig"])assert.doesNotMatch(jessie.items.find(item=>item._id===id).system.description,/synth courser/i);
  }
});

test("Act III Chief Scientist and Incomplete Synth profiles match their printed mechanics",async()=>{
  for(const language of["en","fr"]){
    const adventure=await docs(language,"denizens");
    const chief=adventure.get("AdvChiefScient01");
    const skill=id=>chief.items.find(item=>item.flags?.core?.sourceId?.endsWith(`Item.${id}`));
    for(const id of["vf1Qszkq1om2Xgmn","ejKiqeUyjkahCjQf","HEegw2EUmmEzfdDM","R8YnBNUwhZhG89iQ"])assert.deepEqual([skill(id).system.value,skill(id).system.tag],[1,false]);
    assert.equal(chief.items.find(item=>item._id==="Obo2f509R1akLpHQ").system.damage.damageEffect.vicious.value,false);
    const incomplete=adventure.get("AdvIncompleteSyn");
    assert.equal(incomplete.items.find(item=>item._id==="O0GOoAmCfcN8pf1i").system.fireRate,0);
  }
});
