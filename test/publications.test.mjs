import assert from "node:assert/strict";
import test from "node:test";
import { PUBLICATIONS, getPublication } from "../scripts/data/publications.mjs";
import { validatePublicationRegistry } from "../scripts/lib/provenance.mjs";

test("the Core Rulebook is declared in the publication registry", () => {
  const core = getPublication("core_rulebook");
  assert.equal(core.titles.en, "Fallout: The Roleplaying Game Core Rulebook");
  assert.equal(core.titles.fr, "Fallout : le jeu de rôle — Livre de base");
  assert.deepEqual(core.languages, ["en", "fr"]);
  assert.equal(core.editions.en[0].version, "2023-02");
  assert.equal(core.editions.fr[0].translation, "official");
  assert.equal(core.errata[0].version, "V6 (2026)");
});

test("another publication is added as registry data without a global constant", () => {
  const registry = structuredClone(PUBLICATIONS);
  registry.test_publication = {
    id: "test_publication",
    titles: { en: "Test Publication", fr: "Publication de test" },
    shortTitles: { en: "Test", fr: "Test" },
    languages: ["en"],
    editions: { en: [{ id: "en-first", title: "First edition", version: "1", translation: "original", errata: [] }] },
    errata: []
  };
  assert.doesNotThrow(() => validatePublicationRegistry(registry));
});

test("unknown publications and malformed registry entries have precise diagnostics", () => {
  assert.throws(() => getPublication("missing_book"), /Unknown publication id: "missing_book"/);
  const registry = structuredClone(PUBLICATIONS);
  registry.BadId = { id: "BadId" };
  assert.throws(() => validatePublicationRegistry(registry), /publications\.BadId: id must use lower-case snake_case/);
});
