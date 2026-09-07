import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID, SOURCE_ID, documentKey } from "./config.mjs";
import { slugify } from "./lib/files.mjs";

const sourceArgument = process.argv[2];
if (!sourceArgument) {
  console.error("Usage: node scripts/sync-system-baseline.mjs /path/to/foundryvtt-fallout");
  process.exit(2);
}

const systemRoot = path.resolve(sourceArgument);
const packsRoot = path.join(systemRoot, "data/packs");
const revision = await new Promise(resolve => {
  const head = path.join(systemRoot, ".git/HEAD");
  readFile(head, "utf8").then(async content => {
    const ref = content.trim().replace(/^ref: /, "");
    resolve(ref === content.trim() ? ref : (await readFile(path.join(systemRoot, ".git", ref), "utf8")).trim());
  }).catch(() => resolve("unknown"));
});

const mappings = {
  addictions: "addictions",
  ammunition: "ammunition",
  apparel: "apparel",
  apparel_mods: "apparel-mods",
  books_and_magz: "books-and-magazines",
  consumables: "consumables",
  diseases: "diseases",
  miscellany: "miscellany",
  perks: "perks",
  robot_modules: "robot-modules",
  skills: "skills",
  traits: "traits",
  weapon_mods: "weapon-mods",
  weapons: "weapons"
};

const targets = new Set([...Object.values(mappings), "apparel", "robot-armor"]);
for (const target of targets) {
  await rm(path.resolve("src/packs/en", `${target}.db`), { recursive: true, force: true });
}

const counts = {};
async function emit(target, document) {
  const directory = path.resolve("src/packs/en", `${target}.db`);
  await mkdir(directory, { recursive: true });
  document._key = documentKey("Item", document._id);
  document.flags ??= {};
  document.flags[MODULE_ID] = {
    ...document.flags[MODULE_ID],
    source: {
      book: SOURCE_ID,
      language: "en",
      upstream: "Muttley/foundryvtt-fallout",
      upstreamRevision: revision,
      errataReviewed: false
    }
  };
  const filename = `${slugify(document.name)}__${document._id}.json`;
  await writeFile(path.join(directory, filename), `${JSON.stringify(document, null, 2)}\n`);
  counts[target] = (counts[target] ?? 0) + 1;
}

for (const [upstream, defaultTarget] of Object.entries(mappings)) {
  const directory = path.join(packsRoot, `${upstream}.db`);
  for (const filename of (await readdir(directory)).filter(file => file.endsWith(".json")).sort()) {
    const document = JSON.parse(await readFile(path.join(directory, filename), "utf8"));
    if (document.system?.source !== SOURCE_ID) continue;
    const target = upstream === "apparel" && document.type === "robot_armor" ? "robot-armor" : defaultTarget;
    await emit(target, document);
  }
}

await mkdir("reports", { recursive: true });
await writeFile("reports/system-baseline.json", `${JSON.stringify({
  upstream: "https://github.com/Muttley/foundryvtt-fallout",
  revision,
  importedSource: SOURCE_ID,
  counts
}, null, 2)}\n`);
console.log(`Synchronized ${Object.values(counts).reduce((sum, count) => sum + count, 0)} Core documents from Fallout system revision ${revision}.`);
