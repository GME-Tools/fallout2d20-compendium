import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const catalog = JSON.parse(await readFile("catalog/core-rulebook-certification.json", "utf8"));
const allowedStatuses = new Set(["verified", "missing", "incorrect", "duplicate", "ambiguous", "out_of_scope"]);

async function generatedDocuments(language) {
  const root = path.join("generated/source-packs", language);
  const packDirectories = (await readdir(root, { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && entry.name.endsWith(".db"));
  const records = [];
  for (const directory of packDirectories) {
    const pack = directory.name.slice(0, -3);
    const packRoot = path.join(root, directory.name);
    for (const file of await readdir(packRoot)) {
      if (!file.endsWith(".json")) continue;
      const document = JSON.parse(await readFile(path.join(packRoot, file), "utf8"));
      if (/^!(?:items|actors|tables)![^.!]+$/.test(document._key ?? "")) records.push({ pack, document });
    }
  }
  return records;
}

test("Core certification has gapless page-by-page review through the certified boundary", () => {
  assert.equal(catalog.publication, "core_rulebook");
  for (const language of ["en", "fr"]) {
    const through = catalog.certifiedThrough[language].pdfPage;
    const reviews = catalog.pageReviews.filter(review => review.language === language);
    assert.equal(reviews.length, through);
    assert.deepEqual(reviews.map(review => review.pdfPage), Array.from({ length: through }, (_, index) => index + 1));
    assert.ok(reviews.every(review => review.status === "verified"));
  }
});

test("Core certification entries use explicit scope and certification states", () => {
  for (const entry of catalog.entries) {
    assert.equal(entry.publication, "core_rulebook");
    assert.ok(Number.isInteger(entry.page) && entry.page > 0);
    assert.ok(typeof entry.type === "string" && entry.type.length > 0);
    assert.ok(typeof entry.sourceName === "string" && entry.sourceName.length > 0);
    assert.ok(["in_scope", "out_of_scope"].includes(entry.scope));
    assert.ok(allowedStatuses.has(entry.status));
    if (entry.scope === "out_of_scope") {
      assert.equal(entry.status, "out_of_scope");
      assert.equal(entry.pack, null);
      assert.equal(entry.documentId, null);
      assert.ok(typeof entry.justification === "string" && entry.justification.length > 0);
    } else {
      assert.ok(typeof entry.pack === "string" && entry.pack.length > 0);
      assert.match(entry.documentId, /^[A-Za-z0-9]{16}$/);
    }
  }
});

test("every verified in-scope Core entry through the current boundary exists bilingually with matching provenance", async () => {
  const expected = catalog.entries.filter(entry => entry.scope === "in_scope" && entry.status === "verified");
  for (const language of ["en", "fr"]) {
    const records = await generatedDocuments(language);
    for (const entry of expected) {
      const record = records.find(candidate => candidate.pack === entry.pack && candidate.document._id === entry.documentId);
      assert.ok(record, `${language}/${entry.pack}/${entry.documentId} missing`);
      const source = record.document.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.book, "core_rulebook", `${language}/${entry.pack}/${entry.documentId} source book`);
      assert.equal(source?.page, entry.page, `${language}/${entry.pack}/${entry.documentId} source page`);
      const expectedName = language === "en" ? entry.sourceName : entry.localizedNames?.fr;
      assert.equal(record.document.name, expectedName, `${language}/${entry.pack}/${entry.documentId} source name`);
    }
  }
});

test("no Core document sourced through page 39 exists outside the source-driven certification inventory", async () => {
  const expectedIds = new Set(catalog.entries.filter(entry => entry.scope === "in_scope").map(entry => entry.documentId));
  for (const language of ["en", "fr"]) {
    const records = await generatedDocuments(language);
    const earlyCore = records.filter(({ document }) => {
      const source = document.flags?.["fallout2d20-compendium"]?.source;
      return source?.book === "core_rulebook" && Number.isInteger(source.page) && source.page <= 39;
    });
    const unexplained = earlyCore
      .filter(({ document }) => !expectedIds.has(document._id))
      .map(({ pack, document }) => `${pack}/${document._id}/${document.name}/p.${document.flags["fallout2d20-compendium"].source.page}`);
    assert.deepEqual(unexplained, [], `${language}: Core documents before p.40 must be source-inventoried`);
  }
});
