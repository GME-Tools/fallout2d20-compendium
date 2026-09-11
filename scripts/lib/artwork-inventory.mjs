import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID, PACKS, packId } from "../config.mjs";
import { getPublication } from "../data/publications.mjs";

export const INVENTORY_PATH = "artwork/inventory/artwork-inventory.jsonl";
export const CONTACT_SHEET_PATH = "artwork/inventory/contact-sheet.html";
export const EXPECTED_COUNT = 502;
export const PRIORITIES = Object.freeze(["P1", "P2", "P3", "P4"]);
export const REVIEW_STATES = Object.freeze(["pending-owner", "approved", "rejected", "blocked"]);
export const SOURCE_KINDS = Object.freeze(["owned-official-pdf", "owner-supplied-game-asset", "approved-modiphius-bethesda", "owner-approved-web", "generated-private", "repository-reviewed-asset", "none"]);
export const SHARING_STATES = Object.freeze(["none", "proposed-owner-validation-required", "approved", "rejected"]);

const rootKey = /^!(?:items|actors|tables)![^.!]+$/;
const clone = value => JSON.parse(JSON.stringify(value));
const normalize = value => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const uuid = (language, pack, type, id) => `Compendium.${MODULE_ID}.${packId(language, pack)}.${type}.${id}`;

async function loadPack(language, pack) {
  const directory = path.join("generated", "source-packs", language, `${pack.name}.db`);
  const files = (await readdir(directory)).filter(file => file.endsWith(".json")).sort();
  const documents = [];
  for (const file of files) {
    const document = JSON.parse(await readFile(path.join(directory, file), "utf8"));
    if (rootKey.test(document._key ?? "")) documents.push(document);
  }
  return documents;
}

function priority(pack, document) {
  if (pack === "denizens") return "P1";
  if (pack === "ammunition" || document.type === "weapon" || document.type === "apparel") return "P2";
  if (["consumables", "addictions", "diseases", "books-and-magazines", "roll-tables"].includes(pack)) return "P3";
  return "P4";
}

function pageLocator(source) {
  if (source.page === undefined || source.page === null || source.page === "") return null;
  const edition = getPublication(source.book).editions.en[0].id;
  return `${source.book}:${edition}:pages-${String(source.page).replaceAll(" ", "")}`;
}

function sharingKey(pack, name, allNames) {
  const normalized = normalize(name);
  if ((pack === "perks" || pack === "books-and-magazines") && allNames.magazines.has(normalized) && allNames.perks.has(normalized)) return `proposal-magazine-${normalized}`;
  const substance = normalized.replace(/s$/, "");
  if ((pack === "addictions" || pack === "consumables") && allNames.substances.has(substance)) return `proposal-substance-${substance}`;
  if (allNames.duplicates.has(normalized)) return `proposal-same-name-${normalized}`;
  return null;
}

export async function deriveInventory(includedIdentities = new Set()) {
  const loaded = new Map();
  for (const pack of PACKS) {
    loaded.set(`en/${pack.name}`, await loadPack("en", pack));
    loaded.set(`fr/${pack.name}`, await loadPack("fr", pack));
  }
  const placeholderNames = [];
  for (const pack of PACKS) for (const document of loaded.get(`en/${pack.name}`)) {
    if (document.flags?.[MODULE_ID]?.source?.artworkStatus === "placeholder") placeholderNames.push(normalize(document.name));
  }
  const frequencies = new Map();
  for (const name of placeholderNames) frequencies.set(name, (frequencies.get(name) ?? 0) + 1);
  const addictionNames = new Set(loaded.get("en/addictions").map(document => normalize(document.name).replace(/s$/, "")));
  const consumableNames = new Set(loaded.get("en/consumables").map(document => normalize(document.name).replace(/s$/, "")));
  const allNames = {
    duplicates: new Set([...frequencies].filter(([, count]) => count > 1).map(([name]) => name)),
    magazines: new Set(loaded.get("en/books-and-magazines").map(document => normalize(document.name))),
    perks: new Set(loaded.get("en/perks").map(document => normalize(document.name))),
    substances: new Set([...addictionNames].filter(name => consumableNames.has(name)))
  };
  const rows = [];
  for (const pack of PACKS) {
    const french = new Map(loaded.get(`fr/${pack.name}`).map(document => [document._id, document]));
    for (const english of loaded.get(`en/${pack.name}`)) {
      const source = english.flags?.[MODULE_ID]?.source;
      const identity = `${pack.name}:${english._id}`;
      if (source?.artworkStatus !== "placeholder" && !includedIdentities.has(identity)) continue;
      const translated = french.get(english._id);
      if (!translated) throw new Error(`${pack.name}/${english._id}: missing French pair`);
      const translatedSource = translated.flags?.[MODULE_ID]?.source;
      if (translated.img !== english.img) throw new Error(`${pack.name}/${english._id}: EN/FR image mismatch`);
      if (translatedSource?.artworkStatus !== source.artworkStatus) throw new Error(`${pack.name}/${english._id}: EN/FR artwork status mismatch`);
      const locator = pageLocator(source);
      const proposedGroup = sharingKey(pack.name, english.name, allNames);
      rows.push({
        identity,
        document_id: english._id,
        uuid_en: uuid("en", pack.name, pack.type, english._id),
        uuid_fr: uuid("fr", pack.name, pack.type, english._id),
        name_en: english.name,
        name_fr: translated.name,
        publication: source.book,
        pack: pack.name,
        document_type: pack.type,
        system_type: english.type ?? pack.type,
        current_image: english.img,
        current_status: source.artworkStatus,
        current_artwork_source: source.artworkSource ?? null,
        priority: priority(pack.name, english),
        sharing_group: proposedGroup,
        sharing_status: proposedGroup ? "proposed-owner-validation-required" : "none",
        candidate_source_kind: locator ? "owned-official-pdf" : "none",
        candidate_source: locator ? `${getPublication(source.book).titles.en} (owned official English PDF)` : null,
        candidate_locator: locator,
        provenance_or_permission_expected: locator ? "Record extraction filename, PDF edition, page, crop bounds, and owner confirmation of lawful possession." : "Owner must supply an allowed official asset and its ownership or explicit approval record.",
        blocker: locator ? null : "No precise allowed source locator is recorded; owner asset or page-level direction required.",
        review_state: "pending-owner",
        owner_decision_required: proposedGroup ? "Approve or reject the proposed sharing group and candidate provenance before integration." : "Select an allowed source and approve its provenance before integration."
      });
    }
  }
  return rows.sort((a, b) => a.priority.localeCompare(b.priority) || a.pack.localeCompare(b.pack) || a.name_en.localeCompare(b.name_en, "en") || a.document_id.localeCompare(b.document_id));
}

export function serializeInventory(rows) {
  return `${rows.map(row => JSON.stringify(row)).join("\n")}\n`;
}

export function parseInventory(text) {
  return text.trim() ? text.trimEnd().split("\n").map((line, index) => {
    try { return JSON.parse(line); } catch (error) { throw new Error(`inventory line ${index + 1}: ${error.message}`); }
  }) : [];
}

export function mergeEditorial(derived, existing = []) {
  const editorialFields = ["priority", "sharing_group", "sharing_status", "candidate_source_kind", "candidate_source", "candidate_locator", "provenance_or_permission_expected", "blocker", "review_state", "owner_decision_required"];
  const byIdentity = new Map(existing.map(row => [row.identity, row]));
  return derived.map(row => {
    const previous = byIdentity.get(row.identity);
    const merged = clone(row);
    if (previous) for (const field of editorialFields) if (Object.hasOwn(previous, field)) merged[field] = previous[field];
    const substance = normalize(row.name_en).replace(/s$/, "");
    if (["addictions", "consumables"].includes(row.pack) && ["calmex", "fury", "jet", "overdrive", "ultra-jet"].includes(substance)) {
      merged.sharing_group = `shared-substance-${substance}`;
      merged.sharing_status = "approved";
      merged.owner_decision_required = "Select and approve one allowed source for this already-approved shared illustration.";
    }
    if (["perks", "books-and-magazines"].includes(row.pack) && row.name_en === "Future Weapons Today") {
      merged.sharing_group = "shared-magazine-future-weapons-today";
      merged.sharing_status = "approved";
      merged.owner_decision_required = "Select and approve one allowed source for this already-approved shared illustration.";
    }
    return merged;
  });
}

export function validateInventory(rows, derived) {
  const errors = [];
  const required = ["identity", "document_id", "uuid_en", "uuid_fr", "name_en", "name_fr", "publication", "pack", "document_type", "system_type", "current_image", "current_status", "priority", "sharing_status", "candidate_source_kind", "provenance_or_permission_expected", "review_state", "owner_decision_required"];
  if (rows.length !== EXPECTED_COUNT) errors.push(`expected ${EXPECTED_COUNT} rows, found ${rows.length}`);
  const identities = new Set(), uuids = new Set();
  const expected = new Map(derived.map(row => [row.identity, row]));
  for (const [index, row] of rows.entries()) {
    for (const field of required) if (row[field] === undefined || row[field] === null || row[field] === "") errors.push(`line ${index + 1}/${row.identity ?? "?"}: missing ${field}`);
    if (identities.has(row.identity)) errors.push(`${row.identity}: duplicate identity`); identities.add(row.identity);
    for (const field of ["uuid_en", "uuid_fr"]) { if (uuids.has(row[field])) errors.push(`${row.identity}: duplicate ${field}`); uuids.add(row[field]); }
    if (!PRIORITIES.includes(row.priority)) errors.push(`${row.identity}: invalid priority ${row.priority}`);
    if (!REVIEW_STATES.includes(row.review_state)) errors.push(`${row.identity}: invalid review state ${row.review_state}`);
    if (!SHARING_STATES.includes(row.sharing_status)) errors.push(`${row.identity}: invalid sharing status ${row.sharing_status}`);
    if (!SOURCE_KINDS.includes(row.candidate_source_kind)) errors.push(`${row.identity}: invalid source kind ${row.candidate_source_kind}`);
    if (row.current_status === "placeholder" && row.candidate_source_kind === "none" && !row.blocker) errors.push(`${row.identity}: missing blocker for absent source`);
    if (row.candidate_source_kind !== "none" && (!row.candidate_source || !row.candidate_locator)) errors.push(`${row.identity}: allowed source lacks candidate or locator`);
    const source = expected.get(row.identity);
    if (!source) errors.push(`${row.identity}: identity does not exist among canonical placeholders`);
    else for (const field of ["document_id", "uuid_en", "uuid_fr", "name_en", "name_fr", "publication", "pack", "document_type", "system_type", "current_image", "current_status", "current_artwork_source"]) if (row[field] !== source[field]) errors.push(`${row.identity}: derived field ${field} is stale`);
  }
  for (const identity of expected.keys()) if (!identities.has(identity)) errors.push(`${identity}: missing inventory identity`);
  return errors;
}

export function counts(rows, field) {
  return Object.fromEntries([...rows.reduce((map, row) => map.set(row[field] ?? "none", (map.get(row[field] ?? "none") ?? 0) + 1), new Map())].sort(([a], [b]) => String(a).localeCompare(String(b))));
}
