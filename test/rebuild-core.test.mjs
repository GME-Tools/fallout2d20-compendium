import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the Core rebuild excludes destructive migration and seed commands",async()=>{
  const source=await readFile("scripts/rebuild-core.mjs","utf8");
  assert.doesNotMatch(source,/seed-french-core-baseline/);
  assert.doesNotMatch(source,/import-legacy/);
  for(const unsafe of ["localize-french-apparel-names","localize-french-health-items","localize-french-conditions","localize-french-magazines-series"]){assert.doesNotMatch(source,new RegExp(unsafe));}
  for(const required of ["create-core-crafting-stations","localize-french-armor-support","clean-french-pdf-extraction-bleed","apply-core-object-recipes","apply-core-equipment-recipes","apply-core-weapon-mod-recipes","apply-core-actor-errata","apply-core-embedded-actor-errata","create-core-roll-tables"]){assert.match(source,new RegExp(required));}
});
