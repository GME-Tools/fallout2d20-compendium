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

test("Core perk catalogue pp.69-73 is complete with exact bilingual source coordinates", async () => {
  const expected = new Map([
    ["Epn0E2yMAxTmSOFX", { page: 69, fr: [68], ranks: 1 }],
    ["iDaMlrcxl6kEm3Ex", { page: 69, fr: [64], ranks: 1 }],
    ["RhITTHDy13MufCZy", { page: 69, fr: [69], ranks: 1 }],
    ["E3vqYT7JvmyDeFyU", { page: 69, fr: [64], ranks: 1 }],
    ["e4HPClvz4fA06tUc", { page: 69, fr: [68], ranks: 3 }],
    ["H6x4BnrUSmI33dwZ", { page: 70, fr: [65], ranks: 1 }],
    ["aNO3ZBQmBGS9A94C", { page: 70, fr: [69], ranks: 3 }],
    ["Xz1V9etWzTtwt5x5", { page: 70, fr: [63], ranks: 1 }],
    ["2UGzU0qmtozi4QZK", { page: 70, fr: [66], ranks: 1 }],
    ["TFJbnmRbE7cisziV", { page: 70, fr: [60], ranks: 2 }],
    ["myJS8tB5FHk3Jo65", { page: 70, fr: [70], ranks: 2 }],
    ["E6eCO6Hq6gb4KGmQ", { page: 70, fr: [70], ranks: 1 }],
    ["RkftnkHGKVnz6URN", { page: 70, fr: [65], ranks: 2 }],
    ["GiPKNxmrkWA2k76W", { page: 70, fr: [63, 64], ranks: 3 }],
    ["UzRkuAJkvYqK8jrl", { page: 71, fr: [70], ranks: 4 }],
    ["j4XUYfEZwmvkfXBe", { page: 71, fr: [61], ranks: 1 }],
    ["dIQkAZGEzdR8j2BB", { page: 71, fr: [70], ranks: 2 }],
    ["zXQUHfk3g9d7WDG1", { page: 71, fr: [64], ranks: 3 }],
    ["SfcMrqZU78wIJQ0r", { page: 71, fr: [62], ranks: 1 }],
    ["PtWvAVSdwEPjeRb3", { page: 71, fr: [71], ranks: 10 }],
    ["fGZ6h4VtddiXvpZ3", { page: 72, fr: [66], ranks: 3 }],
    ["6U2ulr6F0lUbJoYl", { page: 72, fr: [72], ranks: 1 }],
    ["fhBw3zhOo6EuZy2j", { page: 72, fr: [60], ranks: 1 }],
    ["Y7s5hBuYxnIYz4T4", { page: 72, fr: [69], ranks: 1 }],
    ["cJGae8CyPIfp6tj7", { page: 72, fr: [71], ranks: 1 }],
    ["FXbX2ktBJkb6uFIG", { page: 72, fr: [63], ranks: 1 }],
    ["qrXcBKc5MX1lTmKa", { page: 72, fr: [72], ranks: 1 }],
    ["6UWfRLqNydpXobqM", { page: 73, fr: [70], ranks: 3 }],
    ["4QXLYHaB9WGmGVY1", { page: 73, fr: [71], ranks: 1 }],
    ["CaZiVRLhAUoxj0en", { page: 73, fr: [69], ranks: 2 }],
    ["OL6ocnHhOZW4mxns", { page: 73, fr: [70], ranks: 2 }]
  ]);

  const catalogById = new Map(catalog.entries.filter(entry => entry.pack === "perks").map(entry => [entry.documentId, entry]));
  assert.equal(expected.size, 31);
  for (const [id, expectation] of expected) {
    const entry = catalogById.get(id);
    assert.ok(entry, `certification entry missing for perk ${id}`);
    assert.equal(entry.page, expectation.page, `${id} source page`);
    assert.deepEqual(entry.sourcePages?.en, [expectation.page], `${id} EN source coordinate`);
    assert.deepEqual(entry.sourcePages?.fr, expectation.fr, `${id} FR source coordinate`);
    assert.equal(entry.status, "verified");
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
    }
  }
});

test("Core final perk pages preserve errata and source combat-die text", async () => {
  const docs = {};
  for (const language of ["en", "fr"]) {
    docs[language] = new Map(
      (await generatedDocuments(language))
        .filter(({ pack }) => pack === "perks")
        .map(({ document }) => [document._id, document])
    );
  }

  const pyromaniac = docs.en.get("aNO3ZBQmBGS9A94C");
  assert.match(pyromaniac.system.description, /fire-based weapons/);
  assert.match(pyromaniac.system.description, /\+1 @fos\[DC\] per rank/);
  assert.doesNotMatch(pyromaniac.system.description, /firebased|\+1CD/);

  for (const language of ["en", "fr"]) {
    assert.equal(docs[language].get("UzRkuAJkvYqK8jrl").system.rank.max, 4, `${language} Science! errata rank count`);
  }

  const quickHandsEn = docs.en.get("2UGzU0qmtozi4QZK").system.description;
  const quickHandsFr = docs.fr.get("2UGzU0qmtozi4QZK").system.description;
  assert.match(quickHandsEn, /spend 2 AP to increase the Fire Rate of your gun by \+2 for that attack/);
  assert.match(quickHandsFr, /dépenser 2 PA pour augmenter de \+2 la cadence de tir de votre arme pour cette attaque uniquement/);
});

test("Step 5 derived statistics is explicitly out of compendium scope", () => {
  const step5 = catalog.entries.find(entry => entry.sourceName === "Step 5: Derived Statistics");
  assert.ok(step5);
  assert.equal(step5.scope, "out_of_scope");
  assert.deepEqual(step5.sourcePages, { en: [74], fr: [74] });
  assert.equal(step5.certification?.canonicalMechanicsReviewed, true);
  assert.match(step5.certification?.note ?? "", /FR page prints first-level HP as END \+ CHA/);

  const artwork = catalog.entries.find(entry => entry.page === 75 && entry.sourceName === "Character Creation artwork");
  assert.ok(artwork);
  assert.equal(artwork.scope, "out_of_scope");
});

test("Core Step 6 equipment packages are source-complete and apply current errata", () => {
  const expected = new Map([
    ["Brotherhood of Steel Initiate", { page: 76, fr: [76], contents: [
      "Brotherhood fatigues and Brotherhood hood",
      "Combat knife",
      "Laser pistol and a fusion cell containing 10 +5 CD shots, or a 10mm pistol with 10 +5 CD rounds of 10mm ammunition",
      "Brotherhood holotags containing identifying information"
    ] }],
    ["Brotherhood of Steel Scribe", { page: 76, fr: [76], contents: [
      "Brotherhood Field Scribe’s armor and Brotherhood Scribe’s hat",
      "Combat knife",
      "Laser pistol and a fusion cell containing 6 +3 CD shots, or a 10mm pistol with 6 +3 CD rounds of 10mm ammunition",
      "Brotherhood holotags containing identifying information"
    ] }],
    ["Miss Nanny", { page: 77, fr: [76, 77], contents: [
      "One pincer arm attachment, one flamer arm attachment, and one arm attachment of your choice",
      "Standard plating", "Behavioral analysis mod", "Hazard detection mod", "10 caps"
    ] }],
    ["Mister Farmhand", { page: 77, fr: [77], contents: [
      "One pincer arm attachment, one buzz-saw arm attachment, and one laser emitter arm attachment",
      "Standard plating", "One bag of fertilizer (1 uncommon material)", "2 mutfruits", "25 caps"
    ] }],
    ["Mister Gutsy", { page: 77, fr: [77], contents: [
      "One 10mm auto pistol arm, one buzz-saw arm attachment, and one laser emitter arm attachment",
      "Mister Gutsy plating", "Recon sensors mod", "10 caps"
    ] }],
    ["Mister Handy", { page: 77, fr: [77], contents: [
      "One pincer arm attachment, one flamer arm attachment, and one buzz-saw arm attachment",
      "Standard plating", "Robot repair kit", "Integral boiler mod", "10 caps"
    ] }],
    ["Nurse Handy", { page: 77, fr: [77], contents: [
      "One pincer arm or buzz-saw arm attachment, one buzz-saw arm attachment, and one attachment of your choice",
      "Standard plating", "Stimpak", "Diagnosis mod", "10 caps"
    ] }],
    ["Brute", { page: 78, fr: [78], contents: [
      "Raider armor torso and either one leg or one arm",
      "Pipe rifle (pipe gun) with 6 +3 CD rounds of .38 ammunition",
      "Baseball bat or machete", "One personal trinket", "5 caps"
    ] }],
    ["Skirmisher", { page: 78, fr: [77], contents: [
      "Raider armor torso and either one leg or one arm",
      "Pipe rifle (pipe gun with long barrel and full stock mods), with 6 +3 CD rounds of .308 ammunition",
      "Board", "One personal trinket", "5 caps"
    ] }],
    ["Vault-Tec Resident", { page: 78, fr: [78], contents: [
      "Vault jumpsuit", "Vault-Tec branded canteen containing 1 purified water", "Pip-Boy", "Switchblade",
      "10mm pistol with 6 +3 CD rounds of 10mm ammunition", "2 Stimpaks", "10 caps"
    ] }],
    ["Vault-Tec Security", { page: 78, fr: [78], contents: [
      "Vault jumpsuit", "Vault-Tec Security armor and Vault-Tec Security helmet", "Vault-Tec branded canteen containing 1 purified water",
      "Pip-Boy", "Baton", "10mm pistol with 8 +4 CD rounds of 10mm ammunition", "1 Stimpak"
    ] }],
    ["Mercenary", { page: 79, fr: [79], contents: [
      "Tough clothing", "A leather armor chest piece, or a leather armor arm and a leather armor leg",
      "Machete, baseball bat, or tire iron", "10mm automatic pistol, .44 pistol, hunting rifle, or bolt-action pipe gun",
      "10 +5 CD rounds of ammunition for the chosen ranged weapon",
      "A note advertising a job in a nearby settlement that offers to pay 50 caps", "15 caps"
    ] }],
    ["Raider", { page: 79, fr: [79], contents: [
      "Harness", "Raider armor chest piece and raider armor for one arm", "Lead pipe, pool cue, or tire iron",
      "Pipe gun with 10 +5 CD rounds of .38 ammunition", "1 dose of Jet or RadAway", "One Molotov cocktail or one Stimpak", "15 caps"
    ] }],
    ["Settler", { page: 79, fr: [78], contents: [
      "Tough clothing", "Switchblade, pipe wrench, rolling pin, or knuckles", "Pipe gun with 6 +3 CD rounds of .38 ammunition",
      "2 rolls on the Random Food table (p.202)", "One personal trinket", "45 caps"
    ] }],
    ["Trader", { page: 80, fr: [78, 79], contents: [
      "Tough clothing", "A leather armor chest piece, or a leather armor arm and a leather armor leg",
      "Pipe gun with 8 +4 CD rounds of .38 ammunition", "One personal trinket",
      "Wares: roll 3 times each on the Random Ammunition, Random Chem, and Random Oddities and Valuables tables",
      "A pack brahmin (see Brahmin, p.341)", "50 caps"
    ] }],
    ["Wanderer", { page: 80, fr: [79], contents: [
      "Drifter outfit", "Switchblade, pipe wrench, rolling pin, or knuckles", "Pipe gun with 8 +4 CD rounds of .38 ammunition",
      "1 dose of Jet or RadAway", "One personal trinket", "30 caps"
    ] }]
  ]);

  const packages = catalog.entries.filter(entry => entry.type === "equipment_bundle" && entry.page >= 76 && entry.page <= 80);
  assert.equal(packages.length, expected.size);
  for (const [name, expectation] of expected) {
    const entry = packages.find(candidate => candidate.sourceName === name);
    assert.ok(entry, name + " equipment bundle missing from source inventory");
    assert.equal(entry.page, expectation.page);
    assert.deepEqual(entry.sourcePages.en, [expectation.page]);
    assert.deepEqual(entry.sourcePages.fr, expectation.fr);
    assert.deepEqual(entry.certification.canonicalContents, expectation.contents);
    assert.equal(entry.scope, "out_of_scope");
    assert.equal(entry.status, "out_of_scope");
  }

  const farmhand = packages.find(entry => entry.sourceName === "Mister Farmhand");
  assert.match(farmhand.certification.canonicalContents.join("\n"), /fertilizer \(1 uncommon material\)/);
  assert.match(farmhand.certification.localizationNote, /official FR page prints only/);

  const skirmisher = packages.find(entry => entry.sourceName === "Skirmisher");
  assert.match(skirmisher.certification.canonicalContents.join("\n"), /long barrel and full stock mods/);
  assert.match(skirmisher.certification.canonicalContents.join("\n"), /6 \+3 CD rounds of \.308/);
  assert.doesNotMatch(skirmisher.certification.canonicalContents.join("\n"), /8 \+4 CD rounds of \.308|headpiece/);
  assert.equal(skirmisher.certification.errataApplied.length, 3);

  const trader = packages.find(entry => entry.sourceName === "Trader");
  assert.match(trader.certification.canonicalContents.join("\n"), /A pack brahmin/);
  assert.match(trader.certification.localizationNote, /FR pack prints “Deux brahmines”/);
  assert.match(trader.certification.canonicalContents.join("\n"), /roll 3 times each/);
});

test("Core Step 6 referenced identities resolve bilingually and Skirmisher keeps the required Pipe Gun mods", async () => {
  const relevant = catalog.entries.filter(entry => entry.page >= 76 && entry.page <= 81);
  const refs = relevant.flatMap(entry => [
    ...(entry.certification?.documentRefs ?? []),
    ...((entry.certification?.rows ?? []).flatMap(row => row.documentRefs ?? []))
  ]);
  const unique = [...new Map(refs.map(ref => [ref.pack + "/" + ref.documentId, ref])).values()];
  assert.ok(unique.length > 50, "Step 6 should record a broad source-derived reference inventory");

  for (const language of ["en", "fr"]) {
    const records = await generatedDocuments(language);
    for (const ref of unique) {
      assert.ok(
        records.some(record => record.pack === ref.pack && record.document._id === ref.documentId),
        language + "/" + ref.pack + "/" + ref.documentId + "/" + ref.sourceName + " missing"
      );
    }
  }

  const pipeGun = JSON.parse(await readFile("src/packs/canonical/weapons.db/pipe_gun__PiFmAFrgnIJqwkNw.json", "utf8"));
  assert.equal(pipeGun.system.mods.RyggZv9PwKChzJwB.$ref.pack, "weapon-mods");
  assert.equal(pipeGun.system.mods.RyggZv9PwKChzJwB.$ref.id, "RyggZv9PwKChzJwB");
  assert.equal(pipeGun.system.mods.bRV8rXkptjU6mz9Y.$ref.pack, "weapon-mods");
  assert.equal(pipeGun.system.mods.bRV8rXkptjU6mz9Y.$ref.id, "bRV8rXkptjU6mz9Y");
});

test("Core Random Trinkets p.80 matches both official source tables exactly", async () => {
  const expected = {
    en: [
      "A gold pocket watch", "A garbled holodisk", "A brightly colored bandanna", "A silver locket", "Medal",
      "Potted plant", "Tickets to a pre-war event", "Wedding ring", "Pre-war party invitation", "An engraved flip lighter",
      "Loaded casino dice", "ID card", "Cosmetics case", "Musical instrument", "Broken eyeglasses", "Necklace made of junk",
      "Pages of an unfinished story", "Overdue library book", "A postcard with an address", "A pre-war neck-tie"
    ],
    fr: [
      "Montre à gousset en or", "Holodisque brouillé", "Bandana aux couleurs vives", "Médaillon en argent", "Médaille",
      "Plante en pot", "Tickets pour un événement d’avant-guerre", "Alliance", "Invitation à une fête d’avant-guerre",
      "Briquet-tempête gravé", "Dé de casino pipé", "Carte d’identité", "Mallette de cosmétiques", "Instrument de musique",
      "Lunettes cassées", "Collier fait de bric-à-brac", "Pages d’une histoire non terminée",
      "Livre de bibliothèque jamais rendu", "Carte postale avec adresse", "Cravate d’avant-guerre"
    ]
  };

  const entry = catalog.entries.find(candidate => candidate.documentId === "NSMq85o2aSfE60Aa");
  assert.ok(entry);
  assert.equal(entry.page, 80);
  assert.deepEqual(entry.sourcePages, { en: [80], fr: [80] });
  assert.equal(entry.status, "verified");

  for (const language of ["en", "fr"]) {
    const tableRecord = (await generatedDocuments(language))
      .find(({ pack, document }) => pack === "roll-tables" && document._id === "NSMq85o2aSfE60Aa");
    assert.ok(tableRecord, language + "/roll-tables/NSMq85o2aSfE60Aa missing");
    const table = tableRecord.document;
    assert.equal(table.formula, "1d20");
    assert.equal(table.results.length, 20);
    assert.deepEqual(table.results.map(result => result.range), Array.from({ length: 20 }, (_, index) => [index + 1, index + 1]));
    assert.deepEqual(table.results.map(result => result.name), expected[language]);
  }
});

test("Core Tag Skill Items and higher-level starting gear tables are exhaustively source-inventoried", () => {
  const tag = catalog.entries.find(entry => entry.sourceName === "Items Gained from Tag Skills");
  assert.ok(tag);
  assert.equal(tag.scope, "out_of_scope");
  assert.deepEqual(tag.sourcePages, { en: [81], fr: [80, 81] });
  assert.deepEqual(tag.certification.rows.map(row => [row.skill, row.items]), [
    ["Athletics", "Casual clothing, 1 Buffout"],
    ["Barter", "2d20 additional caps"],
    ["Big Guns", "4 +2 CD shots of flamer fuel"],
    ["Energy Weapons", "Fusion cell containing 6 +3 CD shots"],
    ["Explosives", "2 Molotov cocktails or 2 baseball grenades"],
    ["Lockpick", "4 +2 CD bobby pins"],
    ["Medicine", "1 first aid kit, 1 Stimpak"],
    ["Melee Weapons", "Machete or baseball bat"],
    ["Pilot", "Broken car parts (equivalent to 5 common scrap)"],
    ["Repair", "Multi-Tool"],
    ["Science", "Lab coat, 1 dose of Mentats"],
    ["Small Guns", "6 +3 CD additional shots of ammunition of a type you already possess"],
    ["Sneak", "One dose of Calmex"],
    ["Speech", "Formal hat, formal clothing"],
    ["Survival", "2 purified water, 1 iguana on a stick"],
    ["Throwing", "4 +2 CD throwing knives or 2 +1 CD tomahawks"],
    ["Unarmed", "Knuckles"]
  ]);

  const higher = catalog.entries.find(entry => entry.sourceName === "Additional Caps by Starting Level");
  assert.ok(higher);
  assert.equal(higher.scope, "out_of_scope");
  assert.deepEqual(higher.sourcePages, { en: [81], fr: [81] });
  assert.deepEqual(higher.certification.rows, [
    { level: "2", caps: 100, maxRarity: "1" }, { level: "3", caps: 250, maxRarity: "1" },
    { level: "4", caps: 450, maxRarity: "1" }, { level: "5", caps: 700, maxRarity: "2" },
    { level: "6", caps: 1000, maxRarity: "2" }, { level: "7", caps: 1350, maxRarity: "2" },
    { level: "8", caps: 1750, maxRarity: "2" }, { level: "9", caps: 2200, maxRarity: "3" },
    { level: "10", caps: 2700, maxRarity: "3" }, { level: "11", caps: 3250, maxRarity: "3" },
    { level: "12", caps: 3850, maxRarity: "3" }, { level: "13", caps: 4500, maxRarity: "4" },
    { level: "14", caps: 5200, maxRarity: "4" }, { level: "15", caps: 5950, maxRarity: "4" },
    { level: "16", caps: 6750, maxRarity: "4" }, { level: "17", caps: 7600, maxRarity: "5" },
    { level: "18", caps: 8500, maxRarity: "5" }, { level: "19", caps: 9450, maxRarity: "5" },
    { level: "20", caps: 10450, maxRarity: "5" }, { level: "21+", caps: "Level ×50", maxRarity: "Any" }
  ]);
});

test("Core Personal Trinket recovery rule is explicitly accounted for", () => {
  const rule = catalog.entries.find(entry => entry.sourceName === "Personal Trinkets");
  assert.ok(rule);
  assert.equal(rule.scope, "out_of_scope");
  assert.deepEqual(rule.sourcePages, { en: [80], fr: [80] });
  assert.match(rule.certification.mechanic, /once per quest outside combat/);
  assert.match(rule.certification.mechanic, /regain 1 Luck Point/);
});

test("Core transition and equipment rules pp.82-87 are explicitly classified out of compendium scope", () => {
  const expected = [
    [82, "Character Creation closing artwork"],
    [83, "Chapter Four: Equipment divider"],
    [84, "Obtaining Equipment"],
    [84, "Caps"],
    [84, "Other Currency"],
    [85, "Availability and Rarity"],
    [85, "Selling"],
    [85, "Haggling"],
    [85, "Bulk Buy!"],
    [86, "Barter"],
    [86, "Finding Equipment in the Wasteland"],
    [87, "Encumbrance"],
    [87, "Modifying Equipment"],
    [87, "Modified Equipment Names"]
  ];
  for (const [page, name] of expected) {
    const entry = catalog.entries.find(candidate => candidate.page === page && candidate.sourceName === name);
    assert.ok(entry, name + " source classification missing");
    assert.equal(entry.scope, "out_of_scope");
    assert.equal(entry.status, "out_of_scope");
    assert.ok(entry.justification);
  }

  const art = catalog.entries.find(entry => entry.sourceName === "Character Creation closing artwork");
  assert.deepEqual(art.sourcePages, { en: [82], fr: [82] });

  const divider = catalog.entries.find(entry => entry.sourceName === "Chapter Four: Equipment divider");
  assert.deepEqual(divider.sourcePages, { en: [83], fr: [83] });

  const otherCurrency = catalog.entries.find(entry => entry.sourceName === "Other Currency");
  assert.deepEqual(otherCurrency.sourcePages, { en: [84, 85], fr: [84, 85] });
  assert.equal(otherCurrency.certification.continuationReviewed, true);

  const modifiedNames = catalog.entries.find(entry => entry.sourceName === "Modified Equipment Names");
  assert.deepEqual(modifiedNames.sourcePages, { en: [87, 88], fr: [87, 88] });
  assert.equal(modifiedNames.certification.continuationReviewed, true);
  assert.match(modifiedNames.certification.note, /does not certify the rest of p\.88/);
});

test("Core equipment acquisition rules retain EN canonical mechanics over FR source discrepancies", () => {
  const availability = catalog.entries.find(entry => entry.sourceName === "Availability and Rarity");
  assert.match(availability.certification.mechanic, /CD equal to LCK/);
  assert.match(availability.certification.localizationNote, /FR page prints CHA/);
  assert.doesNotMatch(availability.certification.mechanic, /equal to CHA/);

  const selling = catalog.entries.find(entry => entry.sourceName === "Selling");
  assert.match(selling.certification.mechanic, /one quarter/);
  assert.match(selling.certification.mechanic, /rounded down/);

  const haggling = catalog.entries.find(entry => entry.sourceName === "Haggling");
  assert.match(haggling.certification.mechanic, /opposed CHA \+ Barter/);
  assert.match(haggling.certification.mechanic, /Success improves the price by 10%/);
  assert.match(haggling.certification.mechanic, /success plus 2 AP improves it by 20%/);

  const barter = catalog.entries.find(entry => entry.sourceName === "Barter");
  assert.match(barter.certification.mechanic, /subtract the lower total value from the higher/);
});

test("Core p.87 modification procedure applies the Q3 2026 unique-mod erratum", () => {
  const modifying = catalog.entries.find(entry => entry.sourceName === "Modifying Equipment");
  assert.deepEqual(modifying.sourcePages, { en: [87], fr: [87] });
  assert.deepEqual(modifying.certification.canonicalArmorModSlots, ["material mod", "unique mod"]);
  assert.match(modifying.certification.errataApplied.join("\n"), /Q3 2026/);
  assert.match(modifying.certification.errataApplied.join("\n"), /utility mod/);
  assert.match(modifying.certification.installRule, /Difficulty 1 INT/);
  assert.match(modifying.certification.installRule, /Spend 2 AP/);
  assert.match(modifying.certification.localizationNote, /mod de fonctionnalité/);
});
