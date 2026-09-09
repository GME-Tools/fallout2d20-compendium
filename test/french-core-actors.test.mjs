import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { FRENCH_CORE_ACTOR_NAMES } from "../scripts/data/french-core-actor-names.mjs";

async function load(language,pack){const dir=path.join("generated", "source-packs",language,`${pack}.db`);return Promise.all((await readdir(dir)).filter(f=>f.endsWith(".json")).map(async f=>JSON.parse(await readFile(path.join(dir,f),"utf8"))));}
test("all Core actors have an explicit official French name",async()=>{const en=await load("en","denizens"),fr=new Map((await load("fr","denizens")).map(d=>[d._id,d]));assert.equal(Object.keys(FRENCH_CORE_ACTOR_NAMES).length,en.length);for(const source of en){const translated=fr.get(source._id);assert.equal(translated.name,FRENCH_CORE_ACTOR_NAMES[source.name],source.name);assert.equal(translated.flags["fallout2d20-compendium"].source.nameTranslationReviewed,true);}});
