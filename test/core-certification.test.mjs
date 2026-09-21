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

test("no Core document sourced through the certified source page exists outside the source-driven certification inventory", async () => {
  const expectedIds = new Set(catalog.entries.filter(entry => entry.scope === "in_scope").map(entry => entry.documentId));
  const through = Math.min(catalog.certifiedThrough.en.sourcePage, catalog.certifiedThrough.fr.sourcePage);
  for (const language of ["en", "fr"]) {
    const records = await generatedDocuments(language);
    const earlyCore = records.filter(({ document }) => {
      const source = document.flags?.["fallout2d20-compendium"]?.source;
      const sourcePage = Number.parseInt(String(source?.page ?? ""), 10);
      return source?.book === "core_rulebook" && Number.isInteger(sourcePage) && sourcePage <= through;
    });
    const unexplained = earlyCore
      .filter(({ document }) => !expectedIds.has(document._id))
      .map(({ pack, document }) => `${pack}/${document._id}/${document.name}/p.${document.flags["fallout2d20-compendium"].source.page}`);
    assert.deepEqual(unexplained, [], `${language}: Core documents through p.${through} must be source-inventoried`);
  }
});

test("Core skill identities, source pages and default attributes match the source-driven audit", async () => {
  const expected = new Map([
    ["F4uIprrKWh9ApMaU", [44, "str"]], ["vf1Qszkq1om2Xgmn", [44, "cha"]],
    ["p3GhRmIwrYTJmuhr", [45, "end"]], ["jAJPNJpHYawNBp2h", [45, "per"]],
    ["ejKiqeUyjkahCjQf", [45, "per"]], ["SH09XavazYU9CqY4", [45, "per"]],
    ["UrVd0BmoXkAxmrvv", [45, "int"]], ["kCGaEuF27yXyE04i", [45, "str"]],
    ["PEN70F6ovA3g5HI2", [45, "per"]], ["ZQw4TLZbaLm5F0BW", [46, "int"]],
    ["G3mN15diMiTCDZ0U", [46, "int"]], ["UZDBirrZeUxrAk7b", [46, "agi"]],
    ["HEegw2EUmmEzfdDM", [46, "agi"]], ["dOTrlwZ60XWqegQA", [46, "cha"]],
    ["R8YnBNUwhZhG89iQ", [46, "end"]], ["UQ4TLtVUR2kRlYkb", [46, "agi"]],
    ["5xAG0eRrcvDeJAFk", [47, "str"]]
  ]);
  for (const language of ["en", "fr"]) {
    const records = (await generatedDocuments(language)).filter(({ pack }) => pack === "skills");
    assert.equal(records.length, expected.size);
    for (const { document } of records) {
      const [page, attribute] = expected.get(document._id) ?? [];
      assert.ok(page, `${language}/skills/${document._id} is not in the certified source inventory`);
      assert.equal(document.flags["fallout2d20-compendium"].source.page, page);
      assert.equal(document.system.defaultAttribute, attribute);
    }
  }
});

test("Energy Weapons keeps the detailed Gauss examples while the p.44 summary errata remains table-only", async () => {
  for (const language of ["en", "fr"]) {
    const records = await generatedDocuments(language);
    const skill = records.find(({ pack, document }) => pack === "skills" && document._id === "jAJPNJpHYawNBp2h").document;
    if (language === "en") {
      assert.match(skill.system.description, /gauss weaponry/);
      assert.match(skill.system.description, /gauss rifle/);
    } else {
      assert.match(skill.system.description, /armes de Gauss/);
      assert.match(skill.system.description, /fusil de Gauss/);
      assert.match(skill.system.description, /pistolet &agrave; &eacute;nergie|pistolet à énergie/);
    }
  }
});
