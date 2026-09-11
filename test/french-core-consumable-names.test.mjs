import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { FRENCH_CORE_CONSUMABLE_NAMES, FRENCH_CORE_CONSUMABLE_NAME_DOUBTS } from "../scripts/data/french-core-consumable-names.mjs";

test("every Core consumable has either an official French name or a documented doubt",async()=>{
  const root="generated/source-packs/fr/consumables.db",documents=await Promise.all((await readdir(root)).filter(file=>file.endsWith(".json")).map(file=>readFile(path.join(root,file),"utf8").then(JSON.parse)));
  const roots=documents.filter(document=>/^!items![^.!]+$/.test(document._key??"")&&document.flags?.["fallout2d20-compendium"]?.source?.book==="core_rulebook"),covered=new Set([...Object.keys(FRENCH_CORE_CONSUMABLE_NAMES),...Object.keys(FRENCH_CORE_CONSUMABLE_NAME_DOUBTS)]);
  assert.equal(roots.length,146); assert.equal(covered.size,146);
  for(const document of roots){assert.ok(covered.has(document._id),document._id);if(FRENCH_CORE_CONSUMABLE_NAMES[document._id]){assert.equal(document.name,FRENCH_CORE_CONSUMABLE_NAMES[document._id]);assert.equal(document.flags["fallout2d20-compendium"].source.nameTranslationReviewed,true);}}
});
