import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PUBLICATIONS } from "../scripts/data/publications.mjs";
import { readProvenance, validateProvenance } from "../scripts/lib/provenance.mjs";

const baseDocument = {
  system: { source: "core_rulebook" },
  flags: { "fallout2d20-compendium": { source: { book: "core_rulebook", language: "en" } } }
};

function registryWithSupplement() {
  const registry = structuredClone(PUBLICATIONS);
  registry.test_supplement = {
    id: "test_supplement",
    titles: { en: "Test Supplement", fr: "Supplément de test" },
    shortTitles: { en: "Supplement", fr: "Supplément" },
    languages: ["en", "fr"],
    editions: {
      en: [{ id: "en-first", title: "English first edition", version: "1", translation: "original", errata: [] }],
      fr: [{ id: "fr-project", title: "French project translation", version: "1", translation: "project", errata: [] }]
    },
    errata: []
  };
  return registry;
}

test("a V1 provenance flag remains readable without migration", async () => {
  const document = JSON.parse(await readFile("src/packs/en/skills.db/athletics__F4uIprrKWh9ApMaU.json", "utf8"));
  const provenance = validateProvenance(document, { language: "en" });
  assert.equal(provenance.book, "core_rulebook");
  assert.deepEqual(readProvenance(document).appearances, []);
});

test("an identical secondary appearance is valid and keeps the first source", () => {
  const document = structuredClone(baseDocument);
  document.flags["fallout2d20-compendium"].source.appearances = [
    { book: "test_supplement", language: "en", edition: "en-first", status: "identical", page: 42 }
  ];
  assert.doesNotThrow(() => validateProvenance(document, { language: "en", registry: registryWithSupplement() }));
  assert.equal(document.system.source, "core_rulebook");
});

test("invalid and unknown provenance fails with a field-level diagnostic", () => {
  const unknown = structuredClone(baseDocument);
  unknown.flags["fallout2d20-compendium"].source.book = "missing_book";
  assert.throws(() => validateProvenance(unknown), /source\.book: unknown publication "missing_book"/);

  const mismatch = structuredClone(baseDocument);
  mismatch.system.source = "missing_book";
  assert.throws(() => validateProvenance(mismatch), /system\.source: must equal first-appearance publication "core_rulebook"/);

  const duplicatePrimary = structuredClone(baseDocument);
  duplicatePrimary.flags["fallout2d20-compendium"].source.appearances = [
    { book: "core_rulebook", language: "en", edition: "en-digital-2023-02", status: "identical" }
  ];
  assert.throws(() => validateProvenance(duplicatePrimary), /must not repeat the first-appearance publication/);

  const unknownAppearance = structuredClone(baseDocument);
  unknownAppearance.flags["fallout2d20-compendium"].source.appearances = [
    { book: "missing_book", language: "en", edition: "first", status: "identical" }
  ];
  assert.throws(() => validateProvenance(unknownAppearance), /appearances\[0\]\.book: unknown publication "missing_book"/);
});

test("mechanical variants are rejected as appearances and accepted as distinct documents", () => {
  const registry = registryWithSupplement();
  const invalid = structuredClone(baseDocument);
  invalid.flags["fallout2d20-compendium"].source.appearances = [
    { book: "test_supplement", language: "en", edition: "en-first", status: "variant" }
  ];
  assert.throws(() => validateProvenance(invalid, { registry }), /mechanical variants require a distinct document id/);

  const variant = {
    _id: "VariantDoc000001",
    system: { source: "test_supplement" },
    flags: { "fallout2d20-compendium": { source: { book: "test_supplement", language: "en" } } }
  };
  assert.doesNotThrow(() => validateProvenance(variant, { registry }));
});
