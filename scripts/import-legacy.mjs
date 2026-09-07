import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { LEGACY_PACK_MAP, MODULE_ID, PACKS, SOURCE_ID, documentKey } from "./config.mjs";
import { slugify } from "./lib/files.mjs";

const SOURCE_ROOT = path.resolve("src/packs/en");
const LEGACY_ROOT = path.resolve("packs");
const packByName = new Map(PACKS.map(pack => [pack.name, pack]));

function migrateShape(value) {
  if (Array.isArray(value)) return value.map(migrateShape);
  if (!value || typeof value !== "object") return value;
  const migrated = {};
  for (const [key, child] of Object.entries(value)) {
    if (["permission", "data"].includes(key)) continue;
    migrated[key] = migrateShape(child);
  }
  if (value.data && !value.system) migrated.system = migrateShape(value.data);
  if (value.permission && !value.ownership) migrated.ownership = migrateShape(value.permission);
  return migrated;
}

function migrateDocument(document, pack) {
  const migrated = migrateShape(document);
  migrated._key = documentKey(pack.type, migrated._id);
  migrated.system ??= {};
  if (pack.type !== "RollTable") migrated.system.source ||= SOURCE_ID;
  migrated.flags ??= {};
  migrated.flags[MODULE_ID] = {
    ...migrated.flags[MODULE_ID],
    source: { book: SOURCE_ID, language: "en", importedFromLegacy: true }
  };
  return migrated;
}

async function writeDocument(packName, document) {
  const pack = packByName.get(packName);
  const directory = path.join(SOURCE_ROOT, `${packName}.db`);
  await mkdir(directory, { recursive: true });
  const filename = `${slugify(document.name)}__${document._id}.json`;
  await writeFile(path.join(directory, filename), `${JSON.stringify(migrateDocument(document, pack), null, 2)}\n`);
}

let imported = 0;
for (const [legacyName, targetName] of Object.entries(LEGACY_PACK_MAP)) {
  const content = await readFile(path.join(LEGACY_ROOT, `${legacyName}.db`), "utf8");
  for (const line of content.split(/\r?\n/).filter(Boolean)) {
    await writeDocument(targetName, JSON.parse(line));
    imported++;
  }
}

const actors = await readFile(path.join(LEGACY_ROOT, "creatures.db"), "utf8");
for (const line of actors.split(/\r?\n/).filter(Boolean)) {
  const document = JSON.parse(line);
  await writeDocument(document.type === "npc" ? "npcs" : "creatures", document);
  imported++;
}

console.log(`Imported ${imported} legacy documents into ${path.relative(process.cwd(), SOURCE_ROOT)}.`);
