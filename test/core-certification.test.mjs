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

test("Core perk lot pp.61-64 and bilingual counterpart entries match source coordinates and mechanics", async () => {
  const expected = new Map([
    ["P5eJ7NOJMV8r9cHo", { page: 61, fr: [65], ranks: 1, attributes: { str: 8 } }],
    ["3bfAQcNKzjD0aOJ8", { page: 61, fr: [72], ranks: 1, attributes: { cha: 6 } }],
    ["422BCVbfcp5q8M8I", { page: 61, fr: [65], ranks: 3, attributes: { str: 6 }, level: 2, levelIncrease: 4 }],
    ["jhef5zecOk3vQhGy", { page: 61, fr: [70], ranks: 1, attributes: { luc: 6 } }],
    ["xTNbBLx2nxvf1mIE", { page: 61, fr: [62], ranks: 1, attributes: { luc: 5 } }],
    ["BKTkXhJHSgVjdsKT", { page: 61, fr: [64], ranks: 1, attributes: { cha: 5 } }],
    ["xwXPepqdLzr8uPMX", { page: 62, fr: [67], ranks: 1, attributes: { per: 7 } }],
    ["49AOicQFjlfIKNUe", { page: 62, fr: [70], ranks: 2, attributes: { end: 7 }, level: 1, levelIncrease: 4 }],
    ["HUmwhrS7v9g31nOG", { page: 62, fr: [62], ranks: 1, attributes: { int: 7 } }],
    ["H6W082nVJtDeSthQ", { page: 62, fr: [62], ranks: 2, attributes: { agi: 8 }, level: 2, levelIncrease: 3 }],
    ["51j1AqLl4zHqoVsN", { page: 62, fr: [62], ranks: 1, attributes: { int: 6 } }],
    ["YLA9JETKbkkHd3uz", { page: 62, fr: [72], ranks: 1, attributes: { per: 8, agi: 6 } }],
    ["VTtncpMUhGBxjmlQ", { page: 62, fr: [67], ranks: 1, attributes: { luc: 7 } }],
    ["ureiid51WVHnCcSG", { page: 63, fr: [63], ranks: 1, attributes: { per: 6, luc: 6 } }],
    ["5r60cyfjkvkYlTvs", { page: 63, fr: [71], ranks: 2, attributes: { agi: 6 }, level: 4, levelIncrease: 6 }],
    ["6VAkIp310dSGvCj7", { page: 63, fr: [61], ranks: 1, attributes: { cha: 5 } }],
    ["Vk0RIc9X6HaypmwJ", { page: 64, fr: [63], ranks: 1, attributes: { int: 7 } }],
    ["T3vX1fP7cSG5v0zh", { page: 64, fr: [67], ranks: 3, attributes: { end: 6 }, level: 1, levelIncrease: 3, notRobot: true }],
    ["TTCwoZV141ZGuMjs", { page: 64, fr: [65], ranks: 1, attributes: { end: 6 }, notRobot: true }],
    ["DlJVCaT4RLT38Kgs", { page: 64, fr: [64], ranks: 1, attributes: { agi: 9 } }],
    ["zQpZJuiwAC8Zk9a0", { page: 64, fr: [63], ranks: 3, attributes: { luc: 5 }, level: 2, levelIncrease: 4 }],
    ["wC8TgVkF6OhFY9XR", { page: 64, fr: [64], ranks: 1, attributes: { per: 5, agi: 6 } }],
    ["YDRoA6dGjWXy06hf", { page: 64, fr: [72], ranks: 1, attributes: { luc: 8 } }],
    ["Nei43KlUxbHLw6MI", { page: 64, fr: [72], ranks: 3, attributes: { agi: 10 }, level: 1, levelIncrease: 5 }],
    ["zB82J3WJ7ld01RYR", { page: 65, fr: [62], ranks: 1, attributes: { end: 6 } }],
    ["Ba5yPRdNAvjM5StI", { page: 65, fr: [64], ranks: 4, attributes: { int: 6 }, level: 2, levelIncrease: 4 }],
    ["P3SMmJulZT5OyArI", { page: 66, fr: [63], ranks: 10, level: 2, levelIncrease: 2 }],
    ["trdF2qUBRHrj3YNW", { page: 66, fr: [61], ranks: 1 }],
    ["VtCwIMtash7XcwxP", { page: 66, fr: [62], ranks: 2, attributes: { per: 8 }, level: 2, levelIncrease: 4 }],
    ["E3vqYT7JvmyDeFyU", { page: 69, fr: [64], ranks: 1, attributes: { luc: 6 } }],
    ["iDaMlrcxl6kEm3Ex", { page: 69, fr: [64], ranks: 1, attributes: { end: 6, cha: 7 } }],
    ["Xz1V9etWzTtwt5x5", { page: 70, fr: [63], ranks: 1, attributes: { agi: 6 } }],
    ["GiPKNxmrkWA2k76W", { page: 70, fr: [63, 64], ranks: 3, attributes: { int: 8 }, level: 2, levelIncrease: 4 }],
    ["j4XUYfEZwmvkfXBe", { page: 71, fr: [61], ranks: 1, attributes: { cha: 7 } }],
    ["zXQUHfk3g9d7WDG1", { page: 71, fr: [64], ranks: 3, attributes: { luc: 6 }, level: 1, levelIncrease: 5 }],
    ["SfcMrqZU78wIJQ0r", { page: 71, fr: [62], ranks: 1, attributes: { str: 5, agi: 7 } }]
  ]);

  const catalogById = new Map(catalog.entries.filter(entry => entry.pack === "perks").map(entry => [entry.documentId, entry]));
  for (const [id, expectation] of expected) {
    const entry = catalogById.get(id);
    assert.ok(entry, `certification entry missing for perk ${id}`);
    assert.equal(entry.page, expectation.page, `${id} source page`);
    assert.deepEqual(entry.sourcePages?.en, [expectation.page], `${id} EN source coordinate`);
    assert.deepEqual(entry.sourcePages?.fr, expectation.fr, `${id} FR source coordinate`);
  }

  for (const language of ["en", "fr"]) {
    const byId = new Map(
      (await generatedDocuments(language))
        .filter(({ pack }) => pack === "perks")
        .map(({ document }) => [document._id, document])
    );
    for (const [id, expectation] of expected) {
      const document = byId.get(id);
      assert.ok(document, `${language}/perks/${id} missing`);
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

test("Core perk lot pp.61-64 preserves source names, dice symbols and reviewed localization", async () => {
  const docs = {};
  for (const language of ["en", "fr"]) {
    docs[language] = new Map(
      (await generatedDocuments(language))
        .filter(({ pack }) => pack === "perks")
        .map(({ document }) => [document._id, document])
    );
  }

  assert.equal(docs.en.get("3bfAQcNKzjD0aOJ8").name, "Black Widow/Lady Killer");
  assert.equal(docs.en.get("YDRoA6dGjWXy06hf").name, "Grim Reaper’s Sprint");
  assert.equal(docs.en.get("iDaMlrcxl6kEm3Ex").name, "Party Boy/Party Girl");

  for (const id of [
    "3bfAQcNKzjD0aOJ8", "jhef5zecOk3vQhGy", "49AOicQFjlfIKNUe",
    "H6W082nVJtDeSthQ", "51j1AqLl4zHqoVsN", "YLA9JETKbkkHd3uz",
    "DlJVCaT4RLT38Kgs", "zQpZJuiwAC8Zk9a0", "YDRoA6dGjWXy06hf",
    "VtCwIMtash7XcwxP", "zXQUHfk3g9d7WDG1"
  ]) {
    assert.match(docs.en.get(id).system.description, /@fos\[DC\]/, `${id} combat-die markup`);
    assert.doesNotMatch(docs.en.get(id).system.description, /(?:DD?CD|\+\d+\s+CD\b|roll 1 CD\b)/, `${id} stale extracted dice token`);
  }

  assert.match(docs.en.get("wC8TgVkF6OhFY9XR").system.description, /Requirements<\/strong>: PER 5, AGI 6/);
  assert.match(docs.fr.get("j4XUYfEZwmvkfXBe").system.description, /Discours destiné à convaincre quelqu’un d’un mensonge/);
  assert.doesNotMatch(docs.fr.get("j4XUYfEZwmvkfXBe").system.description, /D i s c o u r s|des -|q u e l q u/);

  const dogmeatPerkFr = docs.fr.get("6VAkIp310dSGvCj7").system.description;
  assert.match(dogmeatPerkFr, /Vous n’êtes pas seul dans la nature/);
  assert.doesNotMatch(dogmeatPerkFr, /CORPS ESPRIT|CAPACITÉS SPÉCIALES|MORSURE/);

  const gunNut = docs.en.get("Ba5yPRdNAvjM5StI");
  assert.equal(gunNut.system.rank.max, 4);
  assert.match(gunNut.system.description, /small guns and heavy weapons/);
});

test("Dogmeat p.63 / Canigou p.61 Actor is complete with exact embedded mechanics and localization", async () => {
  const records = {};
  for (const language of ["en", "fr"]) {
    records[language] = (await generatedDocuments(language)).find(
      ({ pack, document }) => pack === "denizens" && document._id === "zflSJmUFBiNAFEwR"
    )?.document;
    assert.ok(records[language], `${language} Dogmeat Actor missing`);
  }

  for (const [language, actor] of Object.entries(records)) {
    assert.equal(actor.flags["fallout2d20-compendium"].source.page, 63);
    assert.equal(actor.system.level.value, 1);
    assert.equal(actor.system.body.value, 5);
    assert.equal(actor.system.mind.value, 4);
    assert.equal(actor.system.melee.value, 2);
    assert.equal(actor.system.guns.value, 0);
    assert.equal(actor.system.other.value, 1);
    assert.equal(actor.system.health.max, 6);
    assert.equal(actor.system.defense.value, 1);
    assert.equal(actor.system.bodyType, "quadruped");
    for (const resistance of ["physical", "energy", "radiation", "poison"]) {
      assert.equal(actor.system.resistance[resistance].value, 0, `${language} Dogmeat ${resistance} DR`);
    }

    const byItemId = new Map(actor.items.map(item => [item._id, item]));
    const bite = byItemId.get("T5MviXJB7FfqNknk");
    assert.ok(bite);
    assert.equal(bite.system.attribute, "body");
    assert.equal(bite.system.skill, "melee");
    assert.equal(bite.system.damage.rating, 2);
    assert.equal(bite.system.damage.damageType.physical, true);
    assert.equal(bite.system.damage.damageEffect.vicious.value, true);

    for (const id of ["llgr3hvuu5FXz7oH", "hD36xYjXqMwgPGwS", "Zug8YehPY4icIfdV"]) assert.ok(byItemId.get(id));
  }

  const enById = new Map(records.en.items.map(item => [item._id, item]));
  assert.match(enById.get("llgr3hvuu5FXz7oH").system.description, /One or more of Dogmeat’s senses are especially keen/);
  assert.match(enById.get("Zug8YehPY4icIfdV").system.description, /carry weight is 50 lbs/);
  assert.match(enById.get("Zug8YehPY4icIfdV").system.description, /\+1 @fos\[DC\] at 5th level/);

  const frById = new Map(records.fr.items.map(item => [item._id, item]));
  assert.equal(records.fr.name, "Canigou");
  assert.equal(records.fr.system.origin, "Mammifère");
  assert.equal(records.fr.system.biography, "");
  assert.match(frById.get("llgr3hvuu5FXz7oH").system.description, /Au moins l’un des sens de Canigou est particulièrement aiguisé/);
  assert.match(frById.get("hD36xYjXqMwgPGwS").system.description, /il doit se placer à portée de main de votre cible/);
  assert.match(frById.get("Zug8YehPY4icIfdV").system.description, /charge maximale est de 25 kg/);
  assert.match(frById.get("Zug8YehPY4icIfdV").system.description, /tous les 2 niveaux par la suite/);
  assert.match(frById.get("Zug8YehPY4icIfdV").system.description, /\+1 @fos\[DC\] au niveau 5/);
  assert.equal(records.fr.flags["fallout2d20-compendium"].source.translationReviewed, true);
  assert.equal(records.fr.flags["fallout2d20-compendium"].source.diceSymbolsReviewed, true);
  assert.equal(records.fr.flags["fallout2d20-compendium"].source.errataReviewed, true);
});

test("Core perk lot pp.65-68 and FR counterpart identities match source coordinates and mechanics", async () => {
  const expected = new Map([
    ["ugnoJLCjVbVsAqOj", { page: 65, fr: [69], ranks: 2, attributes: { agi: 7 }, level: 2, levelIncrease: 4 }],
    ["NMrJsMFjSLAYtHAU", { page: 65, fr: [68], ranks: 1, attributes: { int: 8 } }],
    ["LzDGf5TGlzcOBgFd", { page: 65, fr: [65], ranks: 3, attributes: { int: 7 }, level: 1, levelIncrease: 5 }],
    ["FLW7Fx5HVaIxuekh", { page: 65, fr: [65], ranks: 1, attributes: { str: 8 } }],
    ["SihEoKZZ7VgRmxgK", { page: 65, fr: [66], ranks: 1, attributes: { per: 8 } }],
    ["YrVruOKk8Wy2YOc9", { page: 66, fr: [71], ranks: 1, attributes: { cha: 8 } }],
    ["mU5YvUEtBshgRPFD", { page: 66, fr: [69], ranks: 2, attributes: { str: 6 }, level: 1, levelIncrease: 5 }],
    ["4uNzMc2WNqMYZEuW", { page: 66, fr: [72], ranks: 1, attributes: { cha: 8 } }],
    ["w1Vn3NXOGw30Hi13", { page: 66, fr: [73], ranks: 5, level: 5, levelIncrease: 5 }],
    ["iMnBN75TTp1DuKzk", { page: 67, fr: [68], ranks: 1 }],
    ["nOpsl2puqWzQJT4t", { page: 67, fr: [66], ranks: 1, attributes: { per: 8, agi: 9 } }],
    ["fMU0zfQYyhkwZ6Ck", { page: 67, fr: [66], ranks: 1, attributes: { int: 8 } }],
    ["SFhtHQk4lztiJ8gw", { page: 67, fr: [65], ranks: 1, attributes: { per: 10 } }],
    ["ycaluMjkY5xApFFl", { page: 67, fr: [67], ranks: 1, attributes: { agi: 9 } }],
    ["URnrv6ebs1Oqso2m", { page: 67, fr: [62], ranks: 1, attributes: { agi: 6 } }],
    ["EYZgPc9OM7qsPpT1", { page: 67, fr: [67], ranks: 1, attributes: { luc: 7 } }],
    ["gbPgHoavxEEaYC4j", { page: 68, fr: [69], ranks: 3, attributes: { int: 8 }, level: 2, levelIncrease: 5 }],
    ["jqGwYM88awxTPn46", { page: 68, fr: [67], ranks: 1, attributes: { per: 7 } }],
    ["82n08gxPWsoaLlvK", { page: 68, fr: [67], ranks: 1, attributes: { agi: 8 } }],
    ["zlPvWlAVWezHiFXX", { page: 68, fr: [68], ranks: 1, attributes: { int: 9 } }],
    ["TzAVKNEtdWWgfx4u", { page: 68, fr: [66], ranks: 2, attributes: { str: 9, end: 7 }, level: 1, levelIncrease: 5 }],
    ["Epn0E2yMAxTmSOFX", { page: 69, fr: [68], ranks: 1, attributes: { str: 8 } }],
    ["e4HPClvz4fA06tUc", { page: 69, fr: [68], ranks: 3, attributes: { per: 8, agi: 8 }, level: 1, levelIncrease: 3 }],
    ["H6x4BnrUSmI33dwZ", { page: 70, fr: [65], ranks: 1, attributes: { str: 7 } }],
    ["2UGzU0qmtozi4QZK", { page: 70, fr: [66], ranks: 1, attributes: { agi: 8 } }],
    ["RkftnkHGKVnz6URN", { page: 70, fr: [65], ranks: 2, attributes: { agi: 7 }, level: 2, levelIncrease: 4 }],
    ["fGZ6h4VtddiXvpZ3", { page: 72, fr: [66], ranks: 3, attributes: { end: 7, agi: 6 }, levelIncrease: 4 }]
  ]);

  const catalogById = new Map(catalog.entries.filter(entry => entry.pack === "perks").map(entry => [entry.documentId, entry]));
  for (const [id, expectation] of expected) {
    const entry = catalogById.get(id);
    assert.ok(entry, `certification entry missing for perk ${id}`);
    assert.equal(entry.page, expectation.page, `${id} source page`);
    assert.deepEqual(entry.sourcePages?.en, [expectation.page], `${id} EN source coordinate`);
    assert.deepEqual(entry.sourcePages?.fr, expectation.fr, `${id} FR source coordinate`);
  }

  for (const language of ["en", "fr"]) {
    const byId = new Map(
      (await generatedDocuments(language))
        .filter(({ pack }) => pack === "perks")
        .map(({ document }) => [document._id, document])
    );
    for (const [id, expectation] of expected) {
      const document = byId.get(id);
      assert.ok(document, `${language}/perks/${id} missing`);
      assert.equal(document.flags["fallout2d20-compendium"].source.page, expectation.page);
      assert.equal(document.system.rank.max, expectation.ranks);
      for (const [attribute, value] of Object.entries(expectation.attributes ?? {})) {
        assert.equal(document.system.requirementsEx.attributes[attribute].value, value, `${language}/perks/${id} ${attribute}`);
      }
      if (expectation.level !== undefined) assert.equal(document.system.requirementsEx.level, expectation.level);
      if (expectation.levelIncrease !== undefined) assert.equal(document.system.requirementsEx.levelIncrease, expectation.levelIncrease);
    }
  }
});

test("Core perk lot pp.65-68 preserves dice markup and canonical FR mechanics", async () => {
  const docs = {};
  for (const language of ["en", "fr"]) {
    docs[language] = new Map(
      (await generatedDocuments(language))
        .filter(({ pack }) => pack === "perks")
        .map(({ document }) => [document._id, document])
    );
  }

  for (const id of [
    "ugnoJLCjVbVsAqOj", "mU5YvUEtBshgRPFD", "SFhtHQk4lztiJ8gw",
    "ycaluMjkY5xApFFl", "EYZgPc9OM7qsPpT1", "gbPgHoavxEEaYC4j",
    "82n08gxPWsoaLlvK", "TzAVKNEtdWWgfx4u", "RkftnkHGKVnz6URN",
    "fGZ6h4VtddiXvpZ3"
  ]) {
    assert.match(docs.en.get(id).system.description, /@fos\[DC\]/, `${id} combat-die markup`);
    assert.doesNotMatch(docs.en.get(id).system.description, /(?:DD?CD|\+\d+\s*CD\b|\d+CD\b)/, `${id} stale extracted dice token`);
  }

  assert.match(docs.en.get("ugnoJLCjVbVsAqOj").system.description, /one-handed ranged weapon/);

  const gunNutFr = docs.fr.get("Ba5yPRdNAvjM5StI").system.description;
  assert.match(gunNutFr, /armes légères et les armes lourdes/);

  const hackerFr = docs.fr.get("NMrJsMFjSLAYtHAU").system.description;
  assert.match(hackerFr, /Réduisez de 1 .* la difficulté de vos tests pour pirater les ordinateurs/);
  assert.doesNotMatch(hackerFr, /Faire les poches|500 grammes|montre-bracelet/);

  for (const id of ["LzDGf5TGlzcOBgFd", "fMU0zfQYyhkwZ6Ck"]) {
    const description = docs.fr.get(id).system.description;
    assert.match(description, /action capitale Porter secours/);
    assert.doesNotMatch(description, /action mineure Porter secours/);
  }

  const pickpocketRule = catalog.entries.find(entry => entry.type === "rule_text" && entry.sourceName === "Pickin’ Pockets");
  assert.ok(pickpocketRule);
  assert.equal(pickpocketRule.scope, "out_of_scope");
  assert.deepEqual(pickpocketRule.sourcePages, { en: [69], fr: [68] });
});

