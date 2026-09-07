import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { MODULE_ID, PACKS, packId } from "../scripts/config.mjs";

async function loadAll() {
  const documents = new Map();
  for (const language of ["en", "fr"]) for (const pack of PACKS) {
    const root = path.join("src", "packs", language, `${pack.name}.db`);
    for (const file of (await readdir(root)).filter((entry) => entry.endsWith(".json"))) {
      const document = JSON.parse(await readFile(path.join(root, file), "utf8"));
      const type = pack.type;
      documents.set(`Compendium.${MODULE_ID}.${packId(language, pack.name)}.${type}.${document._id}`, { language, pack:pack.name, document });
    }
  }
  return documents;
}

function strings(value, location = "", output = []) {
  if (typeof value === "string") output.push([location, value]);
  else if (Array.isArray(value)) value.forEach((entry, index) => strings(entry, `${location}[${index}]`, output));
  else if (value && typeof value === "object") for (const [key, entry] of Object.entries(value)) strings(entry, location ? `${location}.${key}` : key, output);
  return output;
}

const allDocuments = loadAll();

test("every module UUID resolves to a checked-in document", async () => {
  const documents = await allDocuments;
  let links = 0;
  for (const { language, pack, document } of documents.values()) for (const [location, value] of strings(document)) {
    for (const match of value.matchAll(/Compendium\.fallout2d20-compendium\.[A-Za-z0-9_-]+\.(?:Item|Actor|RollTable)\.[A-Za-z0-9]+/g)) {
      links++;
      assert.ok(documents.has(match[0]), `${language}/${pack}/${document.name}/${location}: unresolved ${match[0]}`);
      assert.match(match[0], new RegExp(`\\.${language}-`), `${language}/${pack}/${document.name}/${location}: cross-language ${match[0]}`);
    }
  }
  assert.ok(links >= 500, `unexpectedly low internal-link coverage: ${links}`);
});

test("all Core magazines and their perks are reciprocally linked in each language", async () => {
  const documents = await allDocuments;
  for (const language of ["en", "fr"]) {
    const magazines = [...documents.values()].filter((entry) => entry.language === language && entry.pack === "books-and-magazines");
    const perks = new Map([...documents.values()].filter((entry) => entry.language === language && entry.pack === "perks").map((entry) => [entry.document.name, entry.document]));
    assert.equal(magazines.length, 95);
    for (const { document:magazine } of magazines) {
      const perk = perks.get(magazine.name);
      assert.ok(perk, magazine.name);
      const perkUuid = `Compendium.${MODULE_ID}.${packId(language,"perks")}.Item.${perk._id}`;
      const magazineUuid = `Compendium.${MODULE_ID}.${packId(language,"books-and-magazines")}.Item.${magazine._id}`;
      assert.match(magazine.system.description, new RegExp(perkUuid.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
      assert.deepEqual(perk.system.requirementsEx.magazineUuids, [magazineUuid]);
      assert.equal(perk.flags[MODULE_ID].source.magazineAutomationReviewed, true);
    }
  }
});

test("user-facing links do not depend on the Fallout system compendiums", async () => {
  const documents = await allDocuments;
  for (const { language, pack, document } of documents.values()) {
    for (const [location, value] of strings({ description:document.system?.description, effect:document.system?.effect, magazineUuids:document.system?.requirementsEx?.magazineUuids, modsList:document.system?.mods?.list }))
      assert.doesNotMatch(value, /Compendium\.fallout\./, `${language}/${pack}/${document.name}/${location}`);
  }
});
