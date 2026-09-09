import assert from "node:assert/strict";
import { readFile,readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { FRENCH_CORE_ACTOR_BIOGRAPHY_SOURCES } from "../scripts/data/french-core-actor-biography-sources.mjs";

async function load(language,pack){const dir=path.join("generated", "source-packs",language,`${pack}.db`);return Promise.all((await readdir(dir)).filter(f=>f.endsWith(".json")).map(async f=>JSON.parse(await readFile(path.join(dir,f),"utf8"))));}
test("all Core actors have source-backed French biographies and origins",async()=>{const en=(await load("en","denizens")).filter(d=>d.flags?.["fallout2d20-compendium"]?.source?.book==="core_rulebook"),fr=new Map((await load("fr","denizens")).map(d=>[d._id,d]));assert.equal(Object.keys(FRENCH_CORE_ACTOR_BIOGRAPHY_SOURCES).length,66);for(const source of en){const translated=fr.get(source._id);assert.ok(translated.system.biography.replace(/<[^>]+>/g,"").length>=45,source.name);assert.notEqual(translated.system.biography,source.system.biography,source.name);assert.ok(translated.system.origin!==source.system.origin||source.system.origin==="Robot",source.name);assert.equal(translated.flags["fallout2d20-compendium"].source.biographyTranslationReviewed,true);}});
