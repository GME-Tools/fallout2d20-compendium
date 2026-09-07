import assert from "node:assert/strict";
import test from "node:test";
import { auditPublicationDocuments } from "../scripts/lib/publication-audit.mjs";

const publication = (id, languages = ["en", "fr"]) => ({
  id, titles: { en: "Pilot", fr: "Pilote" }, shortTitles: { en: "Pilot", fr: "Pilote" }, languages,
  editions: Object.fromEntries(languages.map(language => [language, [{ id: `${language}-1`, title: `${language} edition`, version: "1", translation: language === "en" ? "original" : "project", errata: [] }]])), errata: []
});
const registry = { core_rulebook: publication("core_rulebook"), pilot_book: publication("pilot_book") };
const doc = (language, id = "AAAAAAAAAAAAAAAA", book = "core_rulebook", name = "Example") => ({ language, pack: "skills", file: `fixture/${language}/${id}.json`, document: {
  _id: id, _key: `!items!${id}`, name, img: "same.webp", type: "skill", system: { source: book, description: language === "en" ? "English" : "Français" },
  flags: { "fallout2d20-compendium": { source: { book, language, artworkStatus: "dedicated" } } }
} });

test("a registered empty publication is audited with an explicit empty reviewed inventory", () => {
  const result = auditPublicationDocuments({ registry, records: [], inventories: { pilot_book: [] } });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.publications.pilot_book, { firstAppearances: 0, secondaryAppearances: 0, identities: { en: 0, fr: 0 }, inventory: "checked" });
});

test("publication audit accepts a minimal bilingual pilot", () => {
  const records = [doc("en"), doc("fr")];
  const expected = records.map(record => `${record.language}/${record.pack}/${record.document._id}`);
  assert.deepEqual(auditPublicationDocuments({ registry, records, inventories: { core_rulebook: expected, pilot_book: [] } }).errors, []);
});

test("publication audit reports identity, parity, UUID, image, inventory and duplicate failures precisely", () => {
  const en = doc("en");
  en.document.system.description = "@UUID[Compendium.fallout2d20-compendium.fr-skills.Item.MISSING000000000]";
  const collision = doc("en"); collision.pack = "traits"; collision.file = "fixture/en/collision.json";
  const duplicate = doc("en", "BBBBBBBBBBBBBBBB", "core_rulebook", "Example");
  const result = auditPublicationDocuments({ registry, records: [en, collision, duplicate], inventories: { core_rulebook: [] } });
  assert.match(result.errors.join("\n"), /identity collision "en\/AAAAAAAAAAAAAAAA"/);
  assert.match(result.errors.join("\n"), /language parity: missing fr\/skills\/AAAAAAAAAAAAAAAA/);
  assert.match(result.errors.join("\n"), /cross-language UUID/);
  assert.match(result.errors.join("\n"), /unresolved UUID/);
  assert.match(result.errors.join("\n"), /inventory mismatch/);
  assert.match(result.errors.join("\n"), /unapproved duplicate localized name/);
});

test("publication audit reports bilingual image and appearance classification mismatches", () => {
  const en = doc("en");
  const fr = doc("fr");
  fr.document.img = "different.webp";
  fr.document.flags["fallout2d20-compendium"].source.artworkStatus = "shared";
  const result = auditPublicationDocuments({ registry, records: [en, fr] });
  assert.match(result.errors.join("\n"), /image differs from English identity/);
  assert.match(result.errors.join("\n"), /artworkStatus differs from English identity/);
});

test("an identical reprint cannot be represented by a second homonymous document", () => {
  const oldest = doc("en");
  oldest.document.flags["fallout2d20-compendium"].source.appearances = [{ book: "pilot_book", language: "en", edition: "en-1", status: "identical" }];
  const duplicate = doc("en", "BBBBBBBBBBBBBBBB", "pilot_book");
  const result = auditPublicationDocuments({ registry, records: [oldest, duplicate] });
  assert.match(result.errors.join("\n"), /identical reprint must reuse the oldest canonical document/);
});

test("publication audit rejects invalid artwork classification and stale approvals", () => {
  const en = doc("en");
  en.document.flags["fallout2d20-compendium"].source.artworkStatus = "unknown";
  const result = auditPublicationDocuments({ registry, records: [en], duplicateApprovals: [{ publication: "core_rulebook", language: "en", pack: "skills", classification: "editorial", ids: ["A", "B"] }] });
  assert.match(result.errors.join("\n"), /artworkStatus: must be dedicated, shared, or placeholder/);
  assert.match(result.errors.join("\n"), /stale duplicate approval/);
});

test("provenance distinguishes an identical reprint from correction and mechanical variant", () => {
  const base = doc("en");
  base.document.flags["fallout2d20-compendium"].source.appearances = [{ book: "pilot_book", language: "en", edition: "en-1", status: "variant" }];
  assert.match(auditPublicationDocuments({ registry, records: [base] }).errors[0], /mechanical variant cannot be an appearance/);
  base.document.flags["fallout2d20-compendium"].source.appearances[0].status = "corrected";
  assert.match(auditPublicationDocuments({ registry, records: [base] }).errors[0], /requires owner arbitration/);
  base.document.flags["fallout2d20-compendium"].source.appearances[0].status = "identical";
  assert.doesNotMatch(auditPublicationDocuments({ registry, records: [base] }).errors.join("\n"), /appearance/);
});
