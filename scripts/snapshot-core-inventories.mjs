import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CORE_EQUIPMENT_RECIPES } from "./data/core-equipment-recipes.mjs";
import { CORE_OBJECT_RECIPES } from "./data/core-object-recipes.mjs";
import { CORE_WEAPON_MOD_RECIPES } from "./data/core-weapon-mod-recipes.mjs";

const root = path.join("src", "packs", "en");
const source = "Fallout: The Roleplaying Game Core Rulebook (errata V6, February 2026)";

async function documents(pack) {
  const directory = path.join(root, `${pack}.db`);
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
  return Promise.all(files.map(async (file) => JSON.parse(await readFile(path.join(directory, file), "utf8"))));
}

function entry(document) {
  return { id: document._id, name: document.name, type: document.type ?? "RollTable" };
}

async function packEntries(pack, filter = () => true) {
  return (await documents(pack)).filter(filter).map(entry).sort((a, b) => a.id.localeCompare(b.id));
}

async function save(name, value) {
  await mkdir("catalog", { recursive: true });
  await writeFile(path.join("catalog", name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const equipmentPacks = [
  "ammunition", "weapons", "weapon-mods", "apparel", "apparel-mods", "robot-armor",
  "robot-modules", "consumables", "books-and-magazines", "miscellany"
];
const equipment = {
  schemaVersion: 1,
  source,
  scope: "All draggable equipment in the Core Rulebook; recipes are inventoried separately in the survival and crafting catalog.",
  packs: Object.fromEntries(await Promise.all(equipmentPacks.map(async (pack) => [pack, await packEntries(pack)])))
};

const survival = {
  schemaVersion: 1,
  source,
  scope: "Core survival hazards, crafting stations and every Core crafting-table row represented by a draggable product.",
  addictions: await packEntries("addictions"),
  diseases: await packEntries("diseases"),
  craftingStations: await packEntries("crafting-stations"),
  recipes: {
    objects: CORE_OBJECT_RECIPES,
    equipment: CORE_EQUIPMENT_RECIPES,
    weaponMods: CORE_WEAPON_MOD_RECIPES
  },
  rollTables: await packEntries("roll-tables", (document) => document._key === `!tables!${document._id}`)
};

const actorEntry = (document) => ({
  ...entry(document),
  adventure: document.flags?.["fallout2d20-compendium"]?.source?.adventure === true,
  ...(document.flags?.["fallout2d20-compendium"]?.source?.page
    ? { page: document.flags["fallout2d20-compendium"].source.page }
    : {})
});
const denizens = {
  schemaVersion: 1,
  source,
  scope: "All Core creature abilities, creatures, NPC profiles, and the unique profiles introduced by the included adventure.",
  creatureAbilities: await packEntries("creature-abilities"),
  creatures: (await documents("creatures")).map(actorEntry).sort((a, b) => a.id.localeCompare(b.id)),
  npcs: (await documents("npcs")).map(actorEntry).sort((a, b) => a.id.localeCompare(b.id))
};

await save("v1-core-equipment.json", equipment);
await save("v1-core-survival-and-crafting.json", survival);
await save("v1-core-denizens.json", denizens);
console.log(`Snapshotted ${equipmentPacks.length} equipment packs, ${CORE_OBJECT_RECIPES.length + CORE_EQUIPMENT_RECIPES.length + CORE_WEAPON_MOD_RECIPES.length} recipe rows, and ${denizens.creatures.length + denizens.npcs.length} actor profiles.`);
