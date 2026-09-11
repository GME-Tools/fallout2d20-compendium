import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function documents(language, pack) {
  const directory = path.resolve("generated/source-packs", language, `${pack}.db`);
  return Promise.all((await readdir(directory)).filter(file => file.endsWith(".json")).map(async file => JSON.parse(await readFile(path.join(directory, file), "utf8"))));
}

const root = document => /^!(?:actors|items|tables)![^.!]+$/.test(document._key ?? "");

test("Astoundingly Awesome Tales has bilingual identity parity without reprint duplicates", async () => {
  for (const pack of ["denizens","apparel","consumables","miscellany","robot-modules","weapons","roll-tables"]) {
    const [en, fr] = await Promise.all([documents("en",pack),documents("fr",pack)]);
    const aat = list => list.filter(document => root(document) && String(document.flags?.["fallout2d20-compendium"]?.source?.book ?? "").startsWith("astoundingly_awesome_tales"));
    assert.deepEqual(new Set(aat(en).map(document => document._id)),new Set(aat(fr).map(document => document._id)),pack);
  }
  const actors = (await documents("en","denizens")).filter(document => root(document) && document.img?.includes("Astoundingly%20Awesome%20Tales"));
  assert.equal(actors.length,38);
  assert.equal(new Set(actors.map(document => document._id)).size,38);
});

test("the collection is authoritative while first appearance and French translation status remain explicit", async () => {
  const [en,fr] = await Promise.all([documents("en","denizens"),documents("fr","denizens")]);
  const xuvian = en.find(document => document.name === "Xuvian Stalker");
  assert.equal(xuvian.system.source,"astoundingly_awesome_tales_4");
  assert.deepEqual(xuvian.flags["fallout2d20-compendium"].source.appearances.map(entry => [entry.book,entry.status]),[["astoundingly_awesome_tales_1_5","identical"]]);
  assert.equal(fr.find(document => document._id === xuvian._id).flags["fallout2d20-compendium"].source.translation,"project");
  assert.equal(fr.find(document => document.name.includes("Jovaughna")).flags["fallout2d20-compendium"].source.translation,"official");
});

test("approved table correction covers 1–20 exactly and all result weights match ranges", async () => {
  const tables = await documents("en","roll-tables");
  const table = tables.find(document => document.name === "Robot Assassin Table");
  assert.ok(table);
  const results = table.results;
  assert.deepEqual(results.map(result => result.range),[[1,5],[6,10],[11,17],[18,20]]);
  assert.deepEqual(results.flatMap(result => Array.from({length:result.range[1]-result.range[0]+1},(_,i)=>result.range[0]+i)),Array.from({length:20},(_,i)=>i+1));
  for (const result of results) assert.equal(result.weight,result.range[1]-result.range[0]+1);
});

test("critical mechanics, metric overlays, folders and official artwork are preserved", async () => {
  const [enDenizens,frDenizens,enWeapons,frWeapons] = await Promise.all([documents("en","denizens"),documents("fr","denizens"),documents("en","weapons"),documents("fr","weapons")]);
  const warhorse = enDenizens.find(document => document.name === "Warhorse");
  assert.equal(warhorse.system.health.max,87);
  const xuvian = enDenizens.find(document => document.name === "Xuvian Stalker");
  assert.equal(xuvian.items.find(item => item.name === "Arm Blade").system.damage.rating,10);
  const ghoulifier = enWeapons.find(document => document.name.startsWith("Ghoulifier"));
  assert.equal(ghoulifier.system.damage.rating,4);
  assert.equal(frWeapons.find(document => document._id === ghoulifier._id).system.weight,ghoulifier.system.weight/2);
  const rachel = enDenizens.find(document => document.name === "Rachel");
  assert.equal(frDenizens.find(document => document._id === rachel._id).system.carryWeight.base,rachel.system.carryWeight.base/2);
  assert.match(rachel.img,/AAT%205\.webp$/);
  assert.equal(typeof rachel.folder,"string");
});
