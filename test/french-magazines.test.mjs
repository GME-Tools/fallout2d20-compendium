import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { FRENCH_MAGAZINE_SERIES_1 } from "../scripts/data/french-magazine-series-1.mjs";
import { FRENCH_MAGAZINE_SERIES_2 } from "../scripts/data/french-magazine-series-2.mjs";

async function load(pack,language){const dir=path.join("src","packs",language,`${pack}.db`);return new Map(await Promise.all((await readdir(dir)).filter(f=>f.endsWith(".json")).map(async f=>{const d=JSON.parse(await readFile(path.join(dir,f),"utf8"));return[d._id,d]})));}

test("first six Core magazine series and their perks are officially localized",async()=>{
  assert.equal(Object.keys(FRENCH_MAGAZINE_SERIES_1).length,52);
  for(const pack of ["perks","books-and-magazines"]){const en=await load(pack,"en"),fr=await load(pack,"fr");let found=0;for(const[id,source]of en){if(!FRENCH_MAGAZINE_SERIES_1[source.name])continue;const translated=fr.get(id);found++;assert.notEqual(translated.name,source.name);assert.notEqual(translated.system.description,source.system.description);assert.equal(translated.flags["fallout2d20-compendium"].source.translationReviewed,true);assert.equal(translated.flags["fallout2d20-compendium"].source.structuralBaseline,false);}assert.equal(found,52);}
});

test("all remaining Core publications and their perks are officially localized",async()=>{
  assert.equal(Object.keys(FRENCH_MAGAZINE_SERIES_2).length,43);
  for(const pack of ["perks","books-and-magazines"]){const en=await load(pack,"en"),fr=await load(pack,"fr");let found=0;for(const[id,source]of en){if(!FRENCH_MAGAZINE_SERIES_2[source.name])continue;const translated=fr.get(id);found++;assert.notEqual(translated.name,source.name);assert.notEqual(translated.system.description,source.system.description);assert.equal(translated.flags["fallout2d20-compendium"].source.translationReviewed,true);assert.equal(translated.flags["fallout2d20-compendium"].source.structuralBaseline,false);}assert.equal(found,43);}
});

test("the French Core magazine catalog is exhaustive",()=>{
  assert.equal(Object.keys(FRENCH_MAGAZINE_SERIES_1).length+Object.keys(FRENCH_MAGAZINE_SERIES_2).length,95);
});

test("French magazine corrections defer to the canonical English rule",()=>{
  assert.match(FRENCH_MAGAZINE_SERIES_1["The Lair of the Virgin Eaters"].effect,/\+10/);
});
