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
      if (entry.identityRole !== "reference") {
        assert.equal(source?.page, entry.page, `${language}/${entry.pack}/${entry.documentId} source page`);
      }
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
      const rawSourcePage = source?.page;
      const sourcePage = Number.isInteger(rawSourcePage)
        ? rawSourcePage
        : /^\\d+$/.test(String(rawSourcePage ?? ""))
          ? Number(rawSourcePage)
          : null;
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

test("Core origin traits use exact identities and source pages", async () => {
  const expected = new Map([
    ["OKkyUlhBYtuHCOJt", 51],
    ["yova9LubVGA18nar", 52],
    ["3W3LSN9wwD48gaaL", 53],
    ["GGY5C3vOlzctf76N", 55],
    ["DwEuDupvvq0jPL4g", 56],
    ["HWCuIY1tYjpcpcmX", 56],
    ["oTNPMKqeDqEsWxpo", 56],
    ["Brw3U4pjSy5MBp6D", 56],
    ["QcZ9c7dzPNVxAzR4", 56],
    ["XbVNgNTQ9MLaAWEx", 57]
  ]);
  for (const language of ["en", "fr"]) {
    const records = (await generatedDocuments(language)).filter(({ pack }) => pack === "traits");
    for (const [id, page] of expected) {
      const record = records.find(({ document }) => document._id === id);
      assert.ok(record, `${language}/traits/${id} missing`);
      assert.equal(record.document.flags["fallout2d20-compendium"].source.page, page);
    }
  }
});

test("French Core origin traits preserve official localization with canonical errata adaptations", async () => {
  const records = await generatedDocuments("fr");
  const byId = new Map(records.filter(({ pack }) => pack === "traits").map(({ document }) => [document._id, document]));
  const chain = byId.get("OKkyUlhBYtuHCOJt").system.description;
  assert.match(chain, /responsables de vos subordonnés/);
  assert.match(chain, /matériel technologique est récupéré… par tous les moyens nécessaires/);
  assert.doesNotMatch(chain, /récupé…/);

  const ghoul = byId.get("yova9LubVGA18nar").system.description;
  assert.match(ghoul, /\(les humains qui ne sont pas des goules\)/);
  assert.match(ghoul, /difficulté ou la marge de complication/);

  const handy = byId.get("GGY5C3vOlzctf76N").system.description;
  assert.match(handy, /Soigner les robots, page 34/);
  assert.match(handy, /Vous ne pouvez pas manipuler le monde qui vous entoure comme les humains/);
  assert.match(handy, /trois accessoires présentés dans la table/);

  const heavy = byId.get("Brw3U4pjSy5MBp6D").system.description;
  assert.match(heavy, /et non sur un 20/);
  assert.doesNotMatch(heavy, /non seulement/);

  const small = byId.get("QcZ9c7dzPNVxAzR4").system.description;
  assert.match(small, /75 \+ \(2,5 x FOR\) kg/);
  assert.match(small, /75 \+ \(5 x FOR\) kg/);

  const vault = byId.get("XbVNgNTQ9MLaAWEx").system.description;
  assert.match(vault, /réduisez de 1, jusqu’à un minimum de 0/);
  assert.match(vault, /à laquelle vous avez participé contre votre gré/);
  assert.match(vault, /isolement et confinement dans votre Abri/);
});

test("Mister Handy p.54 structured arm attachments are exact where the Core defines a full item", async () => {
  for (const language of ["en", "fr"]) {
    const records = await generatedDocuments(language);
    const buzz = records.find(({ pack, document }) => pack === "weapons" && document._id === "QYgc3wH8JS3YGJ34").document;
    const pincer = records.find(({ pack, document }) => pack === "weapons" && document._id === "VFRfwbor9PwEKdRZ").document;
    assert.equal(buzz.flags["fallout2d20-compendium"].source.page, 54);
    assert.equal(pincer.flags["fallout2d20-compendium"].source.page, 54);
    assert.equal(buzz.system.damage.rating, 3);
    assert.equal(buzz.system.damage.damageType.physical, true);
    assert.equal(buzz.system.damage.damageEffect.piercing_x.value, 1);
    assert.equal(pincer.system.damage.rating, 2);
    assert.equal(pincer.system.damage.damageType.physical, true);
    assert.match(buzz.system.description, /3 @fos\[DC\]/);
    assert.match(pincer.system.description, /2 @fos\[DC\]/);
    if (language === "fr") {
      assert.match(buzz.system.description, /dégâts balistiques Perforants 1/);
      assert.match(pincer.system.description, /poids n’excède pas 20 kg/);
      assert.equal(buzz.flags["fallout2d20-compendium"].source.translationReviewed, true);
      assert.equal(pincer.flags["fallout2d20-compendium"].source.translationReviewed, true);
    }
  }
});

test("Core perk certification records exact bilingual source coordinates and canonical requirements", async () => {
  const expected = new Map([
    ["cCrLiQ8zNWW3LAC6", { page: 59, en: [59], fr: [66], ranks: 1 }],
    ["tdm3ETgFN8PA7ZE0", { page: 59, en: [59], fr: [71], ranks: 3, attributes: { end: 7 }, level: 1, levelIncrease: 3 }],
    ["9KkBBnH3N7yhEeMB", { page: 59, en: [59], fr: [69], ranks: 1, attributes: { str: 7 } }],
    ["IVL33DFzxdmpj143", { page: 59, en: [59, 60], fr: [59], ranks: 2, attributes: { cha: 6 }, level: 1, levelIncrease: 5 }],
    ["z1OueIn6GiTrDVw7", { page: 60, en: [60], fr: [59], ranks: 2, attributes: { end: 5 }, level: 1, levelIncrease: 3 }],
    ["EQjZHUxYinodOU6G", { page: 60, en: [60], fr: [60], ranks: 4, attributes: { str: 5, int: 6 }, levelIncrease: 4 }],
    ["JHMLajHU7sioJT9v", { page: 60, en: [60], fr: [71], ranks: 1, attributes: { per: 7 } }],
    ["j5SfukNzX12lRmwB", { page: 60, en: [60], fr: [60], ranks: 1, attributes: { str: 7 }, level: 4, notRobot: true }],
    ["A0UTRQ94MdLa3v2i", { page: 60, en: [60], fr: [62], ranks: 1, attributes: { str: 6 } }],
    ["Xrh0LthwODfn0McZ", { page: 60, en: [60], fr: [63], ranks: 1, attributes: { luc: 9 } }],
    ["U8yM23ldUGYYtta1", { page: 61, en: [61], fr: [60], ranks: 2, attributes: { agi: 9 }, level: 1, levelIncrease: 3 }],
    ["Nc22rM5RB37dOPcO", { page: 62, en: [62], fr: [60], ranks: 1, attributes: { agi: 7 } }],
    ["wE5dyJKCl7gysWci", { page: 66, en: [66], fr: [60, 61], ranks: 2, attributes: { end: 6 }, level: 1, levelIncrease: 4 }],
    ["TFJbnmRbE7cisziV", { page: 70, en: [70], fr: [60], ranks: 2, attributes: { end: 8 }, level: 1, levelIncrease: 4 }],
    ["fhBw3zhOo6EuZy2j", { page: 72, en: [72], fr: [60], ranks: 1, attributes: { cha: 6 } }]
  ]);

  const catalogById = new Map(catalog.entries.filter(entry => entry.pack === "perks").map(entry => [entry.documentId, entry]));
  for (const [id, expectation] of expected) {
    const entry = catalogById.get(id);
    assert.ok(entry, `certification entry missing for perk ${id}`);
    assert.equal(entry.page, expectation.page);
    assert.deepEqual(entry.sourcePages?.en, expectation.en);
    assert.deepEqual(entry.sourcePages?.fr, expectation.fr);
  }

  for (const language of ["en", "fr"]) {
    const records = (await generatedDocuments(language)).filter(({ pack }) => pack === "perks");
    for (const [id, expectation] of expected) {
      const record = records.find(({ document }) => document._id === id);
      assert.ok(record, `${language}/perks/${id} missing`);
      const document = record.document;
      assert.equal(document.flags["fallout2d20-compendium"].source.page, expectation.page);
      assert.equal(document.system.rank.max, expectation.ranks);
      for (const [attribute, value] of Object.entries(expectation.attributes ?? {})) {
        assert.equal(document.system.requirementsEx.attributes[attribute].value, value, `${language}/perks/${id} ${attribute}`);
      }
      if (expectation.level !== undefined) assert.equal(document.system.requirementsEx.level, expectation.level);
      if (expectation.levelIncrease !== undefined) assert.equal(document.system.requirementsEx.levelIncrease, expectation.levelIncrease);
      if (expectation.notRobot !== undefined) assert.equal(document.system.requirementsEx.notRobot, expectation.notRobot);
    }
  }
});

test("Core p.59-60 perk text preserves combat-die symbols and applied errata", async () => {
  const docs = {};
  for (const language of ["en", "fr"]) {
    docs[language] = new Map(
      (await generatedDocuments(language))
        .filter(({ pack }) => pack === "perks")
        .map(({ document }) => [document._id, document])
    );
  }

  assert.match(docs.en.get("IVL33DFzxdmpj143").system.description, /roll 1 @fos\[DC\]/);
  assert.match(docs.fr.get("IVL33DFzxdmpj143").system.description, /jetez 1 @fos\[DC\]/);
  assert.doesNotMatch(docs.en.get("IVL33DFzxdmpj143").system.description, /1DCD/);
  assert.match(docs.en.get("U8yM23ldUGYYtta1").system.description, /\+1 @fos\[DC\] damage/);
  assert.match(docs.en.get("wE5dyJKCl7gysWci").system.description, /re-roll the @fos\[DC\]/);

  const armorerEn = docs.en.get("EQjZHUxYinodOU6G");
  const armorerFr = docs.fr.get("EQjZHUxYinodOU6G");
  assert.equal(armorerEn.system.requirementsEx.levelIncrease, 4);
  assert.match(armorerEn.system.description, /level requirement increases by 4/);
  assert.match(armorerFr.system.description, /niveau requis augmente de 4/);

  const barbarianEn = docs.en.get("j5SfukNzX12lRmwB").system.description;
  const barbarianFr = docs.fr.get("j5SfukNzX12lRmwB").system.description;
  assert.match(barbarianEn, /physical and energy Damage Resistance/);
  assert.match(barbarianEn, /\+3 physical and energy DR/);
  assert.match(barbarianFr, /RD balistiques et énergétiques \+1/);
  assert.match(barbarianFr, /RD balistiques et énergétiques \+3/);
});

