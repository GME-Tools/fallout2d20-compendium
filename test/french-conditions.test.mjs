import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function load(language,pack){const dir=path.join("generated", "source-packs",language,`${pack}.db`);return new Map(await Promise.all((await readdir(dir)).filter(f=>f.endsWith(".json")).map(async f=>{const d=JSON.parse(await readFile(path.join(dir,f),"utf8"));return[d._id,d]})));}

test("all Core addictions and diseases have reviewed French text",async()=>{
  for(const [pack,count] of [["addictions",12],["diseases",20]]){const en=await load("en",pack),fr=await load("fr",pack);assert.equal(en.size,count);assert.equal(fr.size,count);for(const[id,source]of en){const translated=fr.get(id);assert.ok(translated);assert.notEqual(translated.system.description,source.system.description,source.name);assert.equal(translated.flags["fallout2d20-compendium"].source.translationReviewed,true);assert.equal(translated.flags["fallout2d20-compendium"].source.structuralBaseline,false);}}
});
