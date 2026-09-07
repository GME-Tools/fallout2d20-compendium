import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID } from "./config.mjs";
import { FRENCH_CORE_ACTOR_NAMES } from "./data/french-core-actor-names.mjs";
const frenchToEnglish=new Map(Object.entries(FRENCH_CORE_ACTOR_NAMES).map(([en,fr])=>[fr,en]));

const changes = {
  creatures: {
    Deathclaw: d => { d.system.health.value = d.system.health.max = 31; d.system.defense.value = 1; d.system.origin = "Mutated Lizard, Normal Creature"; },
    "Mutant Hound": d => { d.system.body.value = 6; d.system.mind.value = 4; },
    Radstag: d => { d.system.body.value = 6; d.system.health.value = d.system.health.max = 11; },
    "Glowing One": d => { d.system.health.value = d.system.health.max = 17; },
    Mirelurk: d => { d.system.level.currentXP = 52; },
    Radscorpion: d => { d.system.level.currentXP = 52; }
    ,Synth: d => { d.system.mind.value = 4; }
    ,"Machine Gun Turret MK V": d => { d.system.mind.value = 6; }
    ,"Zetan (Aliens)": d => { d.system.health.value = d.system.health.max = 15; }
    ,"Synth Trooper": d => { d.system.resistance.physical.locations = "3 (All)"; d.system.resistance.energy.locations = "4 (All)"; }
  },
  npcs: {
    "Mister Handy": d => { Object.assign(d.system.attributes, attrs([6,8,5,7,7,7,5])); d.system.health.value = d.system.health.max = 16; d.system.luckPoints = 3; },
    "Mister Gutsy": d => { Object.assign(d.system.attributes, attrs([6,9,7,5,7,8,4])); d.system.health.value = d.system.health.max = 18; d.system.initiative.value = 19; },
    Paladin: d => { d.system.health.value = d.system.health.max = 20; },
    "Children of Atom": d => { d.system.attributes.luc.value = 4; d.system.health.value = d.system.health.max = 12; },
    Wastelander: d => { Object.assign(d.system.attributes, attrs([6,5,7,4,5,5,4])); d.system.health.value = d.system.health.max = 9; d.system.initiative.value = 10; d.system.carryWeight.base = 210; },
    "Raider Scavver": d => { d.system.level.currentXP = 52; }
  }
};

function attrs(values) {
  return Object.fromEntries(["str","per","end","cha","int","agi","luc"].map((key, index) => [key, { value: values[index] }]));
}

for (const language of ["en", "fr"]) for (const [pack, handlers] of Object.entries(changes)) {
  const root = `src/packs/${language}/${pack}.db`;
  const seen = new Set();
  for (const file of (await readdir(root)).filter(file => file.endsWith(".json"))) {
    const target = path.join(root, file);
    const document = JSON.parse(await readFile(target, "utf8"));
    const canonicalName=language === "fr" ? (frenchToEnglish.get(document.name)??document.name) : document.name;
    const handler = handlers[canonicalName];
    if (!handler) continue;
    handler(document);
    document.flags[MODULE_ID].source.errata = "Fallout 2d20 Core Rulebook Errata, version 6.0 (February 2026)";
    document.flags[MODULE_ID].source.errataReviewed = true;
    await writeFile(target, `${JSON.stringify(document, null, 2)}\n`);
    seen.add(canonicalName);
  }
  const missing = Object.keys(handlers).filter(name => !seen.has(name));
  if (missing.length) throw new Error(`${language}/${pack}: missing errata targets: ${missing.join(", ")}`);
}
console.log("Applied scalar Core actor errata to paired English and French documents.");
