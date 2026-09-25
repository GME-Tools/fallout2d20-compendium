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
  assert.equal(pipeGun.system.mods["8nHC8z4vEY4yX7bM"].$ref.pack, "weapon-mods");
  assert.equal(pipeGun.system.mods["8nHC8z4vEY4yX7bM"].$ref.id, "8nHC8z4vEY4yX7bM");
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
  assert.match(modifiedNames.certification.note, /Source p\.88 is now independently certified/);
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

  const barter = catalog.entries.find(entry => entry.page === 86 && entry.type === "rule_text" && entry.sourceName === "Barter");
  assert.ok(barter);
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


test("Core weapon rules pp.88-90 are source-inventoried without inventing standalone documents", () => {
  const rules = catalog.entries.find(entry => entry.page === 88 && entry.sourceName === "Weapons, Ammunition, and Weapon Mods");
  assert.ok(rules);
  assert.equal(rules.scope, "out_of_scope");
  assert.equal(rules.status, "out_of_scope");
  assert.deepEqual(rules.sourcePages, { en: [88, 89, 90], fr: [88, 89, 90] });
  assert.deepEqual(rules.certification.weaponTypes, [
    "Big Guns", "Energy Weapons", "Explosives", "Melee Weapons", "Small Guns", "Throwing", "Unarmed"
  ]);
  assert.deepEqual(rules.certification.damageEffects, [
    "Burst", "Breaking", "Persistent", "Piercing X", "Radioactive", "Spread", "Stun", "Vicious"
  ]);
  assert.deepEqual(rules.certification.damageTypes, ["Physical", "Energy", "Radiation", "Poison"]);
  assert.match(rules.certification.fireRate, /0 to 6/);
  assert.match(rules.certification.fireRate, /additional shot spent adds \+1 CD/);
  assert.deepEqual(rules.certification.ranges, {
    C: "Close — same zone",
    M: "Medium — adjacent zone",
    L: "Long — two zones away",
    X: "Extreme — three or more zones away"
  });
  assert.deepEqual(rules.certification.qualities, [
    "Accurate", "Blast", "Close Quarters", "Concealed", "Debilitating", "Gatling", "Inaccurate",
    "Mine", "Night Vision", "Parry", "Recon", "Reliable", "Suppressed", "Thrown", "Two-Handed", "Unreliable"
  ]);
  assert.match(rules.certification.localizationNote, /Extreme range is abbreviated E in French/);
});


test("Core ammunition pp.91-94 matches the source table, detailed profiles, localization and errata", async () => {
  const standard = new Map([
    ["UJQaP4A50u2tSG6G", [".38 Round", "Cartouche .38", "10+5dc", 1, 0, null]],
    ["1Mku27VQTcwBCwOF", ["10mm Round", "Cartouche 10 mm", "8+4dc", 2, 0, null]],
    ["fuCYfiQzOvr4WtJI", [".308 Round", "Cartouche .308", "6+3dc", 3, 1, null]],
    ["K5VQLz4YU7eZIkAF", ["Flare", "Fusée éclairante", "2+1dc", 1, 1, null]],
    ["PZWO5Wj3kzBXCJJM", ["Shotgun Shell", "Calibre 12", "6+3dc", 3, 1, null]],
    ["VBJiFg5GpSOzyENW", [".45 Round", "Cartouche .45", "8+4dc", 3, 2, null]],
    ["0Ci0Jcpuca6rSqkL", ["Flamer Fuel", "Carburant de lance-flammes", "12+6dc", 1, 2, null]],
    ["Oc7xNpMREJ8N5u3v", ["Fusion Cell", "Cellule à fusion", "14+7dc", 3, 2, null]],
    ["PPA4fiWvfoRf0ZBs", ["Gamma Round", "Cartouche Gamma", "4+2dc", 10, 2, null]],
    ["yGiPeDsETWQBjCdT", ["Railway Spike", "Clou de rail", "6+3dc", 1, 2, null]],
    ["kxgO3CwKpqR9lYLS", [".44 Magnum Round", "Cartouche .44", "4+2dc", 3, 3, null]],
    ["mHatIy0FNJtYZxtU", [".50 Round", "Calibre .50", "4+2dc", 4, 3, null]],
    ["J72UfCpxbBpYr6W5", ["5.56mm Round", "Cartouche 5,56 mm", "8+4dc", 2, 3, null]],
    ["299nvpoTfu1mwKTX", ["5mm Round", "Cartouche 5 mm", "10*(12+6dc)", 1, 3, null]],
    ["9DjIa4OVZOUAZ00i", ["Fusion Core", "Réacteur à fusion", "1", 200, 3, 4]],
    ["7wHhQWCH5t1h8gAR", ["Missile", "Missile", "2+1dc", 25, 3, 7]],
    ["aYG2QbgizqTfxAiy", ["Plasma Cartridge", "Cartouche au plasma", "10+5dc", 5, 4, null]],
    ["cZPDBjJXa2hCjW0K", ["2mm Electromagnetic Cartridge", "CE 2 mm", "6+3dc", 10, 5, null]],
    ["gpthlPtWrerYP7Kn", ["Mini-Nuke", "Mini-bombe nucléaire", "1+1dc", 100, 6, 12]]
  ]);
  const syringe = new Map([
    ["SyrBerserkAmmo01", ["Berserk Syringe", "Folie furieuse", 50]],
    ["SyrBleedOutAmmo1", ["Bleed-Out Syringe", "Hémorragie", 17]],
    ["SyrBloatflyAmmo1", ["Bloatfly Larva Syringe", "Larve de mouche bouffie", 10]],
    ["SyrEndangerolA01", ["Endangerol Syringe", "Dangerol", 60]],
    ["SyrLockJointAm01", ["Lock Joint Syringe", "Artibloc", 40]],
    ["SyrMindCloudAm01", ["Mind Cloud Syringe", "Embrumaze", 73]],
    ["SyrPaxAmmo000001", ["Pax Syringe", "Pax", 39]],
    ["SyrRadVenomAm001", ["Radscorpion Venom Syringe", "Venin de radscorpion", 65]],
    ["SyrYellowBelly01", ["Yellow Belly Syringe", "Escampoudréine", 55]]
  ]);

  const ammoEntries = catalog.entries.filter(entry => entry.pack === "ammunition" && [91, 93].includes(entry.page));
  assert.equal(ammoEntries.length, 28);
  assert.equal(catalog.entries.find(entry => entry.sourceName === "Ammunition Availability and Rarity").certification.rowCount, 20);
  assert.equal(catalog.entries.find(entry => entry.sourceName === "Syringer Ammo").certification.concreteIdentityCount, 9);

  const docsByLanguage = {};
  for (const language of ["en", "fr"]) {
    docsByLanguage[language] = new Map(
      (await generatedDocuments(language))
        .filter(({ pack }) => pack === "ammunition")
        .map(({ document }) => [document._id, document])
    );
  }

  for (const [id, [enName, frName, quantityRoll, cost, rarity, weightLb]] of standard) {
    const entry = catalog.entries.find(candidate => candidate.documentId === id);
    assert.ok(entry, id + " missing from certification inventory");
    assert.equal(entry.page, 91);
    assert.equal(entry.status, "verified");
    for (const language of ["en", "fr"]) {
      const doc = docsByLanguage[language].get(id);
      assert.ok(doc, language + "/ammunition/" + id + " missing");
      assert.equal(doc.flags["fallout2d20-compendium"].source.page, 91);
      assert.equal(doc.name, language === "en" ? enName : frName);
      assert.equal(doc.system.quantityRoll, quantityRoll);
      assert.equal(doc.system.cost, cost);
      assert.equal(doc.system.rarity, rarity);
      assert.equal(doc.flags["fallout2d20-compendium"].source.errataReviewed, true);
      if (language === "fr") assert.equal(doc.flags["fallout2d20-compendium"].source.translationReviewed, true);
    }
    const en = docsByLanguage.en.get(id);
    const fr = docsByLanguage.fr.get(id);
    if (weightLb === null) {
      assert.ok(en.system.weight < 1, enName + " must remain <1 lb as printed");
      assert.equal(fr.system.weight, en.system.weight / 2, frName + " must preserve the project kg=lb/2 convention");
    } else {
      assert.equal(en.system.weight, weightLb);
      assert.equal(fr.system.weight, weightLb / 2);
    }
  }

  for (const [id, [enName, frName, cost]] of syringe) {
    const entry = catalog.entries.find(candidate => candidate.documentId === id);
    assert.ok(entry, id + " missing from certification inventory");
    assert.equal(entry.page, 93);
    for (const language of ["en", "fr"]) {
      const doc = docsByLanguage[language].get(id);
      assert.ok(doc);
      assert.equal(doc.flags["fallout2d20-compendium"].source.page, 93);
      assert.equal(doc.name, language === "en" ? enName : frName);
      assert.equal(doc.system.quantityRoll, "4+2dc");
      assert.equal(doc.system.cost, cost);
      assert.equal(doc.system.rarity, 2);
    }
  }

  const enFusionCore = docsByLanguage.en.get("9DjIa4OVZOUAZ00i").system.description;
  const frFusionCore = docsByLanguage.fr.get("9DjIa4OVZOUAZ00i").system.description;
  assert.match(enFusionCore, /Scrounger perk cannot increase the number of fusion cores found/);
  assert.doesNotMatch(enFusionCore, /Scavenger perk cannot increase the number of fusion cores found/);
  assert.match(frFusionCore, /Farfouilleur/);
  assert.doesNotMatch(docsByLanguage.en.get("Oc7xNpMREJ8N5u3v").system.description, /by default item is set to average shots result/i);
  assert.doesNotMatch(enFusionCore, /item defaults to a default base charge level/i);

  assert.match(docsByLanguage.en.get("SyrBerserkAmmo01").system.description, /attacking the nearest living creature/);
  assert.match(docsByLanguage.fr.get("SyrBerserkAmmo01").system.description, /créature vivante la plus proche/);
  assert.match(docsByLanguage.en.get("SyrEndangerolA01").system.description, /Physical damage resistance is reduced by 2/);
  assert.match(docsByLanguage.fr.get("SyrEndangerolA01").system.description, /résistance aux dégâts balistiques de la cible est réduite de 2/);
  assert.match(docsByLanguage.en.get("SyrMindCloudAm01").system.description, /\+2 difficulty to all PER tests/);
  assert.match(docsByLanguage.fr.get("SyrMindCloudAm01").system.description, /difficulté de tous ses tests de PER augmente de \+2/);
  assert.match(docsByLanguage.en.get("SyrRadVenomAm001").system.description, /Persistent \(Poison\)/);
  assert.match(docsByLanguage.fr.get("SyrRadVenomAm001").system.description, /Persistant \(Poison\)/);
});


test("Core Small Guns pp.95-99 match source mechanics, provenance, localization and accepted mods", async () => {
  const modIds = {
    "Hardened": "wWjvfUfknZOxxJlt", "Powerful": "41rymX7pm90tz0V8", "Advanced": "p0r6B1DzWapL4wU5",
    "Snubnose Barrel": "QgUHARJjhqOXBP7u", "Bull Barrel": "aDXdsogK2fIHtBNE", "Comfort Grip": "Noh6VL5rCdM73QuX",
    "Short Scope": "TxOsscfkniBk2a85", "Reflex Sight": "rh3GtWKomZnQpS1H", "Recon Scope": "M5ox31Qif67xBC0m",
    "Calibrated": "4c34BzfVex4YKgA3", "Automatic": "Jyy3vdkQv7YCfvFz", "Hair Trigger": "GROQd2poQkix32N4",
    "Long Barrel": "RyggZv9PwKChzJwB", "Ported Barrel": "Ac56Ox5nVHcJ8PIA", "Sharpshooter’s Grip": "zAlW93haMYH8Nwp2",
    "Large Magazine": "dh2R5SMlhGBmDuAU", "Quick-Eject Magazine": "067VeMDTeThvISLa", "Large Quick-Eject Magazine": "x7XsKzM5Iyisd9lA",
    "Compensator": "egIL4wuvntMHhlqr", "Suppressor": "dZh7tFPH917IF3UO", "Vented Barrel": "yxSF6qdbdO4FYaQb",
    "Full Stock": "8nHC8z4vEY4yX7bM", "Marksman’s Stock": "Q6VUr8ae7Rf7WOhA", "Recoil-Compensating Stock": "H5uajcZl8MICYwfy",
    "Long Scope": "sg1EfJrr3S307XPy", "Short Night Vision Scope": "vyesQvmRObpdSNpO", "Long Night Vision Scope": "wvsSsznT8GDmdoUa",
    ".38 Receiver": "oiW2VvXVdhGgw4oL", ".308 Receiver": "ybNloPq9nZTqGAur", "Bayonet": "CYODpO6JvopXWYW7",
    "Shielded Barrel": "iiF3omvvTgVv5LoP", "Full Capacitors": "bS7ZxJKZA2JAhPV8", "Capacitor Boosting Coil": "6hh0Evmfv0N8kX81",
    ".50 Receiver": "XShTCPVSPhRDhMBo", "Muzzle Brake": "2aqYiSm1nrIYHgoA", "Sawed-off Barrel": "Iec8KCIeHqCk886z",
    "Finned Barrel": "aCMBNHf2jilKz2Zg", ".45 Receiver": "zpUwoy1BLHyUXuvy", "Automatic Piston": "nGgcu0NLeLIbc3Pi",
    "Marksman’s": "Q6VUr8ae7Rf7WOhA", "Recoil-Compensating": "H5uajcZl8MICYwfy"
  };
  const expected = new Map([
    ["wqNw0xItJ29W24sm", { en: ".44 Pistol", fr: "Pistolet .44", damage: 6, effects: ["vicious"], fireRate: 1, range: "close", qualities: ["close_quarters"], weight: 4, cost: 99, rarity: 2, ammo: [".44 Magnum Round", "Cartouche .44"], mods: ["Hardened","Powerful","Advanced","Snubnose Barrel","Bull Barrel","Comfort Grip","Short Scope","Reflex Sight","Recon Scope"] }],
    ["mRB3W7wrHDbWhb9i", { en: "10mm Pistol", fr: "Pistolet 10 mm", damage: 4, effects: [], fireRate: 2, range: "close", qualities: ["close_quarters","reliable"], weight: 4, cost: 50, rarity: 1, ammo: ["10mm Round","Cartouche 10 mm"], mods: ["Calibrated","Hardened","Automatic","Hair Trigger","Powerful","Advanced","Long Barrel","Ported Barrel","Comfort Grip","Sharpshooter’s Grip","Large Magazine","Quick-Eject Magazine","Large Quick-Eject Magazine","Reflex Sight","Recon Scope","Compensator","Suppressor"] }],
    ["nZ7XeE2gQy2EEgWH", { en: "Flare Gun", fr: "Pistolet lance-fusées", damage: 3, effects: [], fireRate: 0, range: "medium", qualities: ["reliable"], weight: 2, cost: 50, rarity: 1, ammo: ["Flare","Fusée éclairante"], mods: [] }],
    ["ZN2h6VGlcHQKzveB", { en: "Assault Rifle", fr: "Fusil d’assaut", damage: 5, effects: ["burst"], fireRate: 2, range: "medium", qualities: ["two_handed"], weight: 13, cost: 144, rarity: 2, ammo: ["5.56mm Round","Cartouche 5,56 mm"], mods: ["Calibrated","Hardened","Automatic","Hair Trigger","Powerful","Advanced","Long Barrel","Ported Barrel","Vented Barrel","Full Stock","Marksman’s Stock","Recoil-Compensating Stock","Large Magazine","Quick-Eject Magazine","Large Quick-Eject Magazine","Reflex Sight","Short Scope","Long Scope","Short Night Vision Scope","Long Night Vision Scope","Recon Scope","Compensator","Suppressor"] }],
    ["qRc6hN6zHdrsZ0nd", { en: "Combat Rifle", fr: "Carabine de combat", damage: 5, effects: [], fireRate: 2, range: "medium", qualities: ["two_handed"], weight: 11, cost: 117, rarity: 2, ammo: [".45 Round","Cartouche .45"], mods: ["Calibrated","Hardened","Automatic","Hair Trigger","Powerful","Advanced",".38 Receiver",".308 Receiver","Long Barrel","Ported Barrel","Vented Barrel","Full Stock","Marksman’s Stock","Recoil-Compensating Stock","Large Magazine","Quick-Eject Magazine","Large Quick-Eject Magazine","Reflex Sight","Short Scope","Long Scope","Short Night Vision Scope","Long Night Vision Scope","Recon Scope","Bayonet","Compensator","Suppressor"] }],
    ["Ee4TwfZnYmCF8CDE", { en: "Gauss Rifle", fr: "Fusil de Gauss", damage: 10, effects: ["piercing_x"], fireRate: 1, range: "long", qualities: ["two_handed"], weight: 16, cost: 228, rarity: 4, ammo: ["2mm Electromagnetic Cartridge","CE 2 mm"], mods: ["Shielded Barrel","Recoil-Compensating Stock","Full Capacitors","Capacitor Boosting Coil","Reflex Sight","Short Scope","Long Scope","Short Night Vision Scope","Long Night Vision Scope","Recon Scope","Suppressor"] }],
    ["bpbgoX9mNr23pFHR", { en: "Hunting Rifle", fr: "Fusil de chasse", damage: 6, effects: ["piercing_x"], fireRate: 0, range: "medium", qualities: ["two_handed"], weight: 10, cost: 55, rarity: 2, ammo: [".308 Round","Cartouche .308"], mods: ["Hair Trigger","Calibrated","Hardened","Powerful",".38 Receiver",".50 Receiver","Long Barrel","Ported Barrel","Vented Barrel","Full Stock","Marksman’s Stock","Large Magazine","Quick-Eject Magazine","Large Quick-Eject Magazine","Reflex Sight","Short Scope","Long Scope","Short Night Vision Scope","Long Night Vision Scope","Recon Scope","Bayonet","Suppressor"] }],
    ["244Kf3MVUhEQQGsw", { en: "Submachine Gun", fr: "Mitraillette", damage: 3, effects: ["burst"], fireRate: 3, range: "close", qualities: ["inaccurate","two_handed"], weight: 12, cost: 109, rarity: 1, ammo: [".45 Round","Cartouche .45"], mods: ["Hardened","Hair Trigger","Powerful","Full Stock","Recoil-Compensating Stock","Large Magazine","Quick-Eject Magazine","Large Quick-Eject Magazine","Reflex Sight","Compensator","Muzzle Brake","Suppressor"] }],
    ["CUlCBsWk1qipT1Ff", { en: "Combat Shotgun", fr: "Fusil de combat", damage: 5, effects: ["spread"], fireRate: 2, range: "close", qualities: ["inaccurate","two_handed"], weight: 11, cost: 87, rarity: 2, ammo: ["Shotgun Shell","Calibre 12"], mods: ["Calibrated","Hardened","Automatic","Hair Trigger","Powerful","Advanced","Long Barrel","Ported Barrel","Full Stock","Marksman’s Stock","Recoil-Compensating Stock","Large Magazine","Quick-Eject Magazine","Large Quick-Eject Magazine","Reflex Sight","Short Scope","Long Scope","Short Night Vision Scope","Long Night Vision Scope","Recon Scope","Bayonet","Compensator","Muzzle Brake","Suppressor"] }],
    ["tNyHslvLL11qSlhc", { en: "Double-Barrel Shotgun", fr: "Fusil à double canon", damage: 5, effects: ["spread","vicious"], fireRate: 0, range: "close", qualities: ["inaccurate","two_handed"], weight: 9, cost: 39, rarity: 1, ammo: ["Shotgun Shell","Calibre 12"], mods: ["Hardened","Hair Trigger","Powerful","Advanced","Long Barrel","Sawed-off Barrel","Full Stock","Reflex Sight","Muzzle Brake"] }],
    ["obRp9CZJJ6liIl49", { en: "Pipe Bolt-Action", fr: "Arme à verrou de fortune", damage: 5, effects: ["piercing_x"], fireRate: 0, range: "close", qualities: ["unreliable"], weight: 3, cost: 30, rarity: 0, ammo: [".308 Round","Cartouche .308"], mods: ["Calibrated","Hardened","Powerful",".38 Receiver",".50 Receiver","Long Barrel","Ported Barrel","Finned Barrel","Sharpshooter’s Grip","Full Stock","Marksman’s Stock","Recoil-Compensating Stock","Reflex Sight","Short Scope","Long Scope","Short Night Vision Scope","Long Night Vision Scope","Recon Scope","Bayonet","Compensator","Muzzle Brake","Suppressor"] }],
    ["PiFmAFrgnIJqwkNw", { en: "Pipe Gun", fr: "Arme de fortune", damage: 3, effects: [], fireRate: 2, range: "close", qualities: ["close_quarters","unreliable"], weight: 2, cost: 30, rarity: 0, ammo: [".38 Round","Cartouche .38"], mods: ["Calibrated","Hardened","Automatic","Hair Trigger","Powerful",".45 Receiver","Long Barrel","Ported Barrel","Finned Barrel","Sharpshooter’s Grip","Full Stock","Marksman’s Stock","Recoil-Compensating Stock","Large Magazine","Quick-Eject Magazine","Large Quick-Eject Magazine","Reflex Sight","Short Scope","Long Scope","Short Night Vision Scope","Long Night Vision Scope","Recon Scope","Bayonet","Compensator","Muzzle Brake","Suppressor"] }],
    ["ldIbeCgUhfS2AVHV", { en: "Pipe Revolver", fr: "Revolver de fortune", damage: 4, effects: [], fireRate: 1, range: "close", qualities: ["close_quarters","unreliable"], weight: 4, cost: 25, rarity: 0, ammo: [".45 Round","Cartouche .45"], mods: ["Calibrated","Hardened","Powerful",".38 Receiver",".308 Receiver","Long Barrel","Ported Barrel","Finned Barrel","Sharpshooter’s Grip","Full Stock","Marksman’s Stock","Recoil-Compensating Stock","Reflex Sight","Short Scope","Long Scope","Short Night Vision Scope","Long Night Vision Scope","Recon Scope","Bayonet","Compensator","Muzzle Brake","Suppressor"] }],
    ["iUh6c0EcJfZil9cZ", { en: "Railway Rifle", fr: "Fusil à clous", damage: 10, effects: ["breaking"], fireRate: 0, range: "medium", qualities: ["debilitating","two_handed","unreliable"], weight: 14, cost: 290, rarity: 4, ammo: ["Railway Spike","Clou de rail"], mods: ["Automatic Piston","Long Barrel","Recoil-Compensating Stock","Reflex Sight","Short Scope","Long Scope","Short Night Vision Scope","Long Night Vision Scope","Recon Scope","Bayonet"] }],
    ["3wCThKbCsMgAdrSg", { en: "Syringer", fr: "Pistolet à seringues", damage: 3, effects: [], fireRate: 0, range: "medium", qualities: ["two_handed"], weight: 6, cost: 132, rarity: 2, ammo: ["Syringer Ammo","Seringue"], mods: ["Long Barrel","Marksman’s","Recoil-Compensating","Reflex Sight","Short Scope","Long Scope","Short Night Vision Scope","Long Night Vision Scope","Recon Scope"] }]
  ]);

  assert.equal(catalog.entries.filter(entry => entry.page === 95 && entry.pack === "weapons").length, expected.size);
  const docsByLanguage = {};
  for (const language of ["en", "fr"]) {
    docsByLanguage[language] = new Map(
      (await generatedDocuments(language)).filter(({ pack }) => pack === "weapons").map(({ document }) => [document._id, document])
    );
  }

  for (const [id, spec] of expected) {
    const entry = catalog.entries.find(candidate => candidate.documentId === id && candidate.page === 95);
    assert.ok(entry, id + " missing from source certification");
    assert.equal(entry.status, "verified");
    for (const [language, index] of [["en", 0], ["fr", 1]]) {
      const doc = docsByLanguage[language].get(id);
      assert.ok(doc, language + "/weapons/" + id + " missing");
      const source = doc.flags["fallout2d20-compendium"].source;
      assert.equal(source.page, 95, language + "/" + id + " exact source page");
      assert.equal(source.errataReviewed, true, language + "/" + id + " errata review");
      if (language === "fr") {
        assert.equal(source.translationReviewed, true, id + " FR translation review");
        assert.equal(source.diceSymbolsReviewed, true, id + " FR dice-symbol review");
      }
      assert.equal(doc.name, language === "en" ? spec.en : spec.fr);
      assert.equal(doc.system.damage.rating, spec.damage);
      assert.equal(doc.system.fireRate, spec.fireRate);
      assert.equal(doc.system.range, spec.range);
      assert.equal(doc.system.cost, spec.cost);
      assert.equal(doc.system.rarity, spec.rarity);
      assert.equal(doc.system.ammo, spec.ammo[index]);
      assert.equal(doc.system.weight, language === "en" ? spec.weight : spec.weight / 2);
      const activeEffects = Object.entries(doc.system.damage.damageEffect).filter(([, value]) => value?.value).map(([key]) => key).sort();
      assert.deepEqual(activeEffects, [...spec.effects].sort(), language + "/" + spec.en + " damage effects");
      const activeQualities = Object.entries(doc.system.damage.weaponQuality).filter(([, value]) => value?.value).map(([key]) => key).sort();
      assert.deepEqual(activeQualities, [...spec.qualities].sort(), language + "/" + spec.en + " qualities");
      if (spec.effects.includes("piercing_x")) assert.equal(doc.system.damage.damageEffect.piercing_x.rank, 1);
      const actualModIds = Object.keys(doc.system.mods ?? {}).filter(key => /^[A-Za-z0-9]{16}$/.test(key)).sort();
      const expectedModIds = spec.mods.map(name => {
        assert.ok(modIds[name], "missing test mapping for source mod " + name);
        return modIds[name];
      }).sort();
      assert.deepEqual(actualModIds, expectedModIds, language + "/" + spec.en + " accepted mods");
    }
  }

  const table = catalog.entries.find(entry => entry.page === 95 && entry.sourceName === "Small Guns" && entry.type === "table");
  assert.ok(table);
  assert.equal(table.scope, "out_of_scope");
  assert.equal(table.certification.rowCount, 15);
  const complications = catalog.entries.find(entry => entry.page === 96 && entry.sourceName === "Small Guns Complications");
  assert.ok(complications);
  assert.equal(complications.scope, "out_of_scope");
  assert.deepEqual(complications.certification.results, ["Wasteful", "Click…", "Wear and Tear", "Ricochet"]);
});

test("Core Small Guns pp.95-99 preserve source text and canonicalize errata/localization discrepancies", async () => {
  const en = new Map((await generatedDocuments("en")).filter(({ pack }) => pack === "weapons").map(({ document }) => [document._id, document]));
  const fr = new Map((await generatedDocuments("fr")).filter(({ pack }) => pack === "weapons").map(({ document }) => [document._id, document]));

  assert.match(en.get("ZN2h6VGlcHQKzveB").system.description, /This gas-operated rifle/);
  assert.doesNotMatch(en.get("ZN2h6VGlcHQKzveB").system.description, />his gas-operated rifle/);
  for (const id of ["ZN2h6VGlcHQKzveB","qRc6hN6zHdrsZ0nd","CUlCBsWk1qipT1Ff","obRp9CZJJ6liIl49","PiFmAFrgnIJqwkNw","ldIbeCgUhfS2AVHV"]) {
    assert.match(en.get(id).system.description, /Recoil-Compensating Stock/);
    assert.doesNotMatch(en.get(id).system.description, /RecoilCompensating/);
  }

  assert.match(fr.get("bpbgoX9mNr23pFHR").system.description, /Culasse\s*:\s*haute sensibilité/);
  assert.doesNotMatch(fr.get("bpbgoX9mNr23pFHR").system.description, /optimisée/);
  const smgFr = fr.get("244Kf3MVUhEQQGsw").system.description;
  assert.match(smgFr, /Culasse\s*:\s*renforcée, haute sensibilité, puissante/);
  assert.doesNotMatch(smgFr, /Culasse\\s*:\\s*perforante|Canon\\s*:\\s*canon court/);
  const pipeBoltFr = fr.get("obRp9CZJJ6liIl49").system.description;
  assert.doesNotMatch(pipeBoltFr, /canon raccourci/);
  assert.match(pipeBoltFr, /crosse complète/);
  assert.doesNotMatch(fr.get("3wCThKbCsMgAdrSg").system.description, /canon raccourci/);

  const assault = fr.get("ZN2h6VGlcHQKzveB");
  assert.equal(assault.system.damage.damageEffect.burst.value, 1);
  const doubleBarrel = fr.get("tNyHslvLL11qSlhc");
  assert.equal(doubleBarrel.system.fireRate, 0);

  const assaultEntry = catalog.entries.find(entry => entry.documentId === "ZN2h6VGlcHQKzveB" && entry.page === 95);
  assert.match(assaultEntry.certification.localizationNote, /French p\.95 table prints no damage effect/);
  const doubleEntry = catalog.entries.find(entry => entry.documentId === "tNyHslvLL11qSlhc" && entry.page === 95);
  assert.match(doubleEntry.certification.localizationNote, /French p\.95 table prints Fire Rate 1/);
});


test("Core Small Gun Mods p.100 are source-complete and mechanically exact", async () => {
  const expected = new Map([
    ["wWjvfUfknZOxxJlt", { en:"Hardened", fr:"Culasse renforcée", type:"receiver", prefixes:["Hardened","Renfort"], weight:0, cost:20, perks:["",""], rating:1 }],
    ["41rymX7pm90tz0V8", { en:"Powerful", fr:"Culasse puissante", type:"receiver", prefixes:["Powerful","Puissance"], weight:1, cost:25, perks:["Gun Nut 1","Fana d’armes 1"], rating:2 }],
    ["p0r6B1DzWapL4wU5", { en:"Advanced", fr:"Culasse avancée", type:"receiver", prefixes:["Advanced","Avancé"], weight:2, cost:35, perks:["Gun Nut 2","Fana d’armes 2"], rating:3, fireRate:1 }],
    ["4c34BzfVex4YKgA3", { en:"Calibrated", fr:"Culasse calibrée", type:"receiver", prefixes:["Calibrated","Calibrage"], weight:0, cost:25, perks:["",""], vicious:1 }],
    ["Jyy3vdkQv7YCfvFz", { en:"Automatic", fr:"Culasse automatique", type:"receiver", prefixes:["Auto","Auto"], weight:1, cost:30, perks:["Gun Nut 1","Fana d’armes 1"], rating:-1, fireRate:2, burst:1, inaccurate:1 }],
    ["GROQd2poQkix32N4", { en:"Hair Trigger", fr:"Culasse haute sensibilité", type:"receiver", prefixes:["Hair Trigger","Haute sensibilité"], weight:0, cost:20, perks:["Gun Nut 2","Fana d’armes 2"], fireRate:1 }],
    ["oiW2VvXVdhGgw4oL", { en:".38 Receiver", fr:"Culasse .38", type:"receiver", prefixes:[".38",".38"], weight:3, cost:20, perks:["Gun Nut 4","Fana d’armes 4"], rating:4, override:"override", ammo:[".38 Round","Cartouche .38"] }],
    ["ybNloPq9nZTqGAur", { en:".308 Receiver", fr:"Culasse .308", type:"receiver", prefixes:[".308",".308"], weight:4, cost:40, perks:["Gun Nut 4","Fana d’armes 4"], rating:7, override:"override", ammo:[".308 Round","Cartouche .308"] }],
    ["zpUwoy1BLHyUXuvy", { en:".45 Receiver", fr:"Culasse .45", type:"receiver", prefixes:[".45",".45"], weight:2, cost:19, perks:["Gun Nut 2","Fana d’armes 2"], rating:4, override:"override", fireRate:1, ammo:[".45 Round","Cartouche .45"] }],
    ["XShTCPVSPhRDhMBo", { en:".50 Receiver", fr:"Culasse .50", type:"receiver", prefixes:[".50",".50"], weight:4, cost:30, perks:["Gun Nut 4","Fana d’armes 4"], rating:8, override:"override", vicious:1, ammo:[".50 Round","Calibre .50"] }],
    ["nGgcu0NLeLIbc3Pi", { en:"Automatic Piston", fr:"Culasse automatique à piston", type:"receiver", prefixes:["Automatic","Auto"], weight:2, cost:75, perks:["Gun Nut 2","Fana d’armes 2"], fireRate:2, range:-1 }],
    ["QgUHARJjhqOXBP7u", { en:"Snubnose", fr:"Canon compact", type:"barrel", prefixes:["Snubnosed","Canon compact"], weight:-1, cost:0, perks:["",""], inaccurate:1 }],
    ["aDXdsogK2fIHtBNE", { en:"Bull Barrel", fr:"Canon extra-lourd", type:"barrel", prefixes:["Bull Barrel","Canon extra-lourd"], weight:0, cost:10, perks:["Gun Nut 3","Fana d’armes 3"], reliable:1, unreliable:-1 }],
    ["RyggZv9PwKChzJwB", { en:"Long", fr:"Canon long", type:"barrel", prefixes:["Long","Longueur"], weight:1, cost:20, perks:["Gun Nut 1","Fana d’armes 1"], range:1 }],
    ["Ac56Ox5nVHcJ8PIA", { en:"Ported", fr:"Canon à ouvertures", type:"barrel", prefixes:["Ported","Ouvertures"], weight:1, cost:35, perks:["Gun Nut 4","Fana d’armes 4"], range:1, fireRate:1 }],
    ["yxSF6qdbdO4FYaQb", { en:"Vented", fr:"Canon ventilé", type:"barrel", prefixes:["Vented","Aération"], weight:1, cost:36, perks:["Gun Nut 4","Fana d’armes 4"], range:1, fireRate:1, reliable:1, unreliable:-1 }],
    ["Iec8KCIeHqCk886z", { en:"Sawed-Off", fr:"Canon scié", type:"barrel", prefixes:["Sawed Off","Canon scié"], weight:-2, cost:3, perks:["",""], close_quarters:1, two_handed:-1 }],
    ["iiF3omvvTgVv5LoP", { en:"Shielded Barrel", fr:"Canon protégé", type:"barrel", prefixes:["Shielded","Protection"], weight:0, cost:37, perks:["Gun Nut 3","Fana d’armes 3"], rating:1 }],
    ["aCMBNHf2jilKz2Zg", { en:"Finned", fr:"Canon à ailettes", type:"barrel", prefixes:["Finned","Ailettes"], weight:2, cost:15, perks:["Gun Nut 2","Fana d’armes 2"], rating:1, range:1 }],
    ["bS7ZxJKZA2JAhPV8", { en:"Full Capacitors", fr:"Condensateurs intégraux", type:"capacitor", prefixes:["High Capacity","Grande capacité"], weight:0, cost:37, perks:["Gun Nut 3; Science! 2","Fana d’armes 3; Scientifique 2"], vicious:1 }],
    ["6hh0Evmfv0N8kX81", { en:"Capacitor Boosting Coil", fr:"Bobine de suppression de condensateur", type:"capacitor", prefixes:["Maximum Capacity","Capacité maximale"], weight:2, cost:82, perks:["Gun Nut 4; Science! 3","Fana d’armes 4; Scientifique 3"], rating:1, vicious:1 }],
    ["dh2R5SMlhGBmDuAU", { en:"Large Magazine", fr:"Grand chargeur", type:"magazine", prefixes:["High Capacity","Grande capacité"], weight:1, cost:8, perks:["Gun Nut 2","Fana d’armes 2"], fireRate:1, reliable:-1, unreliable:1 }],
    ["067VeMDTeThvISLa", { en:"Quick-Eject Mag", fr:"Chargeur à éjection rapide", type:"magazine", prefixes:["Quick","Vitesse"], weight:0, cost:8, perks:["Gun Nut 1","Fana d’armes 1"], reliable:1, unreliable:-1 }],
    ["x7XsKzM5Iyisd9lA", { en:"Large Quick-Eject Mag", fr:"Grand chargeur à éjection rapide", type:"magazine", prefixes:["Quick High Capacity","Vitesse & grande capacité"], weight:1, cost:23, perks:["Gun Nut 2","Fana d’armes 2"], fireRate:1 }]
  ]);
  const entries = catalog.entries.filter(entry => entry.page === 100 && entry.pack === "weapon-mods" && entry.status === "verified");
  assert.equal(entries.length, 24);
  assert.deepEqual(new Set(entries.map(entry => entry.documentId)), new Set(expected.keys()));
  for (const [language, index] of [["en",0],["fr",1]]) {
    const docs = new Map((await generatedDocuments(language)).filter(({pack}) => pack === "weapon-mods").map(({document}) => [document._id, document]));
    for (const [id, spec] of expected) {
      const doc = docs.get(id);
      assert.ok(doc, language + "/weapon-mods/" + id + " missing");
      const source = doc.flags["fallout2d20-compendium"].source;
      assert.equal(source.page, 100, language + "/" + id + " source page");
      assert.equal(source.errataReviewed, true, language + "/" + id + " errata review");
      if (language === "fr") assert.equal(source.translationReviewed, true, id + " FR translation review");
      assert.equal(doc.name, index === 0 ? spec.en : spec.fr);
      assert.equal(doc.system.modType, spec.type);
      assert.equal(doc.system.namePrefix, spec.prefixes[index]);
      assert.equal(doc.system.cost, spec.cost);
      assert.equal(doc.system.weight ?? 0, (index === 0 ? spec.weight : spec.weight / 2));
      assert.equal(doc.system.perks ?? "", spec.perks[index]);
      const effects = doc.system.modEffects;
      assert.equal(effects.damage.rating, spec.rating ?? 0, language + "/" + spec.en + " damage rating");
      assert.equal(effects.damage.overrideDamage, spec.override ?? "modify", language + "/" + spec.en + " damage override");
      assert.equal(effects.fireRate, spec.fireRate ?? 0, language + "/" + spec.en + " fire rate");
      assert.equal(effects.range, spec.range ?? 0, language + "/" + spec.en + " range");
      assert.equal(effects.damage.damageEffect?.vicious?.value ?? 0, spec.vicious ?? 0, language + "/" + spec.en + " Vicious");
      assert.equal(effects.damage.damageEffect?.burst?.value ?? 0, spec.burst ?? 0, language + "/" + spec.en + " Burst");
      assert.equal(effects.damage.weaponQuality?.inaccurate?.value ?? 0, spec.inaccurate ?? 0, language + "/" + spec.en + " Inaccurate");
      assert.equal(effects.damage.weaponQuality?.reliable?.value ?? 0, spec.reliable ?? 0, language + "/" + spec.en + " Reliable");
      assert.equal(effects.damage.weaponQuality?.unreliable?.value ?? 0, spec.unreliable ?? 0, language + "/" + spec.en + " Unreliable");
      assert.equal(effects.damage.weaponQuality?.close_quarters?.value ?? 0, spec.close_quarters ?? 0, language + "/" + spec.en + " Close Quarters");
      assert.equal(effects.damage.weaponQuality?.two_handed?.value ?? 0, spec.two_handed ?? 0, language + "/" + spec.en + " Two-Handed delta");
      if (spec.ammo) assert.equal(effects.ammo, spec.ammo[index]);
    }
  }
});

test("Core p.100 Small Gun mod errata, French adaptations and preserved duplicate are explicit", async () => {
  const byLang = {};
  for (const language of ["en","fr"]) byLang[language] = new Map((await generatedDocuments(language)).filter(({pack}) => pack === "weapon-mods").map(({document}) => [document._id,document]));

  const long = byLang.en.get("RyggZv9PwKChzJwB");
  assert.equal(long.system.cost, 20);

  for (const [language, expectedPerks] of [["en","Gun Nut 2"],["fr","Fana d’armes 2"]]) {
    const large = byLang[language].get("dh2R5SMlhGBmDuAU");
    assert.equal(large.system.cost, 8);
    assert.equal(large.system.perks, expectedPerks);
    const recipe = large.flags["fallout2d20-compendium"].weaponModRecipes.find(row => row.key === "smallGuns/magazine/Large Magazine");
    assert.ok(recipe);
    assert.deepEqual(recipe.perks, [language === "en" ? "Gun Nut 1" : "Fana d’armes 1"]);
  }

  for (const [language, expectedPerks] of [["en","Gun Nut 3"],["fr","Fana d’armes 3"]]) {
    const shielded = byLang[language].get("iiF3omvvTgVv5LoP");
    assert.equal(shielded.system.perks, expectedPerks);
    assert.doesNotMatch(shielded.system.perks, /Repair|Réparation/);
  }
  const installation = catalog.entries.find(entry => entry.page === 100 && entry.sourceName === "Small Guns Mods installation rule");
  assert.equal(installation.certification.installSkill, "Repair");

  assert.equal(byLang.fr.get("bS7ZxJKZA2JAhPV8").name, "Condensateurs intégraux");
  for (const language of ["en","fr"]) {
    const primary = byLang[language].get("6hh0Evmfv0N8kX81");
    const duplicate = byLang[language].get("CapaBoostCoil001");
    assert.equal(primary.name, language === "en" ? "Capacitor Boosting Coil" : "Bobine de suppression de condensateur");
    assert.equal(duplicate.name, primary.name);
    assert.equal(primary.system.modEffects.damage.rating, 1);
    assert.equal(primary.system.modEffects.damage.damageEffect.vicious.value, 1);
    assert.equal(duplicate.system.modEffects.damage.rating, 1);
    assert.equal(duplicate.system.modEffects.damage.damageEffect.vicious.value, 1);
  }
  const duplicateEntry = catalog.entries.find(entry => entry.documentId === "CapaBoostCoil001" && entry.page === 100);
  assert.equal(duplicateEntry.status, "duplicate");
  assert.equal(duplicateEntry.certification.duplicateOf, "6hh0Evmfv0N8kX81");
  const primaryEntry = catalog.entries.find(entry => entry.documentId === "6hh0Evmfv0N8kX81" && entry.page === 100);
  assert.match(primaryEntry.certification.localizationNote, /official French Gauss Rifle profile on p\.97/);
  const largeEntry = catalog.entries.find(entry => entry.documentId === "dh2R5SMlhGBmDuAU" && entry.page === 100);
  assert.match(largeEntry.certification.localizationNote, /prints cost -3/);
});


test("Core Energy Weapons pp.101-105 match source table mechanics and corrected mod identity families", async () => {
  const expected = new Map([
    ["fJI5l0xbl26ylvTI",{en:"Institute Laser",fr:"Laser de l’Institut",damage:3,effects:["burst"],types:["energy"],fireRate:3,range:"close",qualities:["close_quarters","inaccurate"],weight:4,cost:50,rarity:2}],
    ["o1QbQfhTLFphrxkB",{en:"Laser Musket",fr:"Mousquet laser",damage:5,effects:["piercing_x"],types:["energy"],fireRate:0,range:"medium",qualities:["two_handed"],weight:13,cost:57,rarity:1}],
    ["NRN7soVtcTwCRqaL",{en:"Laser Gun",fr:"Arme laser",damage:4,effects:["piercing_x"],types:["energy"],fireRate:2,range:"close",qualities:["close_quarters"],weight:4,cost:69,rarity:2}],
    ["M4xWjxuABTWOefg2",{en:"Plasma Gun",fr:"Arme plasma",damage:6,effects:[],types:["energy","physical"],fireRate:1,range:"close",qualities:["close_quarters"],weight:4,cost:123,rarity:3}],
    ["ECuihimhpmedOziD",{en:"Gamma Gun",fr:"Pistolet Gamma",damage:3,effects:["piercing_x","stun"],types:["radiation"],fireRate:1,range:"medium",qualities:["blast","inaccurate"],weight:3,cost:156,rarity:5}]
  ]);
  for (const language of ["en","fr"]) {
    const docs = new Map((await generatedDocuments(language)).filter(({pack})=>pack==="weapons").map(({document})=>[document._id,document]));
    for (const [id,spec] of expected) {
      const doc=docs.get(id); assert.ok(doc);
      assert.equal(doc.flags["fallout2d20-compendium"].source.page,101);
      assert.equal(doc.flags["fallout2d20-compendium"].source.errataReviewed,true);
      if(language==="fr") assert.equal(doc.flags["fallout2d20-compendium"].source.translationReviewed,true);
      assert.equal(doc.name,language==="en"?spec.en:spec.fr);
      assert.equal(doc.system.damage.rating,spec.damage);
      assert.equal(doc.system.fireRate,spec.fireRate);
      assert.equal(doc.system.range,spec.range);
      assert.equal(doc.system.cost,spec.cost);
      assert.equal(doc.system.rarity,spec.rarity);
      assert.equal(doc.system.weight,language==="en"?spec.weight:spec.weight/2);
      assert.deepEqual(Object.entries(doc.system.damage.damageEffect).filter(([,v])=>v?.value).map(([k])=>k).sort(),[...spec.effects].sort());
      assert.deepEqual(Object.entries(doc.system.damage.damageType).filter(([,v])=>v).map(([k])=>k).sort(),[...spec.types].sort());
      assert.deepEqual(Object.entries(doc.system.damage.weaponQuality).filter(([,v])=>v?.value).map(([k])=>k).sort(),[...spec.qualities].sort());
    }
  }
  const small = new Map((await generatedDocuments("en")).filter(({pack})=>pack==="weapons").map(({document})=>[document._id,document]));
  for(const id of ["ZN2h6VGlcHQKzveB","qRc6hN6zHdrsZ0nd","Ee4TwfZnYmCF8CDE","bpbgoX9mNr23pFHR","244Kf3MVUhEQQGsw","CUlCBsWk1qipT1Ff","tNyHslvLL11qSlhc","obRp9CZJJ6liIl49","PiFmAFrgnIJqwkNw","ldIbeCgUhfS2AVHV","iUh6c0EcJfZil9cZ","3wCThKbCsMgAdrSg"]) {
    const mods=small.get(id).system.mods;
    assert.ok(!mods.bRV8rXkptjU6mz9Y, id+" must not use Energy Full Stock");
    assert.ok(!mods.pxflsyihN3fjKgYq, id+" must not use Energy Recoil Compensating Stock");
  }
  assert.ok(small.get("o1QbQfhTLFphrxkB").system.mods.bRV8rXkptjU6mz9Y);
  assert.ok(!small.get("o1QbQfhTLFphrxkB").system.mods["8nHC8z4vEY4yX7bM"]);
  for(const id of ["NRN7soVtcTwCRqaL","M4xWjxuABTWOefg2"]) {
    assert.ok(small.get(id).system.mods.pxflsyihN3fjKgYq);
    assert.ok(!small.get(id).system.mods.H5uajcZl8MICYwfy);
  }
});

test("Core Small Gun continuation and Energy Weapon mods through p.105 have exact source provenance and key mechanics", async () => {
  const expectedPages = new Map([
    ["Noh6VL5rCdM73QuX",101],["zAlW93haMYH8Nwp2",101],["8nHC8z4vEY4yX7bM",101],["Q6VUr8ae7Rf7WOhA",101],["H5uajcZl8MICYwfy",101],
    ["rh3GtWKomZnQpS1H",101],["TxOsscfkniBk2a85",101],["sg1EfJrr3S307XPy",101],["vyesQvmRObpdSNpO",101],["wvsSsznT8GDmdoUa",101],
    ["M5ox31Qif67xBC0m",101],["CYODpO6JvopXWYW7",101],["egIL4wuvntMHhlqr",101],["2aqYiSm1nrIYHgoA",101],["dZh7tFPH917IF3UO",101],
    ["ueMDFFORXGGfNuYb",103],["5eT7jnRBQdbsVQmN",103],["ihEGX2Ame6p1WW82",103],["ztDgncL17xwZiN9p",103],
    ["20d7BlwbNESRwXC9",104],["rdA0goilCAmpEqWx",104],["ozBpt70cekLpM7aH",104],
    ["hzqISjGQIiMI1ZP7",104],["nO1q1OhQfQk9u6su",104],["inrCFrHdrIQrEXf1",104],["X7M3lII0wjlKV7l3",104],
    ["8kEOp1jQBdQkbGXu",104],["MIMSkUavfShkeY8x",104],["QostVNNHMRLN7mhi",104],["wo7U8PuV8h8oa0JY",104],
    ["G1qWroic6MwSgnnp",105],["QOvb0xmQA91HIs8S",105],["jFCFFp1zj7awhWpN",105],["uWW6Yc9ZzjBHnlrz",105],["4sOu5mfXcDlUVlUP",105],
    ["op1VoOjGnziZ2S8V",105],["bRV8rXkptjU6mz9Y",105],["zbzoOm7wspRTM8PJ",105],["pxflsyihN3fjKgYq",105],
    ["qASlWkpHosmgn97l",105],["fyaQkFSXyexqZc0u",105],["U3fJYCYnDsxrr2Or",105],["wUd5pTA33zRH1AWW",105],["nBQq6MTdf40kleS5",105],["dgWySoP4IQ9p2uyO",105],
    ["FJ6lsU2xzeKbDRhq",105],["mzi2nNJcbhMEnWIE",105],["OIr7YaCzlNRUM8Oq",105]
  ]);
  for(const language of ["en","fr"]) {
    const docs=new Map((await generatedDocuments(language)).filter(({pack})=>pack==="weapon-mods").map(({document})=>[document._id,document]));
    for(const [id,page] of expectedPages) {
      const doc=docs.get(id); assert.ok(doc,language+"/"+id+" missing");
      assert.equal(doc.flags["fallout2d20-compendium"].source.page,page,language+"/"+id+" source page");
      assert.equal(doc.flags["fallout2d20-compendium"].source.errataReviewed,true);
      if(language==="fr") assert.equal(doc.flags["fallout2d20-compendium"].source.translationReviewed,true);
    }
  }
  const en=new Map((await generatedDocuments("en")).filter(({pack})=>pack==="weapon-mods").map(({document})=>[document._id,document]));
  assert.equal(en.get("nO1q1OhQfQk9u6su").system.cost,35);
  assert.equal(en.get("op1VoOjGnziZ2S8V").system.cost,10);
  const full=en.get("bRV8rXkptjU6mz9Y");
  assert.equal(full.system.cost,15);
  assert.equal(full.system.modEffects.damage.damageEffect.piercing_x.value,1);
  assert.equal(full.system.modEffects.damage.weaponQuality.two_handed.value,1);
  assert.equal(full.system.modEffects.damage.weaponQuality.close_quarters.value,-1);
  assert.equal(full.system.modEffects.damage.weaponQuality.inaccurate.value,0);
  const repeater=en.get("ozBpt70cekLpM7aH");
  assert.equal(repeater.system.modEffects.damage.rating,0);
  assert.equal(repeater.system.modEffects.fireRate,2);
  assert.equal(repeater.system.modEffects.damage.damageEffect.burst.value,1);
  assert.equal(repeater.system.modEffects.damage.weaponQuality.blast.value,-1);
  const musket=en.get("ztDgncL17xwZiN9p");
  assert.equal(musket.system.modEffects.damage.rating,4);
  assert.equal(musket.system.modEffects.ammoPerShot,6);
  const electric=catalog.entries.find(e=>e.documentId==="rdA0goilCAmpEqWx"&&e.page===104);
  assert.match(electric.certification.localizationNote,/French p\.104 table prints Scientifique 3/);
  const boosted=catalog.entries.find(e=>e.documentId==="nO1q1OhQfQk9u6su"&&e.page===104);
  assert.match(boosted.certification.auditCorrection,/94 to the source value 35/);
});

test("Core Energy Weapon source text pp.102-104 has no known extraction artifacts", async () => {
  const en=new Map((await generatedDocuments("en")).filter(({pack})=>pack==="weapons").map(({document})=>[document._id,document]));
  const musket=en.get("o1QbQfhTLFphrxkB").system.description;
  assert.doesNotMatch(musket,/Lazer Musket Capacitor/);
  const gamma=en.get("ECuihimhpmedOziD").system.description;
  assert.match(gamma,/Electric Signal Carrier Antennae, Signal Repeater/);
  assert.doesNotMatch(gamma,/Antennaem/);
});


test("Core Big Guns pp.106-110 match source mechanics, identities and accepted mods", async () => {
  const expected = new Map([
    ["5gIryFE7WITrmSvY",{en:"Fat Man",fr:"Fat Man",damage:21,effects:["breaking","radioactive","vicious"],type:"physical",fireRate:0,range:"medium",qualities:["blast","inaccurate","two_handed"],weight:31,cost:512,rarity:4,mods:[]}],
    ["75n1EFSJw8xxti6s",{en:"Flamer",fr:"Lance-flammes",damage:3,effects:["burst","persistent","spread"],type:"energy",fireRate:4,range:"close",qualities:["debilitating","inaccurate","two_handed"],weight:16,cost:137,rarity:3,mods:["bhpEF2ZReAacz7NI","cAqagnqyBpSC4wgM","s1TJG5B9uGwUVZJg","vQ2PsttSdFUUDpN2","xhKCtkvzwtowzx9K","zGyzL9NMjix36tgh"]}],
    ["uyx46lw2PXh08m1P",{en:"Gatling Laser",fr:"Laser Gatling",damage:3,effects:["burst","piercing_x"],type:"energy",fireRate:6,range:"medium",qualities:["gatling","inaccurate","two_handed"],weight:19,cost:804,rarity:3,mods:["5TezV1CMuZiRXrKU","AMOEO5RXltJZM8kz","IT15FDgwEelj1LYg","ULmvHBqIQuMGNg1o","VMMDaoy4SbwdLJaX","mcjlBsMoWIiiNoVw","xg5FEwwagDUpedcL"]}],
    ["ccLXYRUueArLgLst",{en:"Heavy Incinerator",fr:"Incinérateur lourd",damage:5,effects:["burst","persistent","spread"],type:"energy",fireRate:3,range:"medium",qualities:["debilitating","two_handed"],weight:20,cost:350,rarity:4,mods:[]}],
    ["CyxEyS2RLOuMLMa1",{en:"Junk Jet",fr:"Junk Jet",damage:6,effects:[],type:"physical",fireRate:1,range:"medium",qualities:["two_handed"],weight:30,cost:285,rarity:3,mods:["5gXCZXtJ4E9Blg97","UtS1TgSmfTHRb5dW","bCJRlQcht0typqhI","cs76CKLMxYAzhNhb","pkYZNmGx0JPKquIC"]}],
    ["5TAOMd3GGpapiM6Q",{en:"Minigun",fr:"Minigun",damage:3,effects:["burst","spread"],type:"physical",fireRate:5,range:"medium",qualities:["gatling","inaccurate","two_handed"],weight:27,cost:382,rarity:2,mods:["6oW2tdrYzdu0klW4","DQwdlCs54hWqQaZa","EFY7drbYyPo1zGOh","RpKbC7YEiI2c8h1N"]}],
    ["s3RYAqoL6U3CVVeb",{en:"Missile Launcher",fr:"Lance-missiles",damage:11,effects:[],type:"physical",fireRate:0,range:"long",qualities:["blast","two_handed"],weight:21,cost:314,rarity:4,mods:["3GI1TF4vKxSitRWJ","DqTXjqNAMlbHJa3V","KkRxsFbFTL89H3Ra","WD7u8h2fsH35rD8t","hPa4NWlG4PcbM3E2","pk8yYPVKXuuatunI","rTLDO0WUB9euiP9T"]}]
  ]);
  assert.equal(catalog.entries.filter(e=>e.page===106&&e.pack==="weapons"&&e.status==="verified").length,7);
  for(const language of ["en","fr"]){
    const docs=new Map((await generatedDocuments(language)).filter(({pack})=>pack==="weapons").map(({document})=>[document._id,document]));
    for(const [id,spec] of expected){
      const d=docs.get(id); assert.ok(d,language+"/"+id+" missing");
      const src=d.flags["fallout2d20-compendium"].source;
      assert.equal(src.page,106,language+"/"+id+" source page");
      assert.equal(src.errataReviewed,true,language+"/"+id+" errata review");
      if(language==="fr"){
        assert.equal(src.translationReviewed,true,id+" FR translation review");
        assert.equal(src.diceSymbolsReviewed,true,id+" FR dice review");
      }
      assert.equal(d.name,language==="en"?spec.en:spec.fr);
      assert.equal(d.system.damage.rating,spec.damage);
      assert.equal(d.system.fireRate,spec.fireRate);
      assert.equal(d.system.range,spec.range);
      assert.equal(d.system.cost,spec.cost);
      assert.equal(d.system.rarity,spec.rarity);
      assert.equal(d.system.weight,language==="en"?spec.weight:spec.weight/2);
      assert.deepEqual(Object.entries(d.system.damage.damageEffect).filter(([,v])=>v?.value).map(([k])=>k).sort(),[...spec.effects].sort());
      assert.deepEqual(Object.entries(d.system.damage.damageType).filter(([,v])=>v).map(([k])=>k),[spec.type]);
      assert.deepEqual(Object.entries(d.system.damage.weaponQuality).filter(([,v])=>v?.value).map(([k])=>k).sort(),[...spec.qualities].sort());
      const mods=Object.keys(d.system.mods??{}).filter(k=>/^[A-Za-z0-9]{16}$/.test(k)).sort();
      assert.deepEqual(mods,[...spec.mods].sort(),language+"/"+spec.en+" accepted mods");
    }
  }
  const duplicate=catalog.entries.find(e=>e.documentId==="q3RjTNEYvfHVBzVk"&&e.page===106);
  assert.equal(duplicate.status,"duplicate");
  assert.equal(duplicate.certification.duplicateOf,"75n1EFSJw8xxti6s");
  const frFlamer=catalog.entries.find(e=>e.documentId==="75n1EFSJw8xxti6s"&&e.page===106);
  assert.match(frFlamer.certification.localizationNote,/prints 8\.5 kg/);
  const table=catalog.entries.find(e=>e.page===106&&e.sourceName==="Big Guns"&&e.type==="table");
  assert.equal(table.certification.rowCount,7);
  const complications=catalog.entries.find(e=>e.page===106&&e.sourceName==="Big Guns Complications");
  assert.deepEqual(complications.certification.results,["Wasteful","Click…","Wear and Tear","Massive Recoil"]);
});

test("Core Big Gun mods pp.107-110 are source-complete with exact provenance, cost, weight and perk requirements", async () => {
  const rows=[
    [107,"cAqagnqyBpSC4wgM","Napalm","Réservoir à napalm",7,59,"Gun Nut 1","Fana d’armes 1",108],
    [107,"bhpEF2ZReAacz7NI","Long Barrel","Canon long",2,28,"Gun Nut 1","Fana d’armes 1",108],
    [107,"vQ2PsttSdFUUDpN2","Large Tank","Grand réservoir",3,28,"Gun Nut 1","Fana d’armes 1",108],
    [107,"zGyzL9NMjix36tgh","Huge Tank","Réservoir géant",6,34,"Gun Nut 2","Fana d’armes 2",108],
    [107,"s1TJG5B9uGwUVZJg","Compression Nozzle","Buse de compression",0,22,"Gun Nut 1","Fana d’armes 1",108],
    [107,"xhKCtkvzwtowzx9K","Vaporization Nozzle","Buse de vaporisation",0,47,"Gun Nut 2","Fana d’armes 2",108],
    [108,"mcjlBsMoWIiiNoVw","Photon Exciter","Stimulateur de photons",1,19,"Science! 3","Scientifique 3",110],
    [108,"xg5FEwwagDUpedcL","Beta Wave Tuner","Amplificateur d’ondes Bêta",1,57,"","",110],
    [108,"ULmvHBqIQuMGNg1o","Boosted Capacitor","Condensateur amélioré",1,94,"","",110],
    [108,"5TezV1CMuZiRXrKU","Photon Agitator","Agitateur de photons",3,132,"Science! 3","Scientifique 3",110],
    [108,"VMMDaoy4SbwdLJaX","Charging Barrels","Canons à chargement",10,357,"Science! 4","Scientifique 4",110],
    [108,"AMOEO5RXltJZM8kz","Reflex Sight","Viseur laser",1,169,"Science! 4","Scientifique 4",110],
    [108,"IT15FDgwEelj1LYg","Beam Focuser","Concentrateur de faisceau",0,22,"","",110],
    [109,"cs76CKLMxYAzhNhb","Long Barrel","Canon long",2,20,"Gun Nut 1","Fana d’armes 1",108],
    [109,"pkYZNmGx0JPKquIC","Recoil Compensating Stock","Crosse à compensateur de recul",2,40,"","",108],
    [109,"5gXCZXtJ4E9Blg97","Gunner Sight","Viseur d’Artilleur",1,5,"","",108],
    [109,"UtS1TgSmfTHRb5dW","Electrification Module","Module d’électrification",1,70,"Gun Nut 2; Science! 1","Fana d’armes 2; Scientifique 1",108],
    [109,"bCJRlQcht0typqhI","Ignition Module","Module de combustion",1,130,"Gun Nut 3; Science! 1","Fana d’armes 3; Scientifique 1",108],
    [109,"RpKbC7YEiI2c8h1N","Accelerated Barrel","Canon grande vitesse",5,45,"Gun Nut 3","Fana d’armes 3",110],
    [109,"6oW2tdrYzdu0klW4","Tri-Barrel","Triple canon",3,75,"Gun Nut 4","Fana d’armes 4",110],
    [109,"DQwdlCs54hWqQaZa","Gunner Sight","Viseur d’Artilleur",1,68,"","",110],
    [109,"EFY7drbYyPo1zGOh","Shredder","Broyeur",5,5,"Gun Nut 2","Fana d’armes 2",110],
    [110,"KkRxsFbFTL89H3Ra","Triple Barrel","Triple canon",16,143,"Gun Nut 2","Fana d’armes 2",109],
    [110,"3GI1TF4vKxSitRWJ","Quad Barrel","Quadruple canon",20,218,"Gun Nut 3","Fana d’armes 3",109],
    [110,"WD7u8h2fsH35rD8t","Scope","Lunette",6,143,"Gun Nut 2","Fana d’armes 2",109],
    [110,"hPa4NWlG4PcbM3E2","Night Vision Scope","Lunette de vision nocturne",6,248,"Gun Nut 4; Science! 1","Fana d’armes 4; Scientifique 1",109],
    [110,"rTLDO0WUB9euiP9T","Targeting Computer","Ordinateur de visée",7,293,"Gun Nut 2; Science! 2","Fana d’armes 2; Scientifique 2",109],
    [110,"pk8yYPVKXuuatunI","Bayonet","Baïonnette",1,30,"","",109],
    [110,"DqTXjqNAMlbHJa3V","Stabilizer","Stabilisateur",2,60,"Gun Nut 2","Fana d’armes 2",109]
  ];
  assert.equal(catalog.entries.filter(e=>e.pack==="weapon-mods"&&e.page>=107&&e.page<=110&&e.status==="verified").length,rows.length);
  const byLang={};
  for(const language of ["en","fr"]) byLang[language]=new Map((await generatedDocuments(language)).filter(({pack})=>pack==="weapon-mods").map(({document})=>[document._id,document]));
  for(const [page,id,enName,frName,weight,cost,enPerks,frPerks,frPage] of rows){
    const entry=catalog.entries.find(e=>e.documentId===id&&e.page===page);
    assert.ok(entry,id+" catalog entry");
    assert.deepEqual(entry.sourcePages.fr,[frPage],id+" FR source coordinate");
    for(const [language,name,perks,mult] of [["en",enName,enPerks,1],["fr",frName,frPerks,0.5]]){
      const d=byLang[language].get(id); assert.ok(d,language+"/"+id+" missing");
      const src=d.flags["fallout2d20-compendium"].source;
      assert.equal(src.page,page,language+"/"+id+" canonical source page");
      assert.equal(src.errataReviewed,true,language+"/"+id+" errata review");
      if(language==="fr") assert.equal(src.translationReviewed,true,id+" FR translation review");
      assert.equal(d.name,name);
      assert.equal(d.system.cost,cost);
      assert.equal(d.system.weight??0,weight*mult);
      assert.equal(d.system.perks??"",perks);
      assert.equal(d.system.weaponType,"bigGuns",language+"/"+id+" weapon family");
    }
  }
});

test("Core Big Gun errata and repaired Gatling variants retain source mechanics", async () => {
  const enMods=new Map((await generatedDocuments("en")).filter(({pack})=>pack==="weapon-mods").map(({document})=>[document._id,document]));
  for(const [id,perk] of [["cAqagnqyBpSC4wgM","Gun Nut 1"],["bhpEF2ZReAacz7NI","Gun Nut 1"],["vQ2PsttSdFUUDpN2","Gun Nut 1"],["s1TJG5B9uGwUVZJg","Gun Nut 1"],["zGyzL9NMjix36tgh","Gun Nut 2"],["xhKCtkvzwtowzx9K","Gun Nut 2"]]) {
    assert.equal(enMods.get(id).system.perks,perk,id+" p.107 errata perk");
  }
  const boosted=enMods.get("ULmvHBqIQuMGNg1o");
  assert.equal(boosted.system.modEffects.damage.rating,1);
  assert.equal(boosted.system.modEffects.fireRate,0);
  const agitator=enMods.get("5TezV1CMuZiRXrKU");
  assert.equal(agitator.system.cost,132);
  assert.equal(agitator.system.modEffects.damage.rating,1);
  assert.equal(agitator.system.modEffects.damage.damageEffect.vicious.value,1);
  const reflex=enMods.get("AMOEO5RXltJZM8kz");
  assert.equal(reflex.system.cost,169);
  assert.equal(reflex.system.modEffects.damage.weaponQuality.inaccurate.value,-1);
  const focuser=enMods.get("IT15FDgwEelj1LYg");
  assert.equal(focuser.system.cost,22);
  assert.equal(focuser.system.modEffects.damage.damageEffect.piercing_x.value,1);
  assert.equal(focuser.system.modEffects.range,1);
  const missileScope=enMods.get("WD7u8h2fsH35rD8t");
  assert.equal(missileScope.system.weaponType,"bigGuns");
  assert.equal(missileScope.system.modEffects.damage.weaponQuality.accurate.value,1);
  const enWeapons=new Map((await generatedDocuments("en")).filter(({pack})=>pack==="weapons").map(({document})=>[document._id,document]));
  const flamer=enWeapons.get("75n1EFSJw8xxti6s");
  assert.doesNotMatch(flamer.system.description,/Arm Attachment:/);
  assert.match(flamer.system.description,/A flamethrower, or flamer/);
  const duplicate=enWeapons.get("q3RjTNEYvfHVBzVk");
  assert.equal(duplicate.system.range,"close");
  assert.deepEqual(
    Object.keys(duplicate.system.mods??{}).filter(k=>/^[A-Za-z0-9]{16}$/.test(k)).sort(),
    Object.keys(flamer.system.mods??{}).filter(k=>/^[A-Za-z0-9]{16}$/.test(k)).sort()
  );
});

test("Core Melee Weapons pp.111-118 are source-complete and retain source corrections", async () => {
  const weapons = catalog.entries.filter(e => e.page === 111 && e.pack === "weapons" && e.status === "verified");
  const mods = catalog.entries.filter(e => e.pack === "weapon-mods" && e.page >= 112 && e.page <= 118 && e.status === "verified");
  assert.equal(weapons.length, 26);
  assert.equal(mods.length, 51);
  const byLanguage = {};
  for (const language of ["en", "fr"]) {
    byLanguage[language] = new Map((await generatedDocuments(language)).map(({pack, document}) => [`${pack}/${document._id}`, document]));
    for (const entry of [...weapons, ...mods]) {
      const document = byLanguage[language].get(`${entry.pack}/${entry.documentId}`);
      assert.ok(document, `${language}/${entry.documentId} missing`);
      assert.equal(document.flags["fallout2d20-compendium"].source.errataReviewed, true, `${language}/${entry.documentId} errata review`);
      assert.equal(document.flags["fallout2d20-compendium"].source.page, entry.page, `${language}/${entry.documentId} provenance`);
    }
  }
  const aluminum = byLanguage.en.get("weapons/mmmxQfbZxwNWA45f");
  assert.equal(aluminum.system.damage.rating, 5);
  assert.equal(aluminum.system.weight, 2);
  assert.equal(aluminum.system.cost, 32);
  assert.equal(byLanguage.fr.get("weapons/mmmxQfbZxwNWA45f").system.weight, 1);
  const sledgehammer = byLanguage.en.get("weapons/yrLghAxk6uynbFaq");
  assert.equal(sledgehammer.system.damage.weaponQuality.two_handed.value, 1);
  const switchbladeSerrated = byLanguage.en.get("weapon-mods/uUiwz6PvOMdkU6yE");
  assert.equal(switchbladeSerrated.system.cost, 10);
  assert.equal(switchbladeSerrated.system.perks, "Blacksmith 1");
  const ripperCurved = byLanguage.en.get("weapon-mods/TQN26Hjy3pxpkrzT");
  assert.equal(ripperCurved.system.weaponType, "meleeWeapons");
  assert.equal(ripperCurved.system.weight, 1);
  const batonElectrified = byLanguage.en.get("weapon-mods/t2DeDQRZXpZyN9ux");
  assert.equal(batonElectrified.system.cost, 15);
  assert.equal(batonElectrified.system.perks, "Blacksmith 2; Science! 1");
  assert.equal(byLanguage.fr.get("weapon-mods/t2DeDQRZXpZyN9ux").system.perks, "Forgeron 2; Scientifique 1");
  assert.equal(catalog.entries.some(e => ["LANB6wzhO8pIEsxK", "MvrQv0wg5FE6j7TR"].includes(e.documentId) && e.page <= 118), false);
});

test("Core Power Fist mods, Throwing Weapons and Explosives pp.119-121 are source-complete", async () => {
  const powerFistMods = catalog.entries.filter(e => e.page === 119 && e.pack === "weapon-mods" && e.status === "verified");
  const throwingWeapons = catalog.entries.filter(e => e.page === 119 && e.pack === "weapons" && e.status === "verified");
  const explosives = catalog.entries.filter(e => e.page === 120 && e.pack === "weapons" && e.status === "verified");
  assert.equal(powerFistMods.length, 2);
  assert.equal(throwingWeapons.length, 3);
  assert.equal(explosives.length, 11);

  const byLanguage = {};
  for (const language of ["en", "fr"]) {
    byLanguage[language] = new Map((await generatedDocuments(language)).map(({pack, document}) => [`${pack}/${document._id}`, document]));
    for (const entry of [...powerFistMods, ...throwingWeapons, ...explosives]) {
      const document = byLanguage[language].get(`${entry.pack}/${entry.documentId}`);
      assert.ok(document, `${language}/${entry.documentId} missing`);
      assert.equal(document.flags["fallout2d20-compendium"].source.errataReviewed, true, `${language}/${entry.documentId} errata review`);
      assert.equal(document.flags["fallout2d20-compendium"].source.page, entry.page, `${language}/${entry.documentId} provenance`);
    }
  }

  const puncturing = byLanguage.en.get("weapon-mods/LANB6wzhO8pIEsxK");
  assert.equal(puncturing.system.cost, 45);
  assert.equal(puncturing.system.weight, 1);
  assert.equal(puncturing.system.perks, "Blacksmith 2");
  assert.equal(puncturing.system.modEffects.damage.rating, 2);
  assert.equal(puncturing.system.modEffects.damage.damageEffect.piercing_x.value, 1);
  const powerHeating = byLanguage.en.get("weapon-mods/MvrQv0wg5FE6j7TR");
  assert.equal(powerHeating.system.cost, 100);
  assert.equal(powerHeating.system.perks, "Blacksmith 3");
  assert.equal(powerHeating.system.modEffects.damage.rating, 2);
  assert.equal(powerHeating.system.modEffects.damage.damageType.energy, true);
  assert.equal(powerHeating.flags["fallout2d20-compendium"].weaponModRecipes[0].group, "power-fist");
  const superSledgeHeating = byLanguage.en.get("weapon-mods/hVD46UqAqiNB4f57");
  assert.equal(superSledgeHeating.system.cost, 180);
  assert.equal(superSledgeHeating.system.perks, "Blacksmith 2");
  assert.equal(superSledgeHeating.flags["fallout2d20-compendium"].weaponModRecipes[0].group, "super-sledge");
  assert.equal(byLanguage.fr.get("weapon-mods/MvrQv0wg5FE6j7TR").system.perks, "Forgeron 3");

  const expected = new Map([
    ["61inErKDohHmHoAV", [3, 0.5, 10, 1]], ["pYMfuytsOCR3mxW8", [4, 0.5, 15, 2]],
    ["iodz4xm3QDXNuhxf", [4, 4, 10, 1]], ["vXTMQj76ShuwQXkd", [5, 1, 40, 1]],
    ["3CZ7jbXV7I5z757E", [6, 0.5, 50, 2]], ["NXjKSH1aRmZkq5PJ", [4, 1, 20, 1]],
    ["As1o8LGO3CIaY2mD", [9, 1, 100, 4]], ["tedK8NNLvjIQf4wm", [9, 0.5, 135, 3]],
    ["LCUp8GGg6nyJ8wa9", [6, 0.5, 100, 3]], ["4YCB81rMWJSZcgRI", [6, 1, 75, 2]],
    ["Ai4EeSDZl48zoJoL", [6, 1, 50, 2]], ["9wxUVAnr3YsD3Uol", [9, 1, 100, 4]],
    ["AjqE0fT244w92onq", [9, 0.5, 135, 3]], ["eILamwepNIAhOY0J", [6, 0.5, 100, 3]]
  ]);
  for (const [id, [damage, weight, cost, rarity]] of expected) {
    const en = byLanguage.en.get(`weapons/${id}`);
    const fr = byLanguage.fr.get(`weapons/${id}`);
    assert.equal(en.system.damage.rating, damage, id);
    assert.equal(en.system.weight, weight, id);
    assert.equal(fr.system.weight, weight / 2, `${id} FR weight`);
    assert.equal(en.system.cost, cost, id);
    assert.equal(en.system.rarity, rarity, id);
  }
  for (const id of ["9wxUVAnr3YsD3Uol", "AjqE0fT244w92onq", "eILamwepNIAhOY0J"]) {
    const weapon = byLanguage.en.get(`weapons/${id}`);
    assert.equal(weapon.system.damage.weaponQuality.mine.value, 1, `${id} Mine errata`);
    assert.equal(weapon.system.damage.weaponQuality.thrown.value, 0, `${id} no Thrown errata`);
  }
  assert.equal(byLanguage.en.get("weapons/As1o8LGO3CIaY2mD").system.damage.damageEffect.breaking.value, 1);
  assert.equal(byLanguage.en.get("weapons/9wxUVAnr3YsD3Uol").system.damage.damageEffect.breaking.value, 1);
  const pulseMine = byLanguage.en.get("weapons/eILamwepNIAhOY0J");
  assert.equal(pulseMine.system.damage.rating, 6);
  assert.equal(pulseMine.system.damage.damageEffect.stun.value, 1);
  assert.equal(pulseMine.system.cost, 100);
});

test("Core Apparel overview and Dog Armor pp.122-123 are source-complete", async () => {
  const dogArmor = catalog.entries.filter(e => e.page === 123 && e.pack === "apparel" && e.status === "verified");
  assert.equal(dogArmor.length, 4);
  const expected = new Map([
    ["C5I8RYOlLIq7prve", { resistance: [2, 1, 0], weight: 1, cost: 7, rarity: 2, head: true }],
    ["OXTYwe4rWp0n9xVC", { resistance: [1, 1, 0], weight: 1, cost: 10, rarity: 1 }],
    ["2RZM0aGaGT2bYY0l", { resistance: [2, 2, 0], weight: 2, cost: 15, rarity: 2 }],
    ["uK2iQe7F74HQwsNs", { resistance: [3, 3, 0], weight: 2, cost: 20, rarity: 3 }]
  ]);
  for (const language of ["en", "fr"]) {
    const records = new Map((await generatedDocuments(language))
      .filter(({pack}) => pack === "apparel")
      .map(({document}) => [document._id, document]));
    for (const entry of dogArmor) {
      const document = records.get(entry.documentId);
      const spec = expected.get(entry.documentId);
      assert.ok(document, `${language}/${entry.documentId} missing`);
      assert.equal(document.flags["fallout2d20-compendium"].source.page, 123);
      assert.equal(document.flags["fallout2d20-compendium"].source.errataReviewed, true);
      assert.deepEqual(
        [document.system.resistance.physical, document.system.resistance.energy, document.system.resistance.radiation],
        spec.resistance
      );
      assert.equal(document.system.weight, language === "en" ? spec.weight : spec.weight / 2);
      assert.equal(document.system.cost, spec.cost);
      assert.equal(document.system.rarity, spec.rarity);
      assert.match(document.system.description, language === "en" ? /may obtain the following types of armor/ : /peut obtenir les types d’armures suivants/);
      if (spec.head) {
        assert.equal(document.system.location.head, true);
        assert.equal(document.system.location.torso, false);
      } else {
        assert.equal(document.system.location.head, false);
        assert.equal(document.system.location.torso, true);
        // A quadruped's source “Legs” coverage maps to both front and rear limb slots.
        assert.equal(document.system.location.armL, true);
        assert.equal(document.system.location.armR, true);
        assert.equal(document.system.location.legL, true);
        assert.equal(document.system.location.legR, true);
      }
    }
  }
  const overview = catalog.entries.filter(e => e.scope === "out_of_scope" && e.page >= 122 && e.page <= 123);
  assert.equal(overview.length, 4);
});


test("Core Clothing and Outfits pp.124-129 are source-complete", async () => {
  const profiles = {
  "DEpvfGFbc6KIebfH": {
    "en": "Brotherhood of Steel Uniform",
    "fr": "Uniforme de la Confrérie de l’Acier",
    "type": "clothing",
    "res": [
      1,
      1,
      1
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 2,
    "cost": 20,
    "rarity": 2,
    "mods": []
  },
  "mGCVgHtv7btlXFcj": {
    "en": "Casual Clothing",
    "fr": "Vêtements décontractés",
    "type": "clothing",
    "res": [
      0,
      0,
      0
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 2,
    "cost": 20,
    "rarity": 1,
    "mods": [
      "R0OekXuLrtHf0j8f",
      "8JID23VwOdXqwESb",
      "kRuMVjqK0tr5aZDY",
      "fGvLq6Ku80a5cTSg",
      "ew9m8xT2GbnWCHeu"
    ]
  },
  "Z2wwI1RUjgV9UuzJ": {
    "en": "Harness",
    "fr": "Harnais",
    "type": "clothing",
    "res": [
      0,
      0,
      0
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 1,
    "cost": 5,
    "rarity": 0,
    "mods": []
  },
  "j3Q6RHDSuhadGvdm": {
    "en": "Military Fatigues",
    "fr": "Treillis militaire",
    "type": "clothing",
    "res": [
      0,
      1,
      0
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 3,
    "cost": 12,
    "rarity": 1,
    "mods": [
      "R0OekXuLrtHf0j8f",
      "8JID23VwOdXqwESb",
      "kRuMVjqK0tr5aZDY",
      "fGvLq6Ku80a5cTSg",
      "ew9m8xT2GbnWCHeu"
    ]
  },
  "qwD45ugL9z0szLZQ": {
    "en": "Road Leathers",
    "fr": "Vêtements de cuir",
    "type": "clothing",
    "res": [
      1,
      1,
      0
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 1,
    "cost": 5,
    "rarity": 1,
    "mods": []
  },
  "DxWJxT0MuxkbCofe": {
    "en": "Tough Clothing",
    "fr": "Vêtements résistants",
    "type": "clothing",
    "res": [
      1,
      1,
      0
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 3,
    "cost": 20,
    "rarity": 1,
    "mods": []
  },
  "aOmUGU0KhxIusQzy": {
    "en": "Vault Jumpsuit",
    "fr": "Combinaison d’Abri",
    "type": "clothing",
    "res": [
      0,
      1,
      2
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 1,
    "cost": 20,
    "rarity": 2,
    "mods": [
      "p0DwgxYf9LqKdtD2",
      "eJRm4a5fGv7fIWgn",
      "6HktMjmw1GkHhudw",
      "gVTTVLDe6xQMbv5K",
      "VMzxtew6VJQCzIIk"
    ]
  },
  "jnjGlz8wOI3b2brm": {
    "en": "Brotherhood of Steel Fatigues",
    "fr": "Treillis de la Confrérie de l’Acier",
    "type": "outfit",
    "res": [
      2,
      2,
      2
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 4,
    "cost": 20,
    "rarity": 3,
    "mods": []
  },
  "lVYblrMAgEfHnWTR": {
    "en": "Brotherhood Scribe’s Armor",
    "fr": "Armure de scribe de terrain de la Confrérie",
    "type": "outfit",
    "res": [
      1,
      2,
      2
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 4,
    "cost": 20,
    "rarity": 2,
    "mods": []
  },
  "vWq7tmY6iChl2g2t": {
    "en": "Cage Armor",
    "fr": "Armure cage",
    "type": "outfit",
    "res": [
      3,
      4,
      0
    ],
    "loc": [
      "head",
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 33,
    "cost": 110,
    "rarity": 3,
    "mods": []
  },
  "QX9YgFGANsHkpTQd": {
    "en": "Drifter Outfit",
    "fr": "Tenue de nomade",
    "type": "outfit",
    "res": [
      1,
      2,
      0
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 10,
    "cost": 35,
    "rarity": 1,
    "mods": []
  },
  "XzEQFrZXE4OPNs3g": {
    "en": "Engineer’s Armor",
    "fr": "Armure d’ingénieur",
    "type": "outfit",
    "res": [
      1,
      1,
      0
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 2,
    "cost": 15,
    "rarity": 1,
    "mods": []
  },
  "RWHypmbHATEbfGdU": {
    "en": "Formal Clothing",
    "fr": "Vêtements élégants",
    "type": "outfit",
    "res": [
      0,
      0,
      0
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 2,
    "cost": 30,
    "rarity": 2,
    "mods": [
      "R0OekXuLrtHf0j8f",
      "8JID23VwOdXqwESb",
      "kRuMVjqK0tr5aZDY",
      "fGvLq6Ku80a5cTSg",
      "ew9m8xT2GbnWCHeu"
    ]
  },
  "Mfgi1OgjnrIm0BFV": {
    "en": "Hazmat Suit",
    "fr": "Combinaison étanche",
    "type": "outfit",
    "res": [
      0,
      0,
      0
    ],
    "loc": [
      "head",
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 5,
    "cost": 85,
    "rarity": 3,
    "mods": []
  },
  "sHVONLW2lTNyu8Mq": {
    "en": "Heavy Coat",
    "fr": "Manteau lourd",
    "type": "outfit",
    "res": [
      1,
      1,
      1
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 2,
    "cost": 20,
    "rarity": 1,
    "mods": [
      "R0OekXuLrtHf0j8f",
      "8JID23VwOdXqwESb",
      "kRuMVjqK0tr5aZDY",
      "fGvLq6Ku80a5cTSg",
      "ew9m8xT2GbnWCHeu"
    ]
  },
  "LhR6Kj541PHxZ7Bo": {
    "en": "Hides",
    "fr": "Peaux",
    "type": "outfit",
    "res": [
      1,
      0,
      0
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 4,
    "cost": 13,
    "rarity": 0,
    "mods": []
  },
  "cdwX7EVolnIWRaZi": {
    "en": "Lab Coat",
    "fr": "Blouse",
    "type": "outfit",
    "res": [
      0,
      0,
      0
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 2,
    "cost": 10,
    "rarity": 1,
    "mods": [
      "R0OekXuLrtHf0j8f",
      "8JID23VwOdXqwESb",
      "kRuMVjqK0tr5aZDY",
      "fGvLq6Ku80a5cTSg",
      "ew9m8xT2GbnWCHeu"
    ]
  },
  "kRun2GR8nZLirYHD": {
    "en": "Spike Armor",
    "fr": "Armure à pointes",
    "type": "outfit",
    "res": [
      2,
      2,
      0
    ],
    "loc": [
      "head",
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 17,
    "cost": 65,
    "rarity": 2,
    "mods": []
  },
  "3UDbwGcAdrC2eEvd": {
    "en": "Utility Coveralls",
    "fr": "Bleu de travail",
    "type": "outfit",
    "res": [
      2,
      0,
      0
    ],
    "loc": [
      "armL",
      "armR",
      "legL",
      "legR",
      "torso"
    ],
    "weight": 2,
    "cost": 12,
    "rarity": 1,
    "mods": []
  },
  "Luele6U32M5YDKlj": {
    "en": "Army Helmet",
    "fr": "Casque militaire",
    "type": "headgear",
    "res": [
      2,
      0,
      0
    ],
    "loc": [
      "head"
    ],
    "weight": 3,
    "cost": 20,
    "rarity": 1,
    "mods": []
  },
  "vinehrp26vkj6pQj": {
    "en": "Brotherhood of Steel Hood",
    "fr": "Cagoule de la Confrérie de l’Acier",
    "type": "headgear",
    "res": [
      0,
      1,
      0
    ],
    "loc": [
      "head"
    ],
    "weight": null,
    "cost": 12,
    "rarity": 2,
    "mods": []
  },
  "1t9ZfJxVs14n5wTX": {
    "en": "Brotherhood Scribe’s Hat",
    "fr": "Chapeau de scribe de terrain de la Confrérie",
    "type": "headgear",
    "res": [
      0,
      2,
      0
    ],
    "loc": [
      "head"
    ],
    "weight": null,
    "cost": 8,
    "rarity": 2,
    "mods": []
  },
  "hKGbIZhOnncmk7UT": {
    "en": "Casual Hat",
    "fr": "Chapeau décontracté",
    "type": "headgear",
    "res": [
      0,
      0,
      0
    ],
    "loc": [
      "head"
    ],
    "weight": null,
    "cost": 15,
    "rarity": 1,
    "mods": []
  },
  "WeHTP6Gw6Sr6HN8N": {
    "en": "Formal Hat",
    "fr": "Chapeau élégant",
    "type": "headgear",
    "res": [
      0,
      0,
      0
    ],
    "loc": [
      "head"
    ],
    "weight": null,
    "cost": 15,
    "rarity": 2,
    "mods": [
      "R0OekXuLrtHf0j8f",
      "8JID23VwOdXqwESb",
      "kRuMVjqK0tr5aZDY",
      "fGvLq6Ku80a5cTSg",
      "ew9m8xT2GbnWCHeu"
    ]
  },
  "YJBboQPnSQFg8kgp": {
    "en": "Gas Mask",
    "fr": "Masque à gaz",
    "type": "headgear",
    "res": [
      1,
      0,
      3
    ],
    "loc": [
      "head"
    ],
    "weight": 3,
    "cost": 10,
    "rarity": 2,
    "mods": []
  },
  "BNhFyx4TZM8NoOoN": {
    "en": "Hard Hat",
    "fr": "Casque de chantier",
    "type": "headgear",
    "res": [
      2,
      0,
      0
    ],
    "loc": [
      "head"
    ],
    "weight": null,
    "cost": 15,
    "rarity": 1,
    "mods": []
  },
  "Dk9UjvjZexa8J0U8": {
    "en": "Hood or Cowl",
    "fr": "Cagoule ou capuche",
    "type": "headgear",
    "res": [
      1,
      0,
      1
    ],
    "loc": [
      "head"
    ],
    "weight": 2,
    "cost": 5,
    "rarity": 1,
    "mods": []
  },
  "TiGee8uaRs4twpOK": {
    "en": "Sack Hood",
    "fr": "Sac cagoule",
    "type": "headgear",
    "res": [
      0,
      0,
      2
    ],
    "loc": [
      "head"
    ],
    "weight": 1,
    "cost": 5,
    "rarity": 0,
    "mods": []
  },
  "xEiw9lX3nYE1uoT0": {
    "en": "Welder’s Visor",
    "fr": "Masque de soudure",
    "type": "headgear",
    "res": [
      2,
      2,
      0
    ],
    "loc": [
      "head"
    ],
    "weight": 4,
    "cost": 20,
    "rarity": 2,
    "mods": []
  }
};
  const mods = {
  "R0OekXuLrtHf0j8f": {
    "page": 126,
    "en": "Ballistic Weave",
    "fr": "Tissu balistique",
    "res": [
      2,
      2,
      0
    ],
    "weight": 0,
    "cost": 20,
    "perks": ""
  },
  "8JID23VwOdXqwESb": {
    "page": 126,
    "en": "Ballistic Weave Mk II",
    "fr": "Tissu balistique Mk II",
    "res": [
      3,
      3,
      0
    ],
    "weight": 0,
    "cost": 30,
    "perks": "Armorer 1"
  },
  "kRuMVjqK0tr5aZDY": {
    "page": 126,
    "en": "Ballistic Weave Mk III",
    "fr": "Tissu balistique Mk III",
    "res": [
      4,
      4,
      0
    ],
    "weight": 0,
    "cost": 40,
    "perks": "Armorer 2"
  },
  "fGvLq6Ku80a5cTSg": {
    "page": 126,
    "en": "Ballistic Weave Mk IV",
    "fr": "Tissu balistique Mk IV",
    "res": [
      5,
      5,
      0
    ],
    "weight": 0,
    "cost": 50,
    "perks": "Armorer 3"
  },
  "ew9m8xT2GbnWCHeu": {
    "page": 126,
    "en": "Ballistic Weave Mk V",
    "fr": "Tissu balistique Mk V",
    "res": [
      6,
      6,
      0
    ],
    "weight": 0,
    "cost": 60,
    "perks": "Armorer 4"
  },
  "p0DwgxYf9LqKdtD2": {
    "page": 129,
    "en": "Insulated Lining",
    "fr": "Revêtement isolant",
    "res": [
      0,
      1,
      0
    ],
    "weight": 0,
    "cost": 10,
    "perks": ""
  },
  "eJRm4a5fGv7fIWgn": {
    "page": 129,
    "en": "Treated Lining",
    "fr": "Revêtement traité",
    "res": [
      0,
      1,
      1
    ],
    "weight": 1,
    "cost": 20,
    "perks": "Armorer 2"
  },
  "6HktMjmw1GkHhudw": {
    "page": 129,
    "en": "Resistant Lining",
    "fr": "Revêtement résistant",
    "res": [
      0,
      2,
      1
    ],
    "weight": 1,
    "cost": 30,
    "perks": "Armorer 3"
  },
  "gVTTVLDe6xQMbv5K": {
    "page": 129,
    "en": "Protective Lining",
    "fr": "Revêtement protecteur",
    "res": [
      0,
      2,
      2
    ],
    "weight": 1,
    "cost": 40,
    "perks": "Armorer 4; Science! 2"
  },
  "VMzxtew6VJQCzIIk": {
    "page": 129,
    "en": "Shielded Lining",
    "fr": "Revêtement blindé",
    "res": [
      0,
      3,
      3
    ],
    "weight": 1,
    "cost": 50,
    "perks": "Armorer 4; Science! 4"
  }
};
  const officialFrDescriptions = {
  "kRun2GR8nZLirYHD": "<p>Plusieurs couches de cuir avec des chiffons, des plaques de métal, des chaînes et des barres cousus sur le cuir ou soudés ensemble. Les extrémités d’une grande partie des barres dépassent de l’armure, créant l’apparence d’une tenue hérissée de pointes qui aide à repousser les attaques de corps à corps, tandis que les couches de plaques de métal et de rembourrage de cuir protègent contre les dangers et attaques divers. Une capuche et un casque ajoutent à la protection fournie.</p>",
  "vWq7tmY6iChl2g2t": "<p>Des vêtements en cuir épais, renforcés avec des chiffons, des plaques de métal, des chaînes et des barres. Comme pour l’armure à pointes (voir page 125), la ferronnerie de cette tenue crée une cage grossière de barres d’armature autour de la tête et du torse, qui fournit une protection supplémentaire. L’armure cage est normalement portée avec une cagoule et un casque.</p>",
  "XzEQFrZXE4OPNs3g": "<p>Portée par les ingénieurs de la Confrérie de l’Acier et par ceux qui adoptent une occupation similaire, cette tenue est composée d’une veste de protection, de gantelets de toile ou de cuir épais, d’un gilet et d’une ceinture sur lesquels sont placées des dizaines de petites poches. La tenue protège contre les risques inhérents à l’utilisation d’outils électriques dans un atelier, mais n’est pas vraiment une armure adaptée à un champ de bataille.</p>",
  "lVYblrMAgEfHnWTR": "<p>Les scribes de la Confrérie de l’Acier doivent parfois s’aventurer sur le terrain pour effectuer des observations ou faire des recherches in situ. Cette tenue ne fournit qu’une protection limitée, mais suffit à défendre celui qui la porte contre le danger assez longtemps pour qu’il puisse battre en retraite et demander de l’aide à quelqu’un de mieux équipé.</p>",
  "3UDbwGcAdrC2eEvd": "<p>Une tenue polyvalente appréciée des mécaniciens et autres bricoleurs ; le bleu de travail est conçu pour les protéger des risques du travail dur et salissant sur de la machinerie. Il est accompagné d’épais gants pour protéger les mains et d’une ceinture de mécano à laquelle accrocher divers outils et autres objets utiles.</p><p><strong>Spécial :</strong> le bleu de travail augmente de +5 la charge maximale de celui qui le porte.</p>",
  "cdwX7EVolnIWRaZi": "<p>Une blouse blanche (mais probablement tachée ou sale) censée être portée dans un laboratoire. Inclut normalement beaucoup de poches utiles et une montre ou un capteur juste en dessous du revers gauche, là où le porteur peut aisément jeter un œil sans devoir le prendre dans sa main, idéal pendant un travail scientifique délicat.</p><p><strong>Spécial :</strong> grâce à la praticité du modèle, mais aussi au fait que vous vous sentez tout simplement plus intelligent quand vous en enfilez une, porter une blouse vous permet de relancer une fois par scène un seul d20 sur un test de compétence basé sur l’INT que vous effectuez.</p><p>Les blouses peuvent être renforcées avec du tissu balistique (voir encadré correspondant).</p>",
  "vinehrp26vkj6pQj": "<p>Cette cagoule étroitement ajustée est le couvre-chef assorti à l’uniforme de la Confrérie de l’Acier. Elle fut développée avant la Grande Guerre pour ceux qui portaient une armure assistée. Elle est conçue pour être branchée sur le casque d’une armure assistée, fournissant une meilleure interface avec les systèmes de l’armure. Elle contient aussi un écouteur et un micro pour la radio interne de l’armure.</p>",
  "Dk9UjvjZexa8J0U8": "<p>Un tissu ou un morceau de cuir qui couvre la tête et le cou. Fournit une légère protection contre les éléments et facile à combiner avec un masque ou un mouchoir pour couvrir la bouche et le nez afin de ne pas respirer la poussière et les vapeurs toxiques. Utile dans les Terres désolées si vous vous retrouvez à l’extérieur sans protection plus adéquate.</p>",
  "BNhFyx4TZM8NoOoN": "<p>Un casque léger en métal ou en plastique conçu pour protéger la tête contre les chocs et les collisions sur un lieu de travail industriel avec beaucoup d’activité ou sur un chantier de construction. Il n’est pas vraiment prévu pour servir en combat, mais si vous n’avez pas d’autre casque, un casque de chantier sera toujours mieux que rien.</p>",
  "Luele6U32M5YDKlj": "<p>Un casque composé de métal, de plastique et de céramique légère, conçu pour protéger la tête du soldat contre le shrapnel. Il est capitonné de rembourrage pour épouser au plus près la forme de la tête et tenir solidement en place.</p>",
  "1t9ZfJxVs14n5wTX": "<p>Cette casquette légère en cuir avec lunettes de protection est fournie avec l’armure de scribe de terrain de la Confrérie afin de protéger la tête contre les dangers des Terres désolées.</p>",
  "hKGbIZhOnncmk7UT": "<p>Un chapeau simple et léger, normalement doté d’une visière ou de larges bords pour protéger les yeux du porteur contre le soleil.</p><p><strong>Spécial :</strong> un personnage qui porte un chapeau décontracté ignore toute augmentation de difficulté causée par une lumière extrêmement vive.</p>",
  "WeHTP6Gw6Sr6HN8N": "<p>Un chapeau chic du plus bel effet pour une réunion d’affaires ou un événement officiel. À moins que vous ne portiez parce que vous aimez ce style ou parce qu’il garde votre visage à l’abri du soleil. Beaucoup de ces chapeaux sont relativement abîmés et usés à cause du manque d’entretien et de l’exposition à divers dangers, mais ils sont encore en état d’être portés.</p><p><strong>Spécial :</strong> porter un chapeau élégant vous permet de relancer une fois par scène un seul d20 sur un test de compétence basé sur le CHR que vous effectuez, car ce chapeau vous aide à faire bonne impression.</p><p>Les chapeaux élégants peuvent être renforcés avec du tissu balistique (voir encadré correspondant).</p>",
  "Mfgi1OgjnrIm0BFV": "<p>Une combinaison totalement hermétique destinée aux personnes manipulant des matières dangereuses. Les matériaux dans lesquels est fabriquée une combinaison étanche résistent mal à la violence, mais ils vous immunisent contre les radiations.</p>",
  "Z2wwI1RUjgV9UuzJ": "<p>Un harnais de sécurité d’ouvrier reconverti pour servir de support à des pièces d’armure. Très répandu parmi les pillards, lesquels ont tendance à porter le harnais sans haut en dessous.</p>",
  "sHVONLW2lTNyu8Mq": "<p>Un long manteau pesant (un épais manteau d’homme en cuir, un trench-coat ou un article similaire) idéal pour vous protéger contre les rigueurs des éléments. Fournit une défense minimale contre les dangers physiques, la chaleur extrême et couvre même assez bien pour bloquer un peu les radiations.</p><p><strong>Spécial :</strong> porter un manteau lourd vous permet de relancer une fois par scène un seul d20 sur un test de compétence basé sur l’END que vous effectuez, car il vous protège contre les rigueurs de l’environnement.</p><p>Les manteaux lourds peuvent être renforcés avec du tissu balistique (voir encadré correspondant).</p>",
  "YJBboQPnSQFg8kgp": "<p>Un masque de caoutchouc et de cuir avec une visière en plastique qui, une fois enfilé sur le visage, ne laisse plus passer l’air. Le devant du masque contient un filtre qui purifie l’air des contaminants tels que la poussière et le gaz.</p><p><strong>Spécial :</strong> le masque à gaz fournit +3 résistance aux dégâts de poison contre tous les poisons présents dans l’atmosphère ou gazeux et grâce à lui, celui qui le porte ne subit aucun effet lié au gaz ou à la poussière. Augmentez de +1 la difficulté de tous les tests de Discours d’un personnage qui porte un masque à gaz, car il étouffe la voix du porteur.</p>",
  "xEiw9lX3nYE1uoT0": "<p>Un couvre-chef renforcé avec une plaque de métal qui se rabat devant le visage. La plaque de métal inclut un morceau de verre teinté durci qui protège les yeux quand celui qui la porte utilise des outils de soudure. Elle peut être relevée ou rabaissée quand le porteur le désire. Les scribes de la Confrérie de l’Acier et les ingénieurs portent souvent des masques de soudure, car ils passent beaucoup de temps à travailler le métal.</p>",
  "LhR6Kj541PHxZ7Bo": "<p>Généralement fabriquée à partir de la peau coriace d’une brahmine, d’un radcerf ou d’un autre gros animal, cette tenue simple fournit un peu de protection et de confort, mais ne remplace pas des vêtements ou une armure dignes de ce nom.</p>",
  "TiGee8uaRs4twpOK": "<p>Une cagoule en tissu robuste fabriquée avec un sac de jute ou de toile. Elle donne un peu de protection contre la poussière, les vapeurs toxiques et les radiations en couvrant toute la tête. Elle comporte deux trous pour les yeux bien pratiques et certaines versions ajoutent des appareils respiratoires de bric et de broc, mais leur efficacité est au mieux douteuse.</p>",
  "QX9YgFGANsHkpTQd": "<p>Un trench-coat en cuir, des gants et des bottes solides en peau, un jean et une chemise. Ces éléments donnent une tenue résistante, mais confortable qui peut être portée pendant de longues périodes et assez chaude en extérieur pour convenir à ceux qui errent dans les Terres désolées.</p>",
  "jnjGlz8wOI3b2brm": "<p>Une tenue basique, mais résistante pour le personnel de la Confrérie de l’Acier, composée d’un pull militaire, d’un pantalon, de gants, de bottes de combat et de sangles militaires, elle est ornée d’insignes de la Confrérie indiquant le rang et le rôle de celui qui la porte. La couleur de l’uniforme signale aussi certaines spécialisations : les médecins portent un pull blanc, tandis que le personnel de vol porte du bleu marine. Même s’il n’est pas prévu pour le combat, ce treillis est suffisamment résistant et robuste pour fournir une protection minimale contre divers dangers.</p>",
  "j3Q6RHDSuhadGvdm": "<p>Un ensemble simple et résistant comportant un haut, une veste, un pantalon et des bottes de combat, conçu pour être porté par le personnel militaire avant la Grande Guerre. Ces vêtements sont prévus pour être portés dans des conditions peu clémentes et comportent beaucoup de poches pour transporter des objets utiles. Un ensemble intact constitue donc un butin tout à fait correct.</p><p><strong>Spécial :</strong> porter un treillis militaire vous permet de relancer une fois par scène un seul d20 sur un test de compétence basé sur la FOR ou sur l’AGI que vous effectuez, car le treillis vous donne une grande liberté de mouvement.</p><p>Les treillis militaires peuvent être renforcés avec du tissu balistique (voir encadré correspondant).</p>",
  "DEpvfGFbc6KIebfH": "<p>À l’origine, cet uniforme est la combinaison destinée à être portée sous le système d’armure assistée T-45. La surface de la tenue est recouverte de divers ports d’interface et connecteurs afin de connecter celui qui la porte au châssis de l’armure assistée, portée par-dessus. La Confrérie de l’Acier utilise cette combinaison comme base pour son uniforme standard, afin de s’assurer autant que possible que la majorité de son personnel est constamment prêt à endosser une armure complète. Au combat, l’uniforme est normalement porté sous une autre armure si aucune armure assistée n’est disponible, tandis que les officiers gradés de la Confrérie portent souvent une veste d’aviateur ou un manteau de combat blindé par-dessus leur combinaison.</p>",
  "qwD45ugL9z0szLZQ": "<p>Une veste en cuir, un pantalon en cuir et une paire de bottes de moto. Souvent décorés de clous métalliques, ces vêtements de cuir souple fournissent une modeste protection contre les dangers physiques tels qu’une chute de moto, tout en restant raisonnablement confortables par n’importe quel climat froid ou tempéré.</p>",
  "mGCVgHtv7btlXFcj": "<p>Simples, légers et permettant d’être à l’aise pour bouger, les vêtements décontractés d’avant-guerre étaient destinés à être portés pour les loisirs et les activités peu fatigantes.</p><p><strong>Spécial :</strong> porter des vêtements décontractés vous permet de relancer une fois par scène un seul d20 sur un test de compétence basé sur la FOR ou l’AGI que vous effectuez, car ces vêtements donnent une grande liberté de mouvement.</p><p>Les vêtements décontractés peuvent être renforcés avec du tissu balistique (voir encadré correspondant).</p>",
  "RWHypmbHATEbfGdU": "<p>Un costume chic, une belle robe ou un autre type de vêtements raffinés bien coupés. Davantage conçus pour être beaux que pour être fonctionnels, les vêtements élégants sont utiles quand vous voulez impressionner quelqu’un, et sont souvent prisés comme symbole de statut, donnant l’apparence de quelqu’un qui n’a pas besoin de s’inquiéter de sa propre sécurité.</p><p><strong>Spécial :</strong> porter des vêtements élégants vous permet de relancer une fois par scène un seul d20 sur un test de compétence basé sur le CHR que vous effectuez, car ces vêtements vous aident à faire bonne impression.</p><p>Les vêtements élégants peuvent être renforcés avec du tissu balistique (voir encadré correspondant).</p>",
  "DxWJxT0MuxkbCofe": "<p>Des vêtements robustes, généralement un mélange de plusieurs articles assez solides pour créer un ensemble capable de supporter la vie rude des Terres désolées. L’ensemble est ordinairement composé d’une veste, d’un haut et d’un maillot de corps, d’un jean et de chaussures de marche, renforcés (ou raccommodés) avec du scotch, pour fournir à la fois une protection minime contre les plaies et bosses de la vie et un peu de chaleur par les froides nuits d’hiver nucléaire.</p>",
  "aOmUGU0KhxIusQzy": "<p>Le vêtement standard pour tous les habitants d’un Abri, fourni par Vault-Tec. C’est une combinaison bleue près du corps avec une bande dorée qui passe autour du cou, au centre du buste et le long des manches. Cette bande est une feuille métallique qui aide à dissiper la chaleur et contribue au fonctionnement des scanners biométriques intégrés de la combinaison. Chaque combinaison d’Abri est ornée d’un numéro sur le dos, indiquant de quel Abri elle provient.</p><p>Une combinaison d’Abri peut être modifiée avec un revêtement de protection supplémentaire, recevant alors l’un des mods ci-dessous. Tous les mods de la combinaison d’Abri s’installent avec la compétence Réparation.</p>"
};
  assert.ok(catalog.certifiedThrough.en.sourcePage >= 129);
  assert.ok(catalog.certifiedThrough.fr.sourcePage >= 129);
  assert.equal(catalog.entries.filter(e => e.page === 124 && e.pack === "apparel" && e.status === "verified").length, 29);
  assert.equal(catalog.entries.filter(e => [126,129].includes(e.page) && e.pack === "apparel-mods" && e.status === "verified").length, 10);
  const docs = {};
  for (const language of ["en", "fr"]) docs[language] = new Map((await generatedDocuments(language)).map(({pack,document}) => [`${pack}/${document._id}`, document]));
  for (const [id,spec] of Object.entries(profiles)) {
    for (const language of ["en","fr"]) {
      const doc = docs[language].get(`apparel/${id}`); assert.ok(doc, `${language}/apparel/${id} missing`);
      assert.equal(doc.name, spec[language]); assert.equal(doc.flags["fallout2d20-compendium"].source.page, 124); assert.equal(doc.flags["fallout2d20-compendium"].source.errataReviewed, true);
      if (language === "fr") { assert.equal(doc.flags["fallout2d20-compendium"].source.translationReviewed, true); assert.equal(doc.system.description, officialFrDescriptions[id]); }
      assert.equal(doc.system.apparelType, spec.type); assert.deepEqual([doc.system.resistance.physical,doc.system.resistance.energy,doc.system.resistance.radiation], spec.res);
      assert.equal(doc.system.cost, spec.cost); assert.equal(doc.system.rarity, spec.rarity);
      for (const key of ["head","armL","armR","legL","legR","torso"]) assert.equal(doc.system.location[key], spec.loc.includes(key), `${id}/${key} coverage`);
      if (spec.weight === null) assert.ok(doc.system.weight < 1); else assert.equal(doc.system.weight, language === "en" ? spec.weight : spec.weight / 2);
      const actualMods = Object.keys(doc.system.mods).filter(k => /^[A-Za-z0-9]{16}$/.test(k)).sort(); assert.deepEqual(actualMods, [...spec.mods].sort()); assert.equal(doc.system.mods.max, spec.mods.length ? 1 : 0);
    }
    if (spec.weight === null) assert.equal(docs.fr.get(`apparel/${id}`).system.weight, docs.en.get(`apparel/${id}`).system.weight / 2, `${id} <1 lb metric conversion`);
  }
  assert.equal(docs.en.get("apparel/BNhFyx4TZM8NoOoN").system.rarity, 1);
  assert.equal(docs.en.get("apparel/Mfgi1OgjnrIm0BFV").system.location.head, true);
  const hazmatEntry = catalog.entries.find(e => e.documentId === "Mfgi1OgjnrIm0BFV"); assert.equal(hazmatEntry.certification.radiationImmunity, true);
  assert.equal(docs.fr.get("apparel/mGCVgHtv7btlXFcj").system.mods.R0OekXuLrtHf0j8f.name, "Tissu balistique");
  assert.equal(docs.fr.get("apparel/aOmUGU0KhxIusQzy").system.mods.p0DwgxYf9LqKdtD2.name, "Revêtement isolant"); assert.ok(!docs.fr.get("apparel/aOmUGU0KhxIusQzy").system.mods.R0OekXuLrtHf0j8f);
  for (const [id,spec] of Object.entries(mods)) for (const language of ["en","fr"]) {
    const doc = docs[language].get(`apparel-mods/${id}`); assert.ok(doc); assert.equal(doc.name, spec[language]); assert.equal(doc.flags["fallout2d20-compendium"].source.page, spec.page); assert.equal(doc.flags["fallout2d20-compendium"].source.errataReviewed, true);
    if (language === "fr") assert.equal(doc.flags["fallout2d20-compendium"].source.translationReviewed, true);
    assert.deepEqual([doc.system.resistance.physical,doc.system.resistance.energy,doc.system.resistance.radiation], spec.res); assert.equal(doc.system.cost, spec.cost); assert.equal(doc.system.perks, language === "fr" ? doc.system.perks : spec.perks);
    if (spec.weight === 0) assert.equal(doc.system.weight ?? 0, 0); else assert.equal(doc.system.weight, language === "en" ? spec.weight : spec.weight / 2);
  }
  for (const id of ["mGCVgHtv7btlXFcj","j3Q6RHDSuhadGvdm","RWHypmbHATEbfGdU","sHVONLW2lTNyu8Mq","cdwX7EVolnIWRaZi"]) assert.doesNotMatch(docs.en.get(`apparel/${id}`).system.description, /see sidebar, p[.] 126/);
  assert.equal(docs.en.get("apparel/XzEQFrZXE4OPNs3g").name, "Engineer’s Armor"); assert.equal(docs.en.get("apparel/lVYblrMAgEfHnWTR").name, "Brotherhood Scribe’s Armor"); assert.equal(docs.en.get("apparel/1t9ZfJxVs14n5wTX").name, "Brotherhood Scribe’s Hat"); assert.equal(docs.en.get("apparel/xEiw9lX3nYE1uoT0").name, "Welder’s Visor");
});


test("Core Armor p.130 Raider and Leather tables are source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 132 && catalog.certifiedThrough.en.sourcePage >= 130);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 133 && catalog.certifiedThrough.fr.sourcePage >= 130);

  const expected = new Map([
    ["F15SCdqO8m3rhpkc", { en: "Raider Chest Piece", fr: "Plastron de pillard", table: "Raider Chest Piece", location: "torso", physical: 1, energy: 1, radiation: 0, enWeight: 7, frWeight: 3.5, cost: 18, rarity: 0 }],
    ["CCrzErrpyLp7Ruz4", { en: "Raider Left Arm", fr: "Bras de pillard (gauche)", table: "Raider Arm", location: "armL", physical: 1, energy: 1, radiation: 0, enWeight: 3, frWeight: 1.5, cost: 6, rarity: 0 }],
    ["U38QzZYOaKw1oC3h", { en: "Raider Right Arm", fr: "Bras de pillard (droit)", table: "Raider Arm", location: "armR", physical: 1, energy: 1, radiation: 0, enWeight: 3, frWeight: 1.5, cost: 6, rarity: 0 }],
    ["lW7UmLaX9cJtuYIV", { en: "Raider Left Leg", fr: "Jambe de pillard (gauche)", table: "Raider Leg", location: "legL", physical: 1, energy: 1, radiation: 0, enWeight: 3, frWeight: 1.5, cost: 8, rarity: 0 }],
    ["C5ifa1Dx7rIxx65I", { en: "Raider Right Leg", fr: "Jambe de pillard (droite)", table: "Raider Leg", location: "legR", physical: 1, energy: 1, radiation: 0, enWeight: 3, frWeight: 1.5, cost: 8, rarity: 0 }],
    ["TMaT9gY04hSW3fF8", { en: "Sturdy Raider Chest Piece", fr: "Plastron de pillard solide", table: "Sturdy Raider Chest Piece", location: "torso", physical: 2, energy: 2, radiation: 0, enWeight: 12, frWeight: 6, cost: 33, rarity: 1 }],
    ["UolcghI8rwVUXpam", { en: "Sturdy Raider Left Arm", fr: "Bras de pillard solide (gauche)", table: "Sturdy Raider Arm", location: "armL", physical: 2, energy: 2, radiation: 0, enWeight: 7, frWeight: 3.5, cost: 8, rarity: 1 }],
    ["LVtFl6zabIs1mrcb", { en: "Sturdy Raider Right Arm", fr: "Bras de pillard solide (droit)", table: "Sturdy Raider Arm", location: "armR", physical: 2, energy: 2, radiation: 0, enWeight: 7, frWeight: 3.5, cost: 8, rarity: 1 }],
    ["sEsSb1c3LzdTMpM2", { en: "Sturdy Raider Left Leg", fr: "Jambe de pillard solide (gauche)", table: "Sturdy Raider Leg", location: "legL", physical: 2, energy: 2, radiation: 0, enWeight: 7, frWeight: 3.5, cost: 13, rarity: 1 }],
    ["eFk2o4BJK1wcWTDN", { en: "Sturdy Raider Right Leg", fr: "Jambe de pillard solide (droite)", table: "Sturdy Raider Leg", location: "legR", physical: 2, energy: 2, radiation: 0, enWeight: 7, frWeight: 3.5, cost: 13, rarity: 1 }],
    ["aA9RTmukDKwJd59o", { en: "Heavy Raider Chest Piece", fr: "Plastron de pillard lourd", table: "Heavy Raider Chest Piece", location: "torso", physical: 3, energy: 3, radiation: 0, enWeight: 17, frWeight: 8.5, cost: 48, rarity: 2 }],
    ["ZyjXbSyiFKjT20iR", { en: "Heavy Raider Left Arm", fr: "Bras de pillard lourd (gauche)", table: "Heavy Raider Arm", location: "armL", physical: 3, energy: 3, radiation: 0, enWeight: 10, frWeight: 5, cost: 15, rarity: 2 }],
    ["1kOtnBKd9CjpYOHW", { en: "Heavy Raider Right Arm", fr: "Bras de pillard lourd (droit)", table: "Heavy Raider Arm", location: "armR", physical: 3, energy: 3, radiation: 0, enWeight: 10, frWeight: 5, cost: 15, rarity: 2 }],
    ["rCNWvE2OVtQErwSa", { en: "Heavy Raider Left Leg", fr: "Jambe de pillard lourde (gauche)", table: "Heavy Raider Leg", location: "legL", physical: 3, energy: 3, radiation: 0, enWeight: 10, frWeight: 5, cost: 18, rarity: 2 }],
    ["YZyjpoAFfRJDvufP", { en: "Heavy Raider Right Leg", fr: "Jambe de pillard lourde (droite)", table: "Heavy Raider Leg", location: "legR", physical: 3, energy: 3, radiation: 0, enWeight: 10, frWeight: 5, cost: 18, rarity: 2 }],
    ["hLHlZT5mDbRSzXOp", { en: "Leather Chest Piece", fr: "Plastron en cuir", table: "Leather Chest Piece", location: "torso", physical: 1, energy: 2, radiation: 0, enWeight: 5, frWeight: 2.5, cost: 25, rarity: 1 }],
    ["UYhmJZwhnlwIR8fD", { en: "Leather Left Arm", fr: "Brassard en cuir (gauche)", table: "Leather Arm", location: "armL", physical: 1, energy: 2, radiation: 0, enWeight: 2, frWeight: 1, cost: 8, rarity: 1 }],
    ["f23UwUVmMqA60No3", { en: "Leather Right Arm", fr: "Brassard en cuir (droit)", table: "Leather Arm", location: "armR", physical: 1, energy: 2, radiation: 0, enWeight: 2, frWeight: 1, cost: 8, rarity: 1 }],
    ["uC3L44Jd1lpnTteV", { en: "Leather Left Leg", fr: "Jambière en cuir (gauche)", table: "Leather Leg", location: "legL", physical: 1, energy: 2, radiation: 0, enWeight: 2, frWeight: 1, cost: 10, rarity: 1 }],
    ["UYuniDcNwxokqGHW", { en: "Leather Right Leg", fr: "Jambière en cuir (droite)", table: "Leather Leg", location: "legR", physical: 1, energy: 2, radiation: 0, enWeight: 2, frWeight: 1, cost: 10, rarity: 1 }],
    ["1UDHhxbyQuOtX9EH", { en: "Sturdy Leather Chest Piece", fr: "Plastron en cuir solide", table: "Sturdy Leather Chest Piece", location: "torso", physical: 2, energy: 3, radiation: 0, enWeight: 10, frWeight: 5, cost: 50, rarity: 2 }],
    ["I2KcUoQK3ZNCZ4F4", { en: "Sturdy Leather Left Arm", fr: "Brassard en cuir solide (gauche)", table: "Sturdy Leather Arm", location: "armL", physical: 2, energy: 3, radiation: 0, enWeight: 5, frWeight: 2.5, cost: 18, rarity: 2 }],
    ["oVvBb3T24ydKgaiy", { en: "Sturdy Leather Right Arm", fr: "Brassard en cuir solide (droit)", table: "Sturdy Leather Arm", location: "armR", physical: 2, energy: 3, radiation: 0, enWeight: 5, frWeight: 2.5, cost: 18, rarity: 2 }],
    ["HClBdbJwrzkUCuZZ", { en: "Sturdy Leather Left Leg", fr: "Jambière en cuir solide (gauche)", table: "Sturdy Leather Leg", location: "legL", physical: 2, energy: 3, radiation: 0, enWeight: 5, frWeight: 2.5, cost: 20, rarity: 2 }],
    ["g5Y59atwvxDXMvoE", { en: "Sturdy Leather Right Leg", fr: "Jambière en cuir solide (droite)", table: "Sturdy Leather Leg", location: "legR", physical: 2, energy: 3, radiation: 0, enWeight: 5, frWeight: 2.5, cost: 20, rarity: 2 }],
    ["v55iaviJCqWOVY2Q", { en: "Heavy Leather Chest Piece", fr: "Plastron en cuir lourd", table: "Heavy Leather Chest Piece", location: "torso", physical: 3, energy: 4, radiation: 0, enWeight: 15, frWeight: 7.5, cost: 75, rarity: 3 }],
    ["6GQTHH3zEYZdMSQk", { en: "Heavy Leather Left Arm", fr: "Brassard en cuir lourd (gauche)", table: "Heavy Leather Arm", location: "armL", physical: 3, energy: 4, radiation: 0, enWeight: 7, frWeight: 3.5, cost: 28, rarity: 3 }],
    ["SbGvygde4xeHRGJt", { en: "Heavy Leather Right Arm", fr: "Brassard en cuir lourd (droit)", table: "Heavy Leather Arm", location: "armR", physical: 3, energy: 4, radiation: 0, enWeight: 7, frWeight: 3.5, cost: 28, rarity: 3 }],
    ["nu0CMwCsoeJfTVUx", { en: "Heavy Leather Left Leg", fr: "Jambière en cuir lourde (gauche)", table: "Heavy Leather Leg", location: "legL", physical: 3, energy: 4, radiation: 0, enWeight: 7, frWeight: 3.5, cost: 30, rarity: 3 }],
    ["17SJL8PoJweKD216", { en: "Heavy Leather Right Leg", fr: "Jambière en cuir lourde (droite)", table: "Heavy Leather Leg", location: "legR", physical: 3, energy: 4, radiation: 0, enWeight: 7, frWeight: 3.5, cost: 30, rarity: 3 }]
  ]);

  const p130 = catalog.entries.filter(entry => entry.page === 130 && entry.scope === "in_scope" && entry.pack === "apparel");
  assert.equal(p130.length, expected.size);
  assert.deepEqual(new Set(p130.map(entry => entry.documentId)), new Set(expected.keys()));
  for (const entry of p130) {
    const spec = expected.get(entry.documentId);
    assert.equal(entry.sourceName, spec.en);
    assert.equal(entry.localizedNames.fr, spec.fr);
    assert.equal(entry.certification.sourceTableName, spec.table);
    assert.equal(entry.certification.descriptionReviewed, true);
    assert.equal(entry.certification.acceptedModsReviewed, true);
  }

  for (const language of ["en", "fr"]) {
    const records = (await generatedDocuments(language)).filter(({ pack }) => pack === "apparel");
    for (const [id, spec] of expected) {
      const record = records.find(({ document }) => document._id === id);
      assert.ok(record, `${language}/apparel/${id} missing`);
      const { document } = record;
      const source = document.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page, 130, `${language}/apparel/${id} source page`);
      assert.equal(source?.errataReviewed, true, `${language}/apparel/${id} errata review`);
      assert.equal(document.name, spec[language], `${language}/apparel/${id} name`);
      assert.equal(document.system.apparelType, "armor", `${language}/apparel/${id} apparel type`);
      assert.deepEqual(document.system.resistance, { energy: spec.energy, physical: spec.physical, radiation: spec.radiation }, `${language}/apparel/${id} resistances`);
      assert.equal(document.system.weight, language === "en" ? spec.enWeight : spec.frWeight, `${language}/apparel/${id} weight`);
      assert.equal(document.system.cost, spec.cost, `${language}/apparel/${id} cost`);
      assert.equal(document.system.rarity, spec.rarity, `${language}/apparel/${id} rarity`);
      for (const location of ["armL", "armR", "head", "legL", "legR", "torso"]) {
        assert.equal(document.system.location[location], location === spec.location, `${language}/apparel/${id} location ${location}`);
      }
    }
  }

  const laterRaiderPowerArmorIds = new Set(["qEljKwu1UzA9BoL6", "Fn3CiQjQCfE9IMy4", "th5iQbnAiLsKzIVV", "JTHWr7cr6HeS2mN5", "KSd9eiC0XaVlIXkN", "XCxUCHrYFRdsgCqk"]);
  assert.ok([...expected.keys()].every(id => !laterRaiderPowerArmorIds.has(id)));
  for (const language of ["en", "fr"]) {
    const records = (await generatedDocuments(language)).filter(({ pack }) => pack === "apparel");
    for (const id of laterRaiderPowerArmorIds) {
      const record = records.find(({ document }) => document._id === id);
      assert.ok(record, `${language}/apparel/${id} later Raider Power Armor identity missing`);
      assert.equal(record.document.system.apparelType, "powerArmor");
      assert.notEqual(record.document.flags?.["fallout2d20-compendium"]?.source?.page, 130);
    }
  }
});


test("Core Armor p.131 Metal and Combat tables are source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 133 && catalog.certifiedThrough.en.sourcePage >= 131);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 134 && catalog.certifiedThrough.fr.sourcePage >= 131);

  const expected = new Map([
    ["mHzuqe2DaDduUxJs", {"en":"Metal Helmet","fr":"Casque en métal","table":"Metal Helmet","location":"head","physical":2,"energy":1,"radiation":0,"enWeight":3,"frWeight":1.5,"cost":15,"rarity":1}],
    ["Yq8LSP8WI8hkaeIh", {"en":"Metal Chest Piece","fr":"Plastron en métal","table":"Metal Chest Piece","location":"torso","physical":2,"energy":1,"radiation":0,"enWeight":6,"frWeight":3,"cost":40,"rarity":1}],
    ["oSfwWZHqhaoBlJlG", {"en":"Metal Left Arm","fr":"Brassard en métal (gauche)","table":"Metal Arm","location":"armL","physical":2,"energy":1,"radiation":0,"enWeight":3,"frWeight":1.5,"cost":15,"rarity":1}],
    ["1INSoLtiLJ9carIR", {"en":"Metal Right Arm","fr":"Brassard en métal (droit)","table":"Metal Arm","location":"armR","physical":2,"energy":1,"radiation":0,"enWeight":3,"frWeight":1.5,"cost":15,"rarity":1}],
    ["x9NMj9JoWYEOJdDs", {"en":"Metal Left Leg","fr":"Jambière en métal (gauche)","table":"Metal Leg","location":"legL","physical":2,"energy":1,"radiation":0,"enWeight":3,"frWeight":1.5,"cost":15,"rarity":1}],
    ["sGXPYqACKtkrBAhx", {"en":"Metal Right Leg","fr":"Jambière en métal (droite)","table":"Metal Leg","location":"legR","physical":2,"energy":1,"radiation":0,"enWeight":3,"frWeight":1.5,"cost":15,"rarity":1}],
    ["Dz2dC6613RP6KqA9", {"en":"Sturdy Metal Helmet","fr":"Casque en métal solide","table":"Sturdy Metal Helmet","location":"head","physical":3,"energy":2,"radiation":0,"enWeight":8,"frWeight":4,"cost":65,"rarity":2}],
    ["X1lZVeTRwlll5KDL", {"en":"Sturdy Metal Chest Piece","fr":"Plastron en métal solide","table":"Sturdy Metal Chest Piece","location":"torso","physical":3,"energy":2,"radiation":0,"enWeight":16,"frWeight":8,"cost":115,"rarity":2}],
    ["7dmvo8Xlhqt5ZrCa", {"en":"Sturdy Metal Left Arm","fr":"Brassard en métal solide (gauche)","table":"Sturdy Metal Arm","location":"armL","physical":3,"energy":2,"radiation":0,"enWeight":8,"frWeight":4,"cost":65,"rarity":2}],
    ["6sBpDpcwfP4yRDaf", {"en":"Sturdy Metal Right Arm","fr":"Brassard en métal solide (droit)","table":"Sturdy Metal Arm","location":"armR","physical":3,"energy":2,"radiation":0,"enWeight":8,"frWeight":4,"cost":65,"rarity":2}],
    ["HoENHW1I1IwXWvbr", {"en":"Sturdy Metal Left Leg","fr":"Jambière en métal solide (gauche)","table":"Sturdy Metal Leg","location":"legL","physical":3,"energy":2,"radiation":0,"enWeight":8,"frWeight":4,"cost":65,"rarity":2}],
    ["qo1Ronb9wh7MnpXI", {"en":"Sturdy Metal Right Leg","fr":"Jambière en métal solide (droite)","table":"Sturdy Metal Leg","location":"legR","physical":3,"energy":2,"radiation":0,"enWeight":8,"frWeight":4,"cost":65,"rarity":2}],
    ["QqkYk9XZKuzQvFFb", {"en":"Heavy Metal Helmet","fr":"Casque en métal lourd","table":"Heavy Metal Helmet","location":"head","physical":4,"energy":3,"radiation":0,"enWeight":12,"frWeight":6,"cost":115,"rarity":3}],
    ["DacGyxZmdShxIBTi", {"en":"Heavy Metal Chest Piece","fr":"Plastron en métal lourd","table":"Heavy Metal Chest Piece","location":"torso","physical":4,"energy":3,"radiation":0,"enWeight":23,"frWeight":11.5,"cost":190,"rarity":3}],
    ["Ece0BCI67om6qF2y", {"en":"Heavy Metal Left Arm","fr":"Brassard en métal lourd (gauche)","table":"Heavy Metal Arm","location":"armL","physical":4,"energy":3,"radiation":0,"enWeight":12,"frWeight":6,"cost":115,"rarity":3}],
    ["gyQbcEzyP00f1OZt", {"en":"Heavy Metal Right Arm","fr":"Brassard en métal lourd (droit)","table":"Heavy Metal Arm","location":"armR","physical":4,"energy":3,"radiation":0,"enWeight":12,"frWeight":6,"cost":115,"rarity":3}],
    ["MoUxwJnXAhE0g8Vx", {"en":"Heavy Metal Left Leg","fr":"Jambière en métal lourde (gauche)","table":"Heavy Metal Leg","location":"legL","physical":4,"energy":3,"radiation":0,"enWeight":12,"frWeight":6,"cost":115,"rarity":3}],
    ["MPPkcoTlL9Ccu92E", {"en":"Heavy Metal Right Leg","fr":"Jambière en métal lourde (droite)","table":"Heavy Metal Leg","location":"legR","physical":4,"energy":3,"radiation":0,"enWeight":12,"frWeight":6,"cost":115,"rarity":3}],
    ["fEynmIak6yIuBFXW", {"en":"Combat Helmet","fr":"Casque d’armure de combat","table":"Combat Helmet","location":"head","physical":2,"energy":2,"radiation":0,"enWeight":4,"frWeight":2,"cost":25,"rarity":2}],
    ["9Joxg8p3lwcIDyYn", {"en":"Combat Chest Piece","fr":"Plastron d’armure de combat","table":"Combat Chest Piece","location":"torso","physical":2,"energy":2,"radiation":0,"enWeight":8,"frWeight":4,"cost":60,"rarity":2}],
    ["CiIPyniHdWUcmTWD", {"en":"Combat Left Arm","fr":"Brassard d’armure de combat (gauche)","table":"Combat Arm","location":"armL","physical":2,"energy":2,"radiation":0,"enWeight":2,"frWeight":1,"cost":25,"rarity":2}],
    ["Nss40H02BrRolRLM", {"en":"Combat Right Arm","fr":"Brassard d’armure de combat (droit)","table":"Combat Arm","location":"armR","physical":2,"energy":2,"radiation":0,"enWeight":2,"frWeight":1,"cost":25,"rarity":2}],
    ["feCOuP7GQkP0kHFW", {"en":"Combat Left Leg","fr":"Jambière d’armure de combat (gauche)","table":"Combat Leg","location":"legL","physical":2,"energy":2,"radiation":0,"enWeight":2,"frWeight":1,"cost":25,"rarity":2}],
    ["crVLXWXaVEkAIOG9", {"en":"Combat Right Leg","fr":"Jambière d’armure de combat (droite)","table":"Combat Leg","location":"legR","physical":2,"energy":2,"radiation":0,"enWeight":2,"frWeight":1,"cost":25,"rarity":2}],
    ["kA4GLtGmdIoqMmPP", {"en":"Sturdy Combat Helmet","fr":"Casque d’armure de combat solide","table":"Sturdy Combat Helmet","location":"head","physical":3,"energy":3,"radiation":0,"enWeight":5,"frWeight":2.5,"cost":105,"rarity":3}],
    ["8Try1WliRR1U2s5z", {"en":"Sturdy Combat Chest Piece","fr":"Plastron d’armure de combat solide","table":"Sturdy Combat Chest Piece","location":"torso","physical":3,"energy":3,"radiation":0,"enWeight":12,"frWeight":6,"cost":140,"rarity":3}],
    ["FMIxSD1qOjPkn1NB", {"en":"Sturdy Combat Left Arm","fr":"Brassard d’armure de combat solide (gauche)","table":"Sturdy Combat Arm","location":"armL","physical":3,"energy":3,"radiation":0,"enWeight":5,"frWeight":2.5,"cost":105,"rarity":3}],
    ["fqiqy8TsiH2y4ZW4", {"en":"Sturdy Combat Right Arm","fr":"Brassard d’armure de combat solide (droit)","table":"Sturdy Combat Arm","location":"armR","physical":3,"energy":3,"radiation":0,"enWeight":5,"frWeight":2.5,"cost":105,"rarity":3}],
    ["KecolhJEc6uRNCDP", {"en":"Sturdy Combat Left Leg","fr":"Jambière d’armure de combat solide (gauche)","table":"Sturdy Combat Leg","location":"legL","physical":3,"energy":3,"radiation":0,"enWeight":5,"frWeight":2.5,"cost":105,"rarity":3}],
    ["R5svV8jJwgZSd2So", {"en":"Sturdy Combat Right Leg","fr":"Jambière d’armure de combat solide (droite)","table":"Sturdy Combat Leg","location":"legR","physical":3,"energy":3,"radiation":0,"enWeight":5,"frWeight":2.5,"cost":105,"rarity":3}],
    ["cWQkvo0MZ17HuKE4", {"en":"Heavy Combat Helmet","fr":"Casque d’armure de combat lourd","table":"Heavy Combat Helmet","location":"head","physical":4,"energy":4,"radiation":0,"enWeight":7,"frWeight":3.5,"cost":185,"rarity":4}],
    ["JoAG6npPBsUrc4ox", {"en":"Heavy Combat Chest Piece","fr":"Plastron d’armure de combat lourd","table":"Heavy Combat Chest Piece","location":"torso","physical":4,"energy":4,"radiation":0,"enWeight":16,"frWeight":8,"cost":220,"rarity":4}],
    ["AYWFgC8JcoSbQIHK", {"en":"Heavy Combat Left Arm","fr":"Brassard d’armure de combat lourd (gauche)","table":"Heavy Combat Arm","location":"armL","physical":4,"energy":4,"radiation":0,"enWeight":7,"frWeight":3.5,"cost":145,"rarity":4}],
    ["xeg9hpAU6eauic3p", {"en":"Heavy Combat Right Arm","fr":"Brassard d’armure de combat lourd (droit)","table":"Heavy Combat Arm","location":"armR","physical":4,"energy":4,"radiation":0,"enWeight":7,"frWeight":3.5,"cost":145,"rarity":4}],
    ["zkC1k0Z55VIsnYKA", {"en":"Heavy Combat Left Leg","fr":"Jambière d’armure de combat lourde (gauche)","table":"Heavy Combat Leg","location":"legL","physical":4,"energy":4,"radiation":0,"enWeight":7,"frWeight":3.5,"cost":185,"rarity":4}],
    ["GELhqQk4utDnWXmE", {"en":"Heavy Combat Right Leg","fr":"Jambière d’armure de combat lourde (droite)","table":"Heavy Combat Leg","location":"legR","physical":4,"energy":4,"radiation":0,"enWeight":7,"frWeight":3.5,"cost":185,"rarity":4}]
  ]);

  const tables = catalog.entries.filter(entry => entry.page === 131 && entry.type === "table" && entry.status === "out_of_scope");
  assert.deepEqual(tables.map(entry => entry.sourceName).sort(), ["Combat Armor", "Metal Armor"]);

  const p131 = catalog.entries.filter(entry => entry.page === 131 && entry.scope === "in_scope" && entry.pack === "apparel");
  assert.equal(p131.length, expected.size);
  assert.deepEqual(new Set(p131.map(entry => entry.documentId)), new Set(expected.keys()));
  for (const entry of p131) {
    const spec = expected.get(entry.documentId);
    assert.equal(entry.sourceName, spec.en);
    assert.equal(entry.localizedNames.fr, spec.fr);
    assert.equal(entry.certification.sourceTableName, spec.table);
    assert.equal(entry.certification.descriptionReviewed, true);
    assert.equal(entry.certification.materialModsReviewed, true);
    assert.equal(entry.certification.acceptedModsReviewed, true);
    assert.ok(entry.sourcePages.en.includes(134));
    assert.ok(entry.sourcePages.fr.includes(134));
  }

  for (const language of ["en", "fr"]) {
    const records = (await generatedDocuments(language)).filter(({ pack }) => pack === "apparel");
    for (const [id, spec] of expected) {
      const record = records.find(({ document }) => document._id === id);
      assert.ok(record, `${language}/apparel/${id} missing`);
      const { document } = record;
      const source = document.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page, 131, `${language}/apparel/${id} source page`);
      assert.equal(source?.errataReviewed, true, `${language}/apparel/${id} errata review`);
      assert.equal(document.name, spec[language], `${language}/apparel/${id} name`);
      assert.equal(document.system.apparelType, "armor", `${language}/apparel/${id} apparel type`);
      assert.deepEqual(document.system.resistance, { energy: spec.energy, physical: spec.physical, radiation: spec.radiation }, `${language}/apparel/${id} resistances`);
      assert.equal(document.system.weight, language === "en" ? spec.enWeight : spec.frWeight, `${language}/apparel/${id} weight`);
      assert.equal(document.system.cost, spec.cost, `${language}/apparel/${id} cost`);
      assert.equal(document.system.rarity, spec.rarity, `${language}/apparel/${id} rarity`);
      for (const location of ["armL", "armR", "head", "legL", "legR", "torso"]) {
        assert.equal(document.system.location[location], location === spec.location, `${language}/apparel/${id} location ${location}`);
      }
    }
  }

  const aggregateIds = new Set(["gqnFXfaRTRmuiUKr", "Uc0qmDLuWKDmnR4O", "8EDm7MYx0I9F1MR7", "uQyolHk8smMTNe0H", "jDM5n3gg5yoS2dx3", "Qefc7PpsmKmkFs0r"]);
  for (const language of ["en", "fr"]) {
    const records = (await generatedDocuments(language)).filter(({ pack }) => pack === "apparel");
    for (const id of aggregateIds) {
      const record = records.find(({ document }) => document._id === id);
      assert.ok(record, `${language}/apparel/${id} aggregate armor identity missing`);
      assert.notEqual(record.document.flags?.["fallout2d20-compendium"]?.source?.page, 131);
    }
  }
});


test("Core Armor p.132 Synth and Vault-Tec Security tables are source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 134 && catalog.certifiedThrough.en.sourcePage >= 132);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 135 && catalog.certifiedThrough.fr.sourcePage >= 132);

  const expected = new Map([
    ["rJkPrPBc1LmIFMKu", {"en":"Synth Helmet","fr":"Casque de synthétique","table":"Synth Helmet","location":"head","physical":2,"energy":3,"radiation":0,"enWeight":3,"frWeight":1.5,"cost":33,"rarity":3}],
    ["O0JqnMYioFaGTVbM", {"en":"Synth Chest Piece","fr":"Plastron de synthétique","table":"Synth Chest Piece","location":"torso","physical":2,"energy":3,"radiation":0,"enWeight":7,"frWeight":3.5,"cost":75,"rarity":3}],
    ["y8xpvgAazNCC0qua", {"en":"Synth Left Arm","fr":"Brassard de synthétique (gauche)","table":"Synth Arm","location":"armL","physical":2,"energy":3,"radiation":0,"enWeight":3,"frWeight":1.5,"cost":30,"rarity":4}],
    ["MmpO0xvqhLs7Z5v6", {"en":"Synth Right Arm","fr":"Brassard de synthétique (droit)","table":"Synth Arm","location":"armR","physical":2,"energy":3,"radiation":0,"enWeight":3,"frWeight":1.5,"cost":30,"rarity":4}],
    ["Xd2p6XdKQuDkXVqQ", {"en":"Synth Left Leg","fr":"Jambière de synthétique (gauche)","table":"Synth Leg","location":"legL","physical":2,"energy":3,"radiation":0,"enWeight":3,"frWeight":1.5,"cost":30,"rarity":3}],
    ["otpTV8rjo98GRwZw", {"en":"Synth Right Leg","fr":"Jambière de synthétique (droite)","table":"Synth Leg","location":"legR","physical":2,"energy":3,"radiation":0,"enWeight":3,"frWeight":1.5,"cost":30,"rarity":3}],
    ["9F62PApg0a3qLdBi", {"en":"Sturdy Synth Helmet","fr":"Casque de synthétique solide","table":"Sturdy Synth Helmet","location":"head","physical":3,"energy":4,"radiation":0,"enWeight":7,"frWeight":3.5,"cost":70,"rarity":4}],
    ["z99d3r4zPwD4ZYMe", {"en":"Sturdy Synth Chest Piece","fr":"Plastron de synthétique solide","table":"Sturdy Synth Chest Piece","location":"torso","physical":3,"energy":4,"radiation":0,"enWeight":12,"frWeight":6,"cost":125,"rarity":4}],
    ["VQ5yHv7pOivssCrT", {"en":"Sturdy Synth Left Arm","fr":"Brassard de synthétique solide (gauche)","table":"Sturdy Synth Arm","location":"armL","physical":3,"energy":4,"radiation":0,"enWeight":7,"frWeight":3.5,"cost":70,"rarity":4}],
    ["rzaHjoMSp3xL2dUF", {"en":"Sturdy Synth Right Arm","fr":"Brassard de synthétique solide (droit)","table":"Sturdy Synth Arm","location":"armR","physical":3,"energy":4,"radiation":0,"enWeight":7,"frWeight":3.5,"cost":70,"rarity":4}],
    ["tG3w6b6Bx5jFpeSW", {"en":"Sturdy Synth Left Leg","fr":"Jambière de synthétique solide (gauche)","table":"Sturdy Synth Leg","location":"legL","physical":3,"energy":4,"radiation":0,"enWeight":7,"frWeight":3.5,"cost":80,"rarity":4}],
    ["nFohkafKN9JdtaY9", {"en":"Sturdy Synth Right Leg","fr":"Jambière de synthétique solide (droite)","table":"Sturdy Synth Leg","location":"legR","physical":3,"energy":4,"radiation":0,"enWeight":7,"frWeight":3.5,"cost":80,"rarity":4}],
    ["SEh4XYH6BXZDNAOk", {"en":"Heavy Synth Helmet","fr":"Casque de synthétique lourd","table":"Heavy Synth Helmet","location":"head","physical":4,"energy":5,"radiation":0,"enWeight":10,"frWeight":5,"cost":110,"rarity":5}],
    ["j4paWkmIghe0FS59", {"en":"Heavy Synth Chest Piece","fr":"Plastron de synthétique lourd","table":"Heavy Synth Chest Piece","location":"torso","physical":4,"energy":5,"radiation":0,"enWeight":17,"frWeight":8.5,"cost":175,"rarity":5}],
    ["UUBwEiScNx5pNBiE", {"en":"Heavy Synth Left Arm","fr":"Brassard de synthétique lourd (gauche)","table":"Heavy Synth Arm","location":"armL","physical":4,"energy":5,"radiation":0,"enWeight":10,"frWeight":5,"cost":110,"rarity":5}],
    ["Ey3twO4uaBQugVLc", {"en":"Heavy Synth Right Arm","fr":"Brassard de synthétique lourd (droit)","table":"Heavy Synth Arm","location":"armR","physical":4,"energy":5,"radiation":0,"enWeight":10,"frWeight":5,"cost":110,"rarity":5}],
    ["bkqZSzYTzimVzixK", {"en":"Heavy Synth Left Leg","fr":"Jambière de synthétique lourde (gauche)","table":"Heavy Synth Leg","location":"legL","physical":4,"energy":5,"radiation":0,"enWeight":10,"frWeight":5,"cost":130,"rarity":5}],
    ["ot5oxDDNH4Fg18Id", {"en":"Heavy Synth Right Leg","fr":"Jambière de synthétique lourde (droite)","table":"Heavy Synth Leg","location":"legR","physical":4,"energy":5,"radiation":0,"enWeight":10,"frWeight":5,"cost":130,"rarity":5}],
    ["RuledpduIJ0kiNAN", {"en":"Vault-Tec Security Helmet","fr":"Casque de sécurité Vault-Tec","table":"Vault-Tec Security Helmet","location":"head","physical":2,"energy":0,"radiation":0,"enWeight":2,"frWeight":1,"cost":20,"rarity":1}],
    ["ylQsJrmkFumlUEeC", {"en":"Vault-Tec Security Armor","fr":"Armure de sécurité Vault-Tec","table":"Vault-Tec Security Armor","location":"body","physical":2,"energy":0,"radiation":2,"enWeight":8,"frWeight":4,"cost":16,"rarity":1}]
  ]);

  const tables = catalog.entries.filter(entry => entry.page === 132 && entry.type === "table" && entry.status === "out_of_scope");
  assert.deepEqual(tables.map(entry => entry.sourceName).sort(), ["Synth Armor", "Vault-Tec Security Armor"]);

  const p132 = catalog.entries.filter(entry => entry.page === 132 && entry.scope === "in_scope" && entry.pack === "apparel");
  assert.equal(p132.length, expected.size);
  assert.deepEqual(new Set(p132.map(entry => entry.documentId)), new Set(expected.keys()));

  for (const language of ["en", "fr"]) {
    const records = (await generatedDocuments(language)).filter(({ pack }) => pack === "apparel");
    for (const [id, spec] of expected) {
      const record = records.find(({ document }) => document._id === id);
      assert.ok(record, `${language}/apparel/${id} missing`);
      const { document } = record;
      const source = document.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page, 132, `${language}/apparel/${id} source page`);
      assert.equal(source?.errataReviewed, true, `${language}/apparel/${id} errata review`);
      assert.equal(document.name, spec[language], `${language}/apparel/${id} name`);
      assert.equal(document.system.apparelType, "armor", `${language}/apparel/${id} apparel type`);
      assert.deepEqual(document.system.resistance, { energy: spec.energy, physical: spec.physical, radiation: spec.radiation }, `${language}/apparel/${id} resistances`);
      assert.equal(document.system.weight, language === "en" ? spec.enWeight : spec.frWeight, `${language}/apparel/${id} weight`);
      assert.equal(document.system.cost, spec.cost, `${language}/apparel/${id} cost`);
      assert.equal(document.system.rarity, spec.rarity, `${language}/apparel/${id} rarity`);
      const expectedLocations = spec.location === "body" ? new Set(["armL","armR","legL","legR","torso"]) : new Set([spec.location]);
      for (const location of ["armL", "armR", "head", "legL", "legR", "torso"]) {
        assert.equal(document.system.location[location], expectedLocations.has(location), `${language}/apparel/${id} location ${location}`);
      }
    }
  }

  const aggregateIds = new Set(["74x1Ud7U3UdJkNG5", "KHaYrUpFfR6ieQu9", "c7zZXvkqJBtTSTsh", "8jzwxVjy2Me2QUua"]);
  for (const language of ["en", "fr"]) {
    const records = (await generatedDocuments(language)).filter(({ pack }) => pack === "apparel");
    for (const id of aggregateIds) {
      const record = records.find(({ document }) => document._id === id);
      assert.ok(record, `${language}/apparel/${id} aggregate armor identity missing`);
      assert.notEqual(record.document.flags?.["fallout2d20-compendium"]?.source?.page, 132);
    }
  }
});


test("Core Armor p.133 Raider and Leather descriptions and Material mods are source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 135 && catalog.certifiedThrough.en.sourcePage >= 133);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 136 && catalog.certifiedThrough.fr.sourcePage >= 133);

  const raiderIds = new Set(["F15SCdqO8m3rhpkc","CCrzErrpyLp7Ruz4","U38QzZYOaKw1oC3h","lW7UmLaX9cJtuYIV","C5ifa1Dx7rIxx65I","TMaT9gY04hSW3fF8","UolcghI8rwVUXpam","LVtFl6zabIs1mrcb","sEsSb1c3LzdTMpM2","eFk2o4BJK1wcWTDN","aA9RTmukDKwJd59o","ZyjXbSyiFKjT20iR","1kOtnBKd9CjpYOHW","rCNWvE2OVtQErwSa","YZyjpoAFfRJDvufP"]);
  const leatherIds = new Set(["hLHlZT5mDbRSzXOp","UYhmJZwhnlwIR8fD","f23UwUVmMqA60No3","uC3L44Jd1lpnTteV","UYuniDcNwxokqGHW","1UDHhxbyQuOtX9EH","I2KcUoQK3ZNCZ4F4","oVvBb3T24ydKgaiy","HClBdbJwrzkUCuZZ","g5Y59atwvxDXMvoE","v55iaviJCqWOVY2Q","6GQTHH3zEYZdMSQk","SbGvygde4xeHRGJt","nu0CMwCsoeJfTVUx","17SJL8PoJweKD216"]);
  const descriptions = { en: { raider: "<p>Makeshift armor employed by raiders and other cutthroat types across the wastes. It varies considerably in quality and appearance but tends to be made of scrap metal rudely battered into shape, reinforced by metal bars, wire, and leather straps. This barbaric appearance is often bolstered by grisly trophies such as skulls or other body parts.</p><p>Each piece of raider armor can accept two mods, one of which is a Material, the other of which is an Upgrade. For mods applied to Torso armor, double the weight and cost (this has already been done for Torso Only mods). Super mutant characters may only wear Raider armor. All Raider Armor Material mods are installed with the Repair skill.</p>", leather: "<p>Made from tanned and treated animal hide, these hardened leather pieces provide modest protection from physical impacts and gunshots, as well as serving to insulate the wearer from fire and other dangerous energies.</p><p>Each piece of leather armor can accept two mods, one of which is a Material, the other of which is an Upgrade. For mods applied to Torso armor, double the weight and cost (this has already been done for Torso Only mods). All Leather Armor Material mods are installed with the Repair skill.</p>" }, fr: { raider: "<p>Une armure de bric et de broc portée par les pillards et autres coupe-jarrets des Terres désolées. Sa qualité et son apparence varient considérablement selon les cas, mais elle a tendance à être composée de morceaux de ferraille grossièrement martelés pour prendre à peu près la forme voulue, renforcés par des barres de métal, du fil de fer et des sangles de cuir. Cet aspect barbare est fréquemment intensifié par de macabres trophées tels que des crânes ou d’autres parties de cadavre.</p><p>Chaque pièce d’armure de pillard peut accepter 2 mods, dont l’un est un mod de matériau et l’autre un mod d’amélioration. Pour les mods appliqués à l’armure portée sur le buste, doublez le poids et le coût (c’est déjà fait pour les mods réservés au buste). Les personnages super mutants ne peuvent pas porter d’autre armure que l’armure de pillard. Tous les mods de matériau de l’armure de pillard s’installent avec la compétence Réparation.</p>", leather: "<p>Fabriquées à partir de peaux d’animaux tannées et traitées, ces pièces de cuir durci fournissent une protection modeste contre les impacts physiques et les tirs. Elles contribuent aussi à isoler celui qui les porte du feu et des autres énergies dangereuses.</p><p>Chaque pièce d’armure de cuir peut accepter 2 mods, dont l’un est un mod de matériau et l’autre un mod d’amélioration. Pour les mods appliqués à l’armure portée sur le buste, doublez le poids et le coût (c’est déjà fait pour les mods réservés au buste seul). Tous les mods de matériau de l’armure de cuir s’installent avec la compétence Réparation.</p>" } };
  const shadowedFr = "<p>Une grande partie des types d’armures énumérés dans cette section peuvent recevoir un module pour devenir ombrées. Une armure ombrée présente une surface plus sombre et qui reflète moins la lumière pour qu’il soit plus difficile de voir celui qui la porte sous une lumière faible ou dans le noir.</p><ul><li>Si vous portez 1 ou 2 pièces d’armure ombrée, vous pouvez ignorer la première complication obtenue sur un test de Discrétion que vous tentez avec une lumière faible ou dans le noir.</li><li>Si vous portez 3 pièces d’armure ombrée ou plus, vous pouvez relancer une fois par scène un seul d20 sur un test de Discrétion que vous tentez sous une lumière faible ou dans le noir.</li><li>Si vous portez 5 pièces d’armure ombrée ou plus, vous pouvez relancer un seul d20 sur tout test de Discrétion que vous tentez sous une lumière faible ou dans le noir.</li></ul><p>Pour les besoins de cette règle, une armure couvrant le buste compte comme 2 pièces d’armure. Une armure ombrée ne fournit aucun bonus si vous êtes à l’intérieur d’une armure assistée.</p>";
  const modSpecs = {"0wIVX8zUon56LDsB":{"en":"Welded","fr":"Soudé","p":1,"e":1,"r":0,"w":1,"c":3,"shadowed":false},"nq7nPjVuJCN7lGpz":{"en":"Welded (Torso)","fr":"Soudé (Torse)","p":1,"e":1,"r":0,"w":2,"c":6,"shadowed":false},"Oawiwwrdx2ZU0xgA":{"en":"Tempered","fr":"Trempé","p":2,"e":2,"r":0,"w":1,"c":6,"shadowed":false},"uLZD28tMAPybOcdn":{"en":"Tempered (Torso)","fr":"Trempé (Torse)","p":2,"e":2,"r":0,"w":2,"c":12,"shadowed":false},"gI1rYMmsXnPOqctB":{"en":"Hardened","fr":"Renforcé","p":3,"e":3,"r":0,"w":2,"c":9,"shadowed":false},"yoRbLyIzNTy0VwGT":{"en":"Hardened (Torso)","fr":"Renforcé (Torse)","p":3,"e":3,"r":0,"w":4,"c":18,"shadowed":false},"GDI7gRGYrMxEpm99":{"en":"Buttressed","fr":"Étayé","p":4,"e":4,"r":0,"w":3,"c":12,"shadowed":false},"ttjB1mPeas5mpm8O":{"en":"Buttressed (Torso)","fr":"Étayé (Torse)","p":4,"e":4,"r":0,"w":6,"c":24,"shadowed":false},"sWsqLIvepWlGgTtY":{"en":"Boiled Leather","fr":"Cuir bouilli","p":1,"e":1,"r":0,"w":1,"c":5,"shadowed":false},"BEH1dYkTDpTKwNHX":{"en":"Boiled Leather (Torso)","fr":"Cuir bouilli (Torse)","p":1,"e":1,"r":0,"w":2,"c":10,"shadowed":false},"NKMOWl7fiN0nIl1G":{"en":"Girded Leather","fr":"Cuir armé","p":2,"e":2,"r":0,"w":1,"c":10,"shadowed":false},"67Crgv7xKULJ0j9J":{"en":"Girded Leather (Torso)","fr":"Cuir armé (Torse)","p":2,"e":2,"r":0,"w":2,"c":20,"shadowed":false},"4OR9FcaH6xrrKpBo":{"en":"Treated Leather","fr":"Cuir traité","p":3,"e":3,"r":0,"w":1,"c":15,"shadowed":false},"IbLyK0Sjkfks5BL3":{"en":"Treated Leather (Torso)","fr":"Cuir traité (Torse)","p":3,"e":3,"r":0,"w":2,"c":30,"shadowed":false},"CY6POFBbU0qeLsHG":{"en":"Shadowed Leather","fr":"Cuir ombré","p":3,"e":3,"r":0,"w":1,"c":20,"shadowed":true},"Au7oeIQaSymmXqnP":{"en":"Shadowed Leather (Torso)","fr":"Cuir ombré (Torse)","p":3,"e":3,"r":0,"w":2,"c":40,"shadowed":true},"IIhwRw2S19A9hrEV":{"en":"Studded Leather","fr":"Cuir clouté","p":4,"e":4,"r":0,"w":2,"c":25,"shadowed":false},"yYvoh87QTiCX6J8Q":{"en":"Studded Leather (Torso)","fr":"Cuir clouté (Torse)","p":4,"e":4,"r":0,"w":4,"c":50,"shadowed":false}};

  const p130Families = catalog.entries.filter(entry => entry.page === 130 && entry.pack === "apparel" && (raiderIds.has(entry.documentId) || leatherIds.has(entry.documentId)));
  assert.equal(p130Families.length, 30);
  for (const entry of p130Families) {
    assert.equal(entry.certification.descriptionReviewed, true);
    assert.equal(entry.certification.materialModsReviewed, true);
    assert.equal(entry.certification.acceptedModsReviewed, true);
    assert.ok(entry.sourcePages.en.includes(133));
    assert.ok(entry.sourcePages.fr.includes(133));
  }

  const p133Mods = catalog.entries.filter(entry => entry.page === 133 && entry.pack === "apparel-mods" && entry.status === "verified");
  assert.equal(p133Mods.length, Object.keys(modSpecs).length);
  assert.deepEqual(new Set(p133Mods.map(entry => entry.documentId)), new Set(Object.keys(modSpecs)));

  const expectedRaiderLimb = ["0wIVX8zUon56LDsB","Oawiwwrdx2ZU0xgA","gI1rYMmsXnPOqctB","GDI7gRGYrMxEpm99"];
  const expectedRaiderTorso = ["nq7nPjVuJCN7lGpz","uLZD28tMAPybOcdn","yoRbLyIzNTy0VwGT","ttjB1mPeas5mpm8O"];
  const expectedLeatherLimb = ["sWsqLIvepWlGgTtY","NKMOWl7fiN0nIl1G","4OR9FcaH6xrrKpBo","CY6POFBbU0qeLsHG","IIhwRw2S19A9hrEV"];
  const expectedLeatherTorso = ["BEH1dYkTDpTKwNHX","67Crgv7xKULJ0j9J","IbLyK0Sjkfks5BL3","Au7oeIQaSymmXqnP","yYvoh87QTiCX6J8Q"];

  for (const language of ["en", "fr"]) {
    const records = await generatedDocuments(language);
    const apparel = new Map(records.filter(({pack}) => pack === "apparel").map(({document}) => [document._id, document]));
    const mods = new Map(records.filter(({pack}) => pack === "apparel-mods").map(({document}) => [document._id, document]));

    for (const id of raiderIds) {
      const doc = apparel.get(id); assert.ok(doc, `${language}/apparel/${id} missing`);
      assert.equal(doc.system.description, descriptions[language].raider, `${language}/apparel/${id} Raider p.133 description`);
      const expected = doc.system.location.torso ? expectedRaiderTorso : expectedRaiderLimb;
      const keys = new Set(Object.keys(doc.system.mods));
      for (const modId of expected) assert.ok(keys.has(modId), `${language}/apparel/${id} missing Raider Material mod ${modId}`);
    }
    for (const id of leatherIds) {
      const doc = apparel.get(id); assert.ok(doc, `${language}/apparel/${id} missing`);
      assert.equal(doc.system.description, descriptions[language].leather, `${language}/apparel/${id} Leather p.133 description`);
      const expected = doc.system.location.torso ? expectedLeatherTorso : expectedLeatherLimb;
      const keys = new Set(Object.keys(doc.system.mods));
      for (const modId of expected) assert.ok(keys.has(modId), `${language}/apparel/${id} missing Leather Material mod ${modId}`);
    }

    for (const [id, spec] of Object.entries(modSpecs)) {
      const doc = mods.get(id); assert.ok(doc, `${language}/apparel-mods/${id} missing`);
      const source = doc.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page, 133, `${language}/apparel-mods/${id} source page`);
      assert.equal(source?.errataReviewed, true, `${language}/apparel-mods/${id} errata review`);
      assert.equal(doc.name, language === "en" ? spec.en : spec.fr, `${language}/apparel-mods/${id} name`);
      assert.equal(doc.system.apparelType, "armor");
      assert.equal(doc.system.modType, "material");
      assert.equal(doc.system.resistance.physical, spec.p);
      assert.equal(doc.system.resistance.energy, spec.e);
      assert.equal(doc.system.resistance.radiation, spec.r);
      assert.equal(doc.system.weight, language === "en" ? spec.w : spec.w / 2, `${language}/apparel-mods/${id} weight`);
      assert.equal(doc.system.cost, spec.c);
      assert.equal(doc.system.shadowed, spec.shadowed);
    }
  }

  const frRecords = await generatedDocuments("fr");
  const frMods = new Map(frRecords.filter(({pack}) => pack === "apparel-mods").map(({document}) => [document._id, document]));
  assert.ok(frMods.get("CY6POFBbU0qeLsHG").system.description.startsWith(shadowedFr));
  assert.ok(frMods.get("Au7oeIQaSymmXqnP").system.description.startsWith(shadowedFr));
});

test("Core Armor p.134 Metal and Combat descriptions and Material mods are source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 136 && catalog.certifiedThrough.en.sourcePage >= 134);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 137 && catalog.certifiedThrough.fr.sourcePage >= 134);

  const metalIds = new Set([
    "mHzuqe2DaDduUxJs","Yq8LSP8WI8hkaeIh","oSfwWZHqhaoBlJlG","1INSoLtiLJ9carIR","x9NMj9JoWYEOJdDs","sGXPYqACKtkrBAhx",
    "Dz2dC6613RP6KqA9","X1lZVeTRwlll5KDL","7dmvo8Xlhqt5ZrCa","6sBpDpcwfP4yRDaf","HoENHW1I1IwXWvbr","qo1Ronb9wh7MnpXI",
    "QqkYk9XZKuzQvFFb","DacGyxZmdShxIBTi","Ece0BCI67om6qF2y","gyQbcEzyP00f1OZt","MoUxwJnXAhE0g8Vx","MPPkcoTlL9Ccu92E"
  ]);
  const combatIds = new Set([
    "fEynmIak6yIuBFXW","9Joxg8p3lwcIDyYn","CiIPyniHdWUcmTWD","Nss40H02BrRolRLM","feCOuP7GQkP0kHFW","crVLXWXaVEkAIOG9",
    "kA4GLtGmdIoqMmPP","8Try1WliRR1U2s5z","FMIxSD1qOjPkn1NB","fqiqy8TsiH2y4ZW4","KecolhJEc6uRNCDP","R5svV8jJwgZSd2So",
    "cWQkvo0MZ17HuKE4","JoAG6npPBsUrc4ox","AYWFgC8JcoSbQIHK","xeg9hpAU6eauic3p","zkC1k0Z55VIsnYKA","GELhqQk4utDnWXmE"
  ]);

  const descriptions = {
    en: {
      metal: "<p>Shaped metal plating held together—and held on—with leather or cloth straps, which provide decent protection from physical impacts such as melee attacks and gunshots, but less protection against energy attacks, as the metal plating conducts heat.</p><p>Each piece of Metal armor other than helmets can accept two mods, one of which is a Material, the other of which is an Upgrade. Metal helmets may only accept a Material mod. For mods applied to Torso armor, double the weight and cost (this has already been done for Torso Only mods). All Metal Armor Material mods are installed with the Repair skill.</p>",
      combat: "<p>Specially made armor pieces, designed pre-War and issued to the soldiers of the U.S. Armed Forces. It was constructed to keep the wearer protected from physical and energy attacks alike without being cumbersome or awkward to wear. The Brotherhood of Steel tend to use Combat armor for their troops when Power Armor is unavailable or unsuitable for the mission.</p><p>Each piece of Combat armor other than helmets can accept two mods, one of which is a Material, the other of which is an Upgrade. Combat helmets may only accept a Material mod. For mods applied to Torso armor, double the weight and cost (this has already been done for Torso Only mods). All Combat Armor Material mods are installed with the Repair skill.</p>"
    },
    fr: {
      metal: "<p>Des plaques de métal forgé reliées les unes aux autres et maintenues sur le corps du porteur par des sangles en cuir ou en tissu qui fournissent une protection décente contre les impacts balistiques tels que les attaques de corps à corps et les tirs, mais moins contre les attaques énergétiques, car les plaques en métal conduisent la chaleur.</p><p>Chaque pièce d’armure de métal, mis à part le casque, peut accepter 2 mods, dont l’un est un mod de matériau et l’autre un mod d’amélioration. Un casque en métal ne peut accepter qu’un mod de matériau. Pour les mods appliqués à l’armure portée sur le buste, doublez le poids et le coût (c’est déjà fait pour les mods réservés au buste seul). Tous les mods de matériau de l’armure de métal s’installent avec la compétence Réparation.</p>",
      combat: "<p>Des pièces d’armures spécialement fabriquées, conçues avant la Grande Guerre et distribuées aux soldats de l’armée des États-Unis. Cette armure a été construite pour protéger son porteur contre les attaques balistiques comme énergétiques, sans pour autant être encombrante ou gêner les mouvements. La Confrérie de l’Acier a tendance à utiliser des armures de combat pour ses troupes quand elle manque d’armures assistées ou qu’une telle armure ne convient pas à la mission concernée.</p><p>Chaque pièce d’armure de combat mis à part le casque peut accepter 2 mods, dont l’un est un mod de matériau et l’autre un mod d’amélioration. Un casque d’armure de combat ne peut accepter qu’un mod de matériau. Pour les mods appliqués à l’armure portée sur le buste, doublez le poids et le coût (c’est déjà fait pour les mods réservés au buste seul). Tous les mods de matériau de l’armure de combat s’installent avec la compétence Réparation.</p>"
    }
  };

  const metalLimb = ["l0RhqycI1tg5viug","d0avgvGTDFSOEcMP","EYNQabnyteOkkeoP","plJeCoLSGJIVzF69","gySESs8tqQfig1qH"];
  const metalTorso = ["yo6HaIGzpgIuuEMD","JhWkQaODUdoyEp7d","dAP4X9pvIKfDE56r","HzkbfPbv401sMTXA","Kt14LMMm7zn0V5w2"];
  const combatLimb = ["DSrje3suQ5wYyMYp","EBkTneYU3Usezhgt","gW3K5z7MFRZoBDQa","FRPz5uD3tZ7hMjir"];
  const combatTorso = ["WCywfTr7TSWsWCPm","i5ocwMr1TQ96nsi7","b3YiI203jynIQG7V","LAb83LVky6vSxUuH"];

  const modSpecs = {
    "l0RhqycI1tg5viug":{"en":"Painted Metal","fr":"Métal peint","p":1,"e":1,"r":0,"w":1,"c":10,"shadowed":false},
    "yo6HaIGzpgIuuEMD":{"en":"Painted Metal (Torso)","fr":"Métal peint (Torse)","p":1,"e":1,"r":0,"w":2,"c":20,"shadowed":false},
    "d0avgvGTDFSOEcMP":{"en":"Enameled Metal","fr":"Métal émaillé","p":2,"e":2,"r":0,"w":2,"c":20,"shadowed":false},
    "JhWkQaODUdoyEp7d":{"en":"Enameled Metal (Torso)","fr":"Métal émaillé (Torse)","p":2,"e":2,"r":0,"w":4,"c":40,"shadowed":false},
    "EYNQabnyteOkkeoP":{"en":"Shadowed Metal","fr":"Métal ombré","p":2,"e":2,"r":0,"w":2,"c":25,"shadowed":true},
    "dAP4X9pvIKfDE56r":{"en":"Shadowed Metal (Torso)","fr":"Métal ombré (Torse)","p":2,"e":2,"r":0,"w":4,"c":50,"shadowed":true},
    "plJeCoLSGJIVzF69":{"en":"Alloyed Metal","fr":"Métal allié","p":3,"e":3,"r":0,"w":3,"c":30,"shadowed":false},
    "HzkbfPbv401sMTXA":{"en":"Alloyed Metal (Torso)","fr":"Métal allié (Torse)","p":3,"e":3,"r":0,"w":6,"c":60,"shadowed":false},
    "gySESs8tqQfig1qH":{"en":"Polished Metal","fr":"Métal poli","p":4,"e":4,"r":0,"w":4,"c":40,"shadowed":false},
    "Kt14LMMm7zn0V5w2":{"en":"Polished Metal (Torso)","fr":"Métal poli (Torse)","p":4,"e":4,"r":0,"w":8,"c":80,"shadowed":false},
    "DSrje3suQ5wYyMYp":{"en":"Reinforced","fr":"Renforcé","p":1,"e":1,"r":0,"w":1,"c":15,"shadowed":false},
    "WCywfTr7TSWsWCPm":{"en":"Reinforced (Torso)","fr":"Renforcé (Torse)","p":1,"e":1,"r":0,"w":2,"c":30,"shadowed":false},
    "EBkTneYU3Usezhgt":{"en":"Shadowed","fr":"Ombré","p":1,"e":1,"r":0,"w":1,"c":15,"shadowed":true},
    "i5ocwMr1TQ96nsi7":{"en":"Shadowed (Torso)","fr":"Ombré (Torse)","p":1,"e":1,"r":0,"w":2,"c":30,"shadowed":true},
    "gW3K5z7MFRZoBDQa":{"en":"Fiberglass","fr":"Fibre de verre","p":2,"e":2,"r":0,"w":1,"c":30,"shadowed":false},
    "b3YiI203jynIQG7V":{"en":"Fiberglass (Torso)","fr":"Fibre de verre (Torse)","p":2,"e":2,"r":0,"w":2,"c":60,"shadowed":false},
    "FRPz5uD3tZ7hMjir":{"en":"Polymer","fr":"Polymère","p":3,"e":3,"r":0,"w":2,"c":45,"shadowed":false},
    "LAb83LVky6vSxUuH":{"en":"Polymer (Torso)","fr":"Polymère (Torse)","p":3,"e":3,"r":0,"w":4,"c":90,"shadowed":false}
  };

  const p131Families = catalog.entries.filter(entry => entry.page === 131 && entry.pack === "apparel" && (metalIds.has(entry.documentId) || combatIds.has(entry.documentId)));
  assert.equal(p131Families.length, 36);
  for (const entry of p131Families) {
    assert.equal(entry.certification.descriptionReviewed, true);
    assert.equal(entry.certification.materialModsReviewed, true);
    assert.equal(entry.certification.acceptedModsReviewed, true);
    assert.ok(entry.sourcePages.en.includes(134));
    assert.ok(entry.sourcePages.fr.includes(134));
    const helmet = entry.sourceName.includes("Helmet");
    assert.equal(entry.certification.maxMods, helmet ? 1 : 2);
    assert.equal(entry.certification.materialSlots, 1);
    assert.equal(entry.certification.upgradeSlots, helmet ? 0 : 1);
  }

  const p134Rules = catalog.entries.filter(entry => entry.page === 134 && entry.type === "rule_text" && entry.status === "out_of_scope");
  assert.deepEqual(p134Rules.map(entry => entry.sourceName).sort(), ["Combat Armor","Metal Armor"]);
  const p134Tables = catalog.entries.filter(entry => entry.page === 134 && entry.type === "table" && entry.status === "out_of_scope");
  assert.deepEqual(p134Tables.map(entry => entry.sourceName).sort(), ["Unique Combat Armor Material Mods","Unique Metal Armor Material Mods"]);
  const metalTable = p134Tables.find(entry => entry.sourceName === "Unique Metal Armor Material Mods");
  assert.ok(metalTable.certification.errataNote.includes("Rust Devils NPC Pack"));

  const p134Mods = catalog.entries.filter(entry => entry.page === 134 && entry.pack === "apparel-mods" && entry.status === "verified");
  assert.equal(p134Mods.length, Object.keys(modSpecs).length);
  assert.deepEqual(new Set(p134Mods.map(entry => entry.documentId)), new Set(Object.keys(modSpecs)));

  for (const language of ["en","fr"]) {
    const records = await generatedDocuments(language);
    const apparel = new Map(records.filter(({pack}) => pack === "apparel").map(({document}) => [document._id, document]));
    const mods = new Map(records.filter(({pack}) => pack === "apparel-mods").map(({document}) => [document._id, document]));

    for (const [id, family] of [...[...metalIds].map(id => [id,"metal"]), ...[...combatIds].map(id => [id,"combat"])]) {
      const doc = apparel.get(id);
      assert.ok(doc, `${language}/apparel/${id} missing`);
      assert.equal(doc.system.description, descriptions[language][family], `${language}/apparel/${id} p.134 family description`);
      const isTorso = doc.system.location.torso;
      const expectedMaterial = family === "metal" ? (isTorso ? metalTorso : metalLimb) : (isTorso ? combatTorso : combatLimb);
      const embedded = Object.entries(doc.system.mods).filter(([,value]) => value && typeof value === "object" && value.system);
      const actualMaterial = embedded.filter(([,value]) => value.system.modType === "material").map(([modId]) => modId);
      assert.deepEqual(new Set(actualMaterial), new Set(expectedMaterial), `${language}/apparel/${id} Material mods`);
      const helmet = doc.system.location.head;
      assert.equal(doc.system.mods.max, helmet ? 1 : 2, `${language}/apparel/${id} mod-slot maximum`);
      if (helmet) {
        const upgrades = embedded.filter(([,value]) => value.system.modType === "upgrade");
        assert.equal(upgrades.length, 0, `${language}/apparel/${id} helmet must not accept Upgrade mods`);
      }
    }

    for (const [id,spec] of Object.entries(modSpecs)) {
      const doc = mods.get(id);
      assert.ok(doc, `${language}/apparel-mods/${id} missing`);
      const source = doc.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page, 134, `${language}/apparel-mods/${id} source page`);
      assert.equal(source?.errataReviewed, true, `${language}/apparel-mods/${id} errata review`);
      assert.equal(doc.name, language === "en" ? spec.en : spec.fr, `${language}/apparel-mods/${id} name`);
      assert.equal(doc.system.apparelType, "armor");
      assert.equal(doc.system.modType, "material");
      assert.equal(doc.system.resistance.physical, spec.p);
      assert.equal(doc.system.resistance.energy, spec.e);
      assert.equal(doc.system.resistance.radiation, spec.r);
      assert.equal(doc.system.weight, language === "en" ? spec.w : spec.w / 2, `${language}/apparel-mods/${id} weight`);
      assert.equal(doc.system.cost, spec.c);
      assert.equal(doc.system.shadowed, spec.shadowed);
    }

    for (const id of ["EYNQabnyteOkkeoP","dAP4X9pvIKfDE56r","EBkTneYU3Usezhgt","i5ocwMr1TQ96nsi7"]) {
      const doc = mods.get(id);
      assert.ok(doc.system.description.length > 0, `${language}/apparel-mods/${id} Shadowed rule description`);
      assert.match(doc.system.description, language === "en" ? /Shadowed armor has a darker/ : /Une armure ombrée présente une surface plus sombre/);
    }
  }
});

test("Core Armor p.135 Synth descriptions, Material mods, and Vault-Tec description are source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 137 && catalog.certifiedThrough.en.sourcePage >= 135);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 138 && catalog.certifiedThrough.fr.sourcePage >= 135);

  const synthIds = new Set([
    "rJkPrPBc1LmIFMKu","O0JqnMYioFaGTVbM","y8xpvgAazNCC0qua","MmpO0xvqhLs7Z5v6","Xd2p6XdKQuDkXVqQ","otpTV8rjo98GRwZw",
    "9F62PApg0a3qLdBi","z99d3r4zPwD4ZYMe","VQ5yHv7pOivssCrT","rzaHjoMSp3xL2dUF","tG3w6b6Bx5jFpeSW","nFohkafKN9JdtaY9",
    "SEh4XYH6BXZDNAOk","j4paWkmIghe0FS59","UUBwEiScNx5pNBiE","Ey3twO4uaBQugVLc","bkqZSzYTzimVzixK","ot5oxDDNH4Fg18Id"
  ]);
  const vaultIds = new Set(["RuledpduIJ0kiNAN","ylQsJrmkFumlUEeC"]);
  const descriptions = {
    en: {
      synth: "<p>Developed by The Institute, Synth armor is distinctive and provides excellent protection, especially from energy weapons, but can only really be found within the Commonwealth and other locations where Institute synths travel. The rarity of its manufacture means that it’s hard to acquire for anyone not on good terms with the Institute, and expensive even then.</p><p>Each piece of Synth armor other than helmets can accept two mods, one of which is a Material, the other of which is an Upgrade. Synth helmets may only accept a Material mod. For mods applied to Torso armor, double the weight and cost (this has already been done for Torso Only mods). All Synth Armor Material mods are installed with the Repair skill.</p>",
      vault: "<p>Consisting of a long bulletproof apron and shoulder pads, plus an accompanying shock-resistant helmet, this armor was issued in small quantities to every vault for those vault-dwellers chosen to act as security personnel. It provides modest protection and isn’t especially bulky, but it is unlikely to stand up to heavy combat, simply because vaults were expected to be controlled environments, lacking in the heavy armaments found outside.</p>"
    },
    fr: {
      synth: "<p>Développée par l’Institut, l’armure de synthétique est clairement reconnaissable et fournit une excellente protection, surtout contre les armes à énergie, mais n’est véritablement présente que dans le Commonwealth et les autres lieux où se rendent les synthés de l’Institut. Comme les armures de cette facture sont rares, elles sont difficiles à acquérir pour quiconque n’est pas en bons termes avec l’Institut et chères même en remplissant cette condition.</p><p>Chaque pièce d’armure de synthétique mis à part le casque peut accepter 2 mods, dont l’un est un mod de matériau et l’autre un mod d’amélioration. Un casque de synthétique ne peut accepter qu’un mod de matériau. Pour les mods appliqués à l’armure portée sur le buste, doublez le poids et le coût (c’est déjà fait pour les mods réservés au buste seul). Tous les mods de matériau de l’armure de synthétique s’installent avec la compétence Réparation.</p>",
      vault: "<p>Composée d’un long tablier pare-balles et d’épaulières et accompagnée d’un casque résistant aux chocs, cette armure fut distribuée en peu d’exemplaires à chaque Abri pour les habitants de l’Abri choisis pour jouer le rôle de personnel de sécurité. Elle fournit une protection modeste et n’est pas particulièrement volumineuse, mais ne tiendra probablement pas le coup face à des armes lourdes, pour la simple et bonne raison que les Abris étaient censés être des environnements contrôlés, dans lesquels l’armement redoutable du dehors n’était pas présent.</p>"
    }
  };

  const limbMods = ["9FlKDaWEsEDXBCMP","hWUuQFc4H82qxPec","lX3JRbJLh0mYyQJd","tWP01ABVj2P3dPak"];
  const torsoMods = ["ZhrilZpyh7l9kkQD","SW0MOzUjhhMYjJrr","SUBvV0XNUQzeCfOH","cVxi6JY2Z5HeVM4v"];
  const modSpecs = {
    "9FlKDaWEsEDXBCMP":{"en":"Laminated","fr":"Stratifié","p":1,"e":1,"r":0,"w":1,"c":5},
    "ZhrilZpyh7l9kkQD":{"en":"Laminated (Torso)","fr":"Stratifié (Torse)","p":1,"e":1,"r":0,"w":2,"c":10},
    "hWUuQFc4H82qxPec":{"en":"Resin","fr":"Résineux","p":2,"e":2,"r":0,"w":1,"c":10},
    "SW0MOzUjhhMYjJrr":{"en":"Resin (Torso)","fr":"Résineux (Torse)","p":2,"e":2,"r":0,"w":2,"c":20},
    "lX3JRbJLh0mYyQJd":{"en":"Microcarbon","fr":"Microfibre de carbone","p":3,"e":3,"r":0,"w":2,"c":15},
    "SUBvV0XNUQzeCfOH":{"en":"Microcarbon (Torso)","fr":"Microfibre de carbone (Torse)","p":3,"e":3,"r":0,"w":4,"c":30},
    "tWP01ABVj2P3dPak":{"en":"Nanofilament","fr":"Nanofilament","p":4,"e":4,"r":0,"w":3,"c":20},
    "cVxi6JY2Z5HeVM4v":{"en":"Nanofilament (Torso)","fr":"Nanofilament (Torse)","p":4,"e":4,"r":0,"w":6,"c":40}
  };

  const p132Synth = catalog.entries.filter(entry => entry.page === 132 && entry.pack === "apparel" && synthIds.has(entry.documentId));
  assert.equal(p132Synth.length, 18);
  for (const entry of p132Synth) {
    assert.equal(entry.certification.descriptionReviewed, true);
    assert.equal(entry.certification.materialModsReviewed, true);
    assert.equal(entry.certification.acceptedModsReviewed, true);
    assert.ok(entry.sourcePages.en.includes(135));
    assert.ok(entry.sourcePages.fr.includes(135));
    const helmet = entry.sourceName.includes("Helmet");
    assert.equal(entry.certification.maxMods, helmet ? 1 : 2);
    assert.equal(entry.certification.materialSlots, 1);
    assert.equal(entry.certification.upgradeSlots, helmet ? 0 : 1);
  }

  const p132Vault = catalog.entries.filter(entry => entry.page === 132 && entry.pack === "apparel" && vaultIds.has(entry.documentId));
  assert.equal(p132Vault.length, 2);
  for (const entry of p132Vault) {
    assert.equal(entry.certification.descriptionReviewed, true);
    assert.equal(entry.certification.acceptedModsReviewed, true);
    assert.ok(entry.sourcePages.en.includes(135));
    assert.ok(entry.sourcePages.fr.includes(135));
  }

  const p135Rules = catalog.entries.filter(entry => entry.page === 135 && entry.type === "rule_text" && entry.status === "out_of_scope");
  assert.deepEqual(p135Rules.map(entry => entry.sourceName).sort(), ["Synth Armor","Vault-Tec Security Armor"]);
  const p135Tables = catalog.entries.filter(entry => entry.page === 135 && entry.type === "table" && entry.status === "out_of_scope");
  assert.deepEqual(p135Tables.map(entry => entry.sourceName), ["Unique Synth Armor Material Mods"]);
  assert.ok(p135Tables[0].certification.errataNote.includes("Armor Upgrade Mods table"));
  assert.ok(p135Tables[0].certification.errataNote.includes("does not alter"));

  const p135Mods = catalog.entries.filter(entry => entry.page === 135 && entry.pack === "apparel-mods" && entry.status === "verified");
  assert.equal(p135Mods.length, Object.keys(modSpecs).length);
  assert.deepEqual(new Set(p135Mods.map(entry => entry.documentId)), new Set(Object.keys(modSpecs)));

  for (const language of ["en","fr"]) {
    const records = await generatedDocuments(language);
    const apparel = new Map(records.filter(({pack}) => pack === "apparel").map(({document}) => [document._id, document]));
    const mods = new Map(records.filter(({pack}) => pack === "apparel-mods").map(({document}) => [document._id, document]));

    for (const id of synthIds) {
      const doc = apparel.get(id);
      assert.ok(doc, language + "/apparel/" + id + " missing");
      assert.equal(doc.system.description, descriptions[language].synth, language + "/apparel/" + id + " p.135 Synth description");
      const embedded = Object.entries(doc.system.mods).filter(([,value]) => value && typeof value === "object" && value.system);
      const actualMaterial = embedded.filter(([,value]) => value.system.modType === "material").map(([modId]) => modId);
      const expectedMaterial = doc.system.location.torso ? torsoMods : limbMods;
      assert.deepEqual(new Set(actualMaterial), new Set(expectedMaterial), language + "/apparel/" + id + " Material mods");
      const helmet = doc.system.location.head;
      assert.equal(doc.system.mods.max, helmet ? 1 : 2, language + "/apparel/" + id + " mod-slot maximum");
      if (helmet) {
        const upgrades = embedded.filter(([,value]) => value.system.modType === "upgrade");
        assert.equal(upgrades.length, 0, language + "/apparel/" + id + " Synth helmet must not accept Upgrade mods");
      }
    }

    for (const id of vaultIds) {
      const doc = apparel.get(id);
      assert.ok(doc, language + "/apparel/" + id + " missing");
      assert.equal(doc.system.description, descriptions[language].vault, language + "/apparel/" + id + " p.135 Vault-Tec description");
    }

    for (const [id,spec] of Object.entries(modSpecs)) {
      const doc = mods.get(id);
      assert.ok(doc, language + "/apparel-mods/" + id + " missing");
      const source = doc.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page, 135, language + "/apparel-mods/" + id + " source page");
      assert.equal(source?.errataReviewed, true, language + "/apparel-mods/" + id + " errata review");
      assert.equal(doc.name, language === "en" ? spec.en : spec.fr, language + "/apparel-mods/" + id + " name");
      assert.equal(doc.system.apparelType, "armor");
      assert.equal(doc.system.modType, "material");
      assert.equal(doc.system.resistance.physical, spec.p);
      assert.equal(doc.system.resistance.energy, spec.e);
      assert.equal(doc.system.resistance.radiation, spec.r);
      assert.equal(doc.system.weight, language === "en" ? spec.w : spec.w / 2, language + "/apparel-mods/" + id + " weight");
      assert.equal(doc.system.cost, spec.c);
    }
  }

  const aggregateIds = new Set(["74x1Ud7U3UdJkNG5","KHaYrUpFfR6ieQu9","c7zZXvkqJBtTSTsh","8jzwxVjy2Me2QUua"]);
  for (const language of ["en","fr"]) {
    const records = (await generatedDocuments(language)).filter(({pack}) => pack === "apparel");
    for (const id of aggregateIds) {
      const record = records.find(({document}) => document._id === id);
      assert.ok(record, language + "/apparel/" + id + " aggregate identity missing");
      assert.notEqual(record.document.flags?.["fallout2d20-compendium"]?.source?.page, 135);
    }
  }
});

test("Core Armor p.136 Upgrade mods and accepted upgrade sets are source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 138 && catalog.certifiedThrough.en.sourcePage >= 136);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 139 && catalog.certifiedThrough.fr.sourcePage >= 136);

  const intro = {
    en: "<p>Armor Upgrades apply to all the types of armor listed above (except for Vault-Tec Security armor) and are collected here to avoid repetition. All Armor Upgrades are installed with the Repair skill.</p>",
    fr: "<p>Les améliorations d’armure s’appliquent à tous les types d’armures énumérés juste avant (mis à part l’armure de sécurité Vault-Tec) et sont rassemblées ci-dessous afin de ne pas être répétées pour chaque armure. Toutes les améliorations d’armure s’installent avec la compétence Réparation.</p>"
  };
  const specs = {
    "vCzArLcyEN25Awf3": {en:"Lighter Build",fr:"Structure légère",location:"All Locations",w:-1,c:1,perks:""},
    "6Auqz8lwvuB7UFdy": {en:"Lighter Build (Torso)",fr:"Structure légère (Torse)",location:"Torso",w:-2,c:2,perks:""},
    "KRuKJ0eR46ZycdGM": {en:"Pocketed",fr:"Poches",location:"All Locations",w:1,c:1,perks:"Armorer 1",effectEn:"<p>+10 Carry Weight</p>",effectFr:"<p>+10 en charge maximale</p>"},
    "5sQU0kdQbhyacSdu": {en:"Pocketed (Torso)",fr:"Poches (Torse)",location:"Torso",w:2,c:2,perks:"Armorer 1",effectEn:"<p>+10 Carry Weight</p>",effectFr:"<p>+10 en charge maximale</p>"},
    "FySCG1SWS7SABvE7": {en:"Deep Pocketed",fr:"Larges poches",location:"All Locations",w:2,c:5,perks:"Armorer 1",effectEn:"<p>+20 Carry Weight</p>",effectFr:"<p>+20 en charge maximale</p>"},
    "4PtjwYY1RpNnvExC": {en:"Deep Pocketed (Torso)",fr:"Larges poches (Torse)",location:"Torso",w:4,c:10,perks:"Armorer 1",effectEn:"<p>+20 Carry Weight</p>",effectFr:"<p>+20 en charge maximale</p>"},
    "lRwdket2A4FxBzpQ": {en:"Lead Lined",fr:"Revêtement en plomb",location:"All Locations",w:2,c:5,perks:"Armorer 4, Science! 1",rad:3},
    "SZGWmJhEwwoXU1PR": {en:"Lead Lined (Torso)",fr:"Revêtement en plomb (Torse)",location:"Torso",w:4,c:10,perks:"Armorer 4, Science! 1",rad:3},
    "iigJa7Sxwi1um5tb": {en:"Ultra Light Build",fr:"Structure ultra légère",location:"All Locations",w:-3,c:7,perks:"Armorer 3"},
    "yWvt9clbKolwdbm1": {en:"Ultra Light Build (Torso)",fr:"Structure ultra légère (Torse)",location:"Torso",w:-6,c:14,perks:"Armorer 3"},
    "q48esitA3U4tmuXT": {en:"Padded",fr:"Rembourrage",location:"Torso",w:4,c:1,perks:"",effectEn:"<p>+2 to all damage resistances vs Blast weapons</p>",effectFr:"<p>+2 à toutes les résistances aux dégâts contre les armes à Zone d’impact</p>"},
    "e7ySHkXMm9o7Aovi": {en:"Asbestos Lining",fr:"Revêtement amianté",location:"Torso",w:4,c:3,perks:"Armorer 1",energy:3,effectEn:"<p>Ignore Energy damage from the Persistent damage effect</p>",effectFr:"<p>Ignorez les dégâts énergétiques venant de l’effet de dégâts Persistant</p>"},
    "XYvAnkqTE6TUIvzs": {en:"Dense",fr:"Densifié",location:"Torso",w:4,c:7,perks:"Armorer 3",effectEn:"<p>+4 to all Damage Resistances vs Blast weapons</p>",effectFr:"<p>+4 à toutes les résistances aux dégâts contre les armes à Zone d’impact</p>"},
    "QXgVEVm7Ttp4UFpS": {en:"BioCommMesh",fr:"BioCommMesh",location:"Torso",w:2,c:9,perks:"Armorer 4, Science! 2",effectEn:"<p>Chems last twice as long (see p.164)</p>",effectFr:"<p>Les effets des drogues durent deux fois plus longtemps (voir page 164)</p>"},
    "8F9G1Cg2OmluAbG1": {en:"Pneumatic",fr:"Pneumatique",location:"Torso",w:2,c:9,perks:"Armorer 4",effectEn:"<p>Stun damage effect requires 2+ Effects to be rolled to affect you</p>",effectFr:"<p>L’effet de dégâts Étourdissant nécessite 2+ Effets sur le jet de dégâts pour s’appliquer à vous</p>"},
    "3d0refqygOWlr08D": {en:"Brawling",fr:"Bagarreur",location:"Arms",w:1,c:1,perks:"Armorer 1",effectEn:"<p>Unarmed attacks inflict +1 @fos[DC] damage</p>",effectFr:"<p>Les attaques à mains nues infligent +1 @fos[DC] de dégâts</p>"},
    "wchyh9LXoAUTHYKT": {en:"Braced",fr:"Renforcé",location:"Arms",w:1,c:1,perks:"Armorer 1",effectEn:"<p>+2 to all damage resistances vs melee attacks.</p>",effectFr:"<p>+2 à toutes les résistances aux dégâts contre les attaques de corps à corps</p>"},
    "ZHnH96ic3qiVPJ25": {en:"Stabilized",fr:"Stabilisé",location:"Arms",w:1,c:1,perks:"Armorer 2",effectEn:"<p>When you aim and make a ranged attack, +1 @fos[DC] to the attack’s damage</p>",effectFr:"<p>Quand vous visez et que vous portez une attaque à distance, +1 @fos[DC] aux dégâts de l’attaque</p>"},
    "oO7frtQFoeNU9yl8": {en:"Aerodynamic",fr:"Aérodynamique",location:"Arms",w:0,c:1,perks:"Armorer 3",effectEn:"<p>May spend up to 4 AP on bonus damage for melee attacks</p>",effectFr:"<p>Vous pouvez dépenser jusqu’à 4 PA en dégâts bonus pour les attaques de corps à corps</p>"},
    "Vr2IfyQOyGYvS3sn": {en:"Weighted",fr:"Alourdi",location:"Arms",w:1,c:3,perks:"Armorer 4",effectEn:"<p>Melee and Unarmed attacks gain Piercing 1</p>",effectFr:"<p>Les attaques de corps à corps et à mains nues gagnent Perforant 1</p>"},
    "RvH2R9EpAEtwzfsp": {en:"Cushioned",fr:"Amortissement",location:"Legs",w:0,c:1,perks:"Armorer 1",effectEn:"<p>+2 to Physical damage resistance vs falling damage</p>",effectFr:"<p>+2 résistance aux dégâts balistiques contre les dégâts de chute</p>"},
    "GQvToNs1kHcwOPII": {en:"Muffled",fr:"Silencieux",location:"Legs",w:0,c:2,perks:"Armorer 2",effectEn:"<p>Re-roll 1d20 on Stealth tests</p>",effectFr:"<p>Vous pouvez relancer 1d20 sur les tests de Discrétion</p>"}
  };

  const table = catalog.entries.find(entry => entry.page === 136 && entry.type === "table" && entry.sourceName === "Armor Upgrade Mods");
  assert.ok(table);
  assert.equal(table.certification.rowCount, 17);
  assert.equal(table.certification.publishedIdentityCount, 22);
  assert.equal(table.certification.errataApplied, true);
  assert.match(table.certification.errataNote, /Laminated/);
  assert.match(table.certification.errataNote, /Lighter Build/);
  assert.match(table.certification.localizationDiscrepancy, /Poches/);
  assert.match(table.certification.localizationDiscrepancy, /Armurier 2/);

  const p136Mods = catalog.entries.filter(entry => entry.page === 136 && entry.pack === "apparel-mods" && entry.status === "verified");
  assert.equal(p136Mods.length, Object.keys(specs).length);
  assert.deepEqual(new Set(p136Mods.map(entry => entry.documentId)), new Set(Object.keys(specs)));
  for (const obsoleteId of ["9FlKDaWEsEDXBCMP","hWUuQFc4H82qxPec","lX3JRbJLh0mYyQJd"]) {
    assert.ok(!p136Mods.some(entry => entry.documentId === obsoleteId), "Synth Material identity must not be certified as a p.136 Upgrade");
  }

  const armorEntries = catalog.entries.filter(entry => [130,131,132].includes(entry.page) && entry.scope === "in_scope" && entry.pack === "apparel");
  assert.equal(armorEntries.length, 86);
  for (const entry of armorEntries) {
    assert.equal(entry.certification.acceptedModsReviewed, true, entry.sourceName + " accepted mods review");
    assert.ok(entry.sourcePages.en.includes(136), entry.sourceName + " EN p.136 dependency");
    assert.ok(entry.sourcePages.fr.includes(136), entry.sourceName + " FR p.136 dependency");
  }

  const allGeneric = ["vCzArLcyEN25Awf3","KRuKJ0eR46ZycdGM","FySCG1SWS7SABvE7","lRwdket2A4FxBzpQ","iigJa7Sxwi1um5tb"];
  const allTorso = ["6Auqz8lwvuB7UFdy","5sQU0kdQbhyacSdu","4PtjwYY1RpNnvExC","SZGWmJhEwwoXU1PR","yWvt9clbKolwdbm1"];
  const torsoOnly = ["q48esitA3U4tmuXT","e7ySHkXMm9o7Aovi","XYvAnkqTE6TUIvzs","QXgVEVm7Ttp4UFpS","8F9G1Cg2OmluAbG1"];
  const armsOnly = ["3d0refqygOWlr08D","wchyh9LXoAUTHYKT","ZHnH96ic3qiVPJ25","oO7frtQFoeNU9yl8","Vr2IfyQOyGYvS3sn"];
  const legsOnly = ["RvH2R9EpAEtwzfsp","GQvToNs1kHcwOPII"];

  for (const language of ["en","fr"]) {
    const records = await generatedDocuments(language);
    const apparel = new Map(records.filter(({pack}) => pack === "apparel").map(({document}) => [document._id, document]));
    const mods = new Map(records.filter(({pack}) => pack === "apparel-mods").map(({document}) => [document._id, document]));

    for (const [id,spec] of Object.entries(specs)) {
      const doc = mods.get(id);
      assert.ok(doc, language + "/apparel-mods/" + id + " missing");
      const source = doc.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page, 136, language + "/apparel-mods/" + id + " source page");
      assert.equal(source?.errataReviewed, true, language + "/apparel-mods/" + id + " errata");
      assert.equal(doc.name, spec[language], language + "/apparel-mods/" + id + " name");
      assert.equal(doc.system.apparelType, "armor");
      assert.equal(doc.system.modType, "upgrade");
      assert.equal(doc.system.location, spec.location);
      assert.equal(doc.system.cost, spec.c);
      assert.equal(doc.system.perks, spec.perks);
      assert.equal(doc.system.weight, language === "en" ? spec.w : spec.w / 2, language + "/apparel-mods/" + id + " weight");
      assert.deepEqual(doc.system.resistance, {energy:spec.energy ?? 0, physical:0, radiation:spec.rad ?? 0});
      assert.ok(doc.system.description.startsWith(intro[language]), language + "/apparel-mods/" + id + " source intro");
      assert.match(doc.system.description, /data-f2d20-recipe="core"/, language + "/apparel-mods/" + id + " recipe retained");
      if (spec.effectEn) assert.equal(doc.system.effect, language === "en" ? spec.effectEn : spec.effectFr, language + "/apparel-mods/" + id + " effect");
    }

    for (const entry of armorEntries) {
      const doc = apparel.get(entry.documentId);
      assert.ok(doc, language + "/apparel/" + entry.documentId + " missing");
      const embedded = Object.entries(doc.system.mods || {}).filter(([,value]) => value && typeof value === "object" && value.system);
      const actualUpgrades = embedded.filter(([,value]) => value.system.modType === "upgrade").map(([id]) => id);
      let expected = [];
      let expectedMax = 2;
      if (entry.sourceName.startsWith("Vault-Tec Security")) {
        expectedMax = 0;
      } else if (doc.system.location.head) {
        expectedMax = 1;
      } else if (doc.system.location.torso) {
        expected = [...allTorso, ...torsoOnly];
      } else if (doc.system.location.armL || doc.system.location.armR) {
        expected = [...allGeneric, ...armsOnly];
      } else if (doc.system.location.legL || doc.system.location.legR) {
        expected = [...allGeneric, ...legsOnly];
      } else {
        assert.fail("Unclassified armor location for " + entry.documentId);
      }
      assert.equal(doc.system.mods.max, expectedMax, language + "/apparel/" + entry.documentId + " mod-slot maximum");
      assert.deepEqual(new Set(actualUpgrades), new Set(expected), language + "/apparel/" + entry.documentId + " accepted Upgrade mods");
    }

    for (const obsoleteId of ["9FlKDaWEsEDXBCMP","hWUuQFc4H82qxPec","lX3JRbJLh0mYyQJd"]) {
      assert.equal(mods.get(obsoleteId)?.system.modType, "material", language + "/apparel-mods/" + obsoleteId + " remains a Synth Material mod");
    }
  }
});

test("Core Power Armor p.137 table is source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 139 && catalog.certifiedThrough.en.sourcePage >= 137);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 140 && catalog.certifiedThrough.fr.sourcePage >= 137);

  const specs = {
    "lp5ZpYjbFhe8IUcx": {en:"Armor Frame",fr:"Châssis d’armure",table:"Armor Frame",loc:"all",p:0,e:0,r:0,hp:0,w:150,c:4500,rarity:4},
    "XCxUCHrYFRdsgCqk": {en:"Raider Helm",fr:"Casque A. A. de pillard",table:"Raider Helm",loc:"head",p:6,e:4,r:7,hp:7,w:14,c:50,rarity:2},
    "qEljKwu1UzA9BoL6": {en:"Raider Chest Piece",fr:"Plastron A. A. de pillard",table:"Raider Chest Piece",loc:"torso",p:8,e:6,r:9,hp:10,w:22,c:100,rarity:2},
    "Fn3CiQjQCfE9IMy4": {en:"Raider Left Arm",fr:"Brassard A. A. de pillard (gauche)",table:"Raider Arm",loc:"armL",p:4,e:3,r:7,hp:7,w:16,c:75,rarity:2},
    "th5iQbnAiLsKzIVV": {en:"Raider Right Arm",fr:"Brassard A. A. de pillard (droit)",table:"Raider Arm",loc:"armR",p:4,e:3,r:7,hp:7,w:16,c:75,rarity:2},
    "JTHWr7cr6HeS2mN5": {en:"Raider Left Leg",fr:"Jambière A. A. de pillard (gauche)",table:"Raider Leg",loc:"legL",p:4,e:3,r:7,hp:7,w:17,c:75,rarity:2},
    "KSd9eiC0XaVlIXkN": {en:"Raider Right Leg",fr:"Jambière A. A. de pillard (droite)",table:"Raider Leg",loc:"legR",p:4,e:3,r:7,hp:7,w:17,c:75,rarity:2},
    "IONsTORca0MOKJgh": {en:"T-45 Helm",fr:"Casque T-45",table:"T-45 Helm",loc:"head",p:6,e:4,r:7,hp:7,w:12,c:60,rarity:2},
    "5T8HTf7E0y1Mu9Zu": {en:"T-45 Chest Piece",fr:"Plastron T-45",table:"T-45 Chest Piece",loc:"torso",p:8,e:7,r:9,hp:14,w:20,c:140,rarity:2},
    "qlSLcOpcqCUgyb8V": {en:"T-45 Left Arm",fr:"Brassard T-45 (gauche)",table:"T-45 Arm",loc:"armL",p:4,e:3,r:7,hp:7,w:15,c:100,rarity:2},
    "KLN1PeBwMBoPhlCd": {en:"T-45 Right Arm",fr:"Brassard T-45 (droit)",table:"T-45 Arm",loc:"armR",p:4,e:3,r:7,hp:7,w:15,c:100,rarity:2},
    "3K2oXJT9AJviSub3": {en:"T-45 Left Leg",fr:"Jambière T-45 (gauche)",table:"T-45 Leg",loc:"legL",p:4,e:3,r:7,hp:7,w:15,c:130,rarity:2},
    "qqDWrw8j82P7DPc9": {en:"T-45 Right Leg",fr:"Jambière T-45 (droite)",table:"T-45 Leg",loc:"legR",p:4,e:3,r:7,hp:7,w:15,c:130,rarity:2},
    "ZhmOXmBcKKxcPEv8": {en:"T-51 Helm",fr:"Casque T-51",table:"T-51 Helm",loc:"head",p:6,e:5,r:7,hp:9,w:12,c:80,rarity:3},
    "BeGAdzye5MeP3kUO": {en:"T-51 Chest Piece",fr:"Plastron T-51",table:"T-51 Chest Piece",loc:"torso",p:8,e:7,r:9,hp:18,w:20,c:180,rarity:3},
    "X9cMnQidJyiDg29B": {en:"T-51 Left Arm",fr:"Brassard T-51 (gauche)",table:"T-51 Arm",loc:"armL",p:5,e:4,r:7,hp:9,w:15,c:130,rarity:3},
    "g3Y0zWDI9VUNoUWK": {en:"T-51 Right Arm",fr:"Brassard T-51 (droit)",table:"T-51 Arm",loc:"armR",p:5,e:4,r:7,hp:9,w:15,c:130,rarity:3},
    "VbocpE9suK7meAfY": {en:"T-51 Left Leg",fr:"Jambière T-51 (gauche)",table:"T-51 Leg",loc:"legL",p:5,e:4,r:7,hp:9,w:15,c:10,rarity:3},
    "YYbLmTtpw4LbcQZP": {en:"T-51 Right Leg",fr:"Jambière T-51 (droite)",table:"T-51 Leg",loc:"legR",p:5,e:4,r:7,hp:9,w:15,c:10,rarity:3},
    "giRILdjCelBn3rjL": {en:"T-60 Helm",fr:"Casque T-60",table:"T-60 Helm",loc:"head",p:7,e:6,r:7,hp:10,w:12,c:130,rarity:4},
    "ctWJbJpYQ9Q30TWc": {en:"T-60 Chest Piece",fr:"Plastron T-60",table:"T-60 Chest Piece",loc:"torso",p:9,e:8,r:9,hp:21,w:20,c:250,rarity:4},
    "z5Qy6X4pCeRPEWUs": {en:"T-60 Left Arm",fr:"Brassard T-60 (gauche)",table:"T-60 Arm",loc:"armL",p:6,e:5,r:7,hp:10,w:15,c:170,rarity:4},
    "VcWcoUmXcFk6rOka": {en:"T-60 Right Arm",fr:"Brassard T-60 (droit)",table:"T-60 Arm",loc:"armR",p:6,e:5,r:7,hp:10,w:15,c:170,rarity:4},
    "jRNRzVKtIkwZ0zN7": {en:"T-60 Left Leg",fr:"Jambière T-60 (gauche)",table:"T-60 Leg",loc:"legL",p:6,e:5,r:7,hp:10,w:15,c:170,rarity:4},
    "zZa8B73OW8EyQoMu": {en:"T-60 Right Leg",fr:"Jambière T-60 (droite)",table:"T-60 Leg",loc:"legR",p:6,e:5,r:7,hp:10,w:15,c:170,rarity:4},
    "NJm96SJKxbdONtKU": {en:"X-01 Helm",fr:"Casque X-01",table:"X-01 Helm",loc:"head",p:8,e:7,r:7,hp:12,w:12,c:140,rarity:5},
    "71Syqx4X35IjLNdc": {en:"X-01 Chest Piece",fr:"Plastron X-01",table:"X-01 Chest Piece",loc:"torso",p:10,e:8,r:9,hp:24,w:20,c:280,rarity:5},
    "XJ3mQc6tGsm9Q12N": {en:"X-01 Left Arm",fr:"Brassard X-01 (gauche)",table:"X-01 Arm",loc:"armL",p:7,e:6,r:7,hp:12,w:15,c:200,rarity:5},
    "82hgjmzTXmd4VdEs": {en:"X-01 Right Arm",fr:"Brassard X-01 (droit)",table:"X-01 Arm",loc:"armR",p:7,e:6,r:7,hp:12,w:15,c:200,rarity:5},
    "jrSZkw346rKVnTfc": {en:"X-01 Left Leg",fr:"Jambière X-01 (gauche)",table:"X-01 Leg",loc:"legL",p:7,e:6,r:7,hp:12,w:15,c:200,rarity:5},
    "jv0C9MAbuq1t9wkX": {en:"X-01 Right Leg",fr:"Jambière X-01 (droite)",table:"X-01 Leg",loc:"legR",p:7,e:6,r:7,hp:12,w:15,c:200,rarity:5}
  };

  const table = catalog.entries.find(entry => entry.page === 137 && entry.type === "table" && entry.sourceName === "Power Armor");
  assert.ok(table);
  assert.equal(table.certification.rowCount, 21);
  assert.equal(table.certification.publishedIdentityCount, 31);
  assert.equal(table.certification.sideSpecificVariantsDerived, true);
  assert.equal(table.certification.errataApplied, true);
  assert.match(table.certification.errataNote, /Weight and Cost columns/);
  assert.match(table.certification.localizationDiscrepancy, /T-45 Leg prints 100 instead of 130/);
  assert.match(table.certification.localizationDiscrepancy, /T-60 Helm\/Chest\/Arm\/Leg/);
  assert.match(table.certification.localizationDiscrepancy, /X-01 Helm\/Chest\/Arm\/Leg/);
  assert.match(table.certification.localizationDiscrepancy, /T-51 Leg cost 10/);

  const p137Items = catalog.entries.filter(entry => entry.page === 137 && entry.pack === "apparel" && entry.status === "verified");
  assert.equal(p137Items.length, Object.keys(specs).length);
  assert.deepEqual(new Set(p137Items.map(entry => entry.documentId)), new Set(Object.keys(specs)));
  for (const entry of p137Items) {
    const spec = specs[entry.documentId];
    assert.equal(entry.sourceName, spec.en);
    assert.equal(entry.localizedNames.fr, spec.fr);
    assert.equal(entry.certification.sourceTableName, spec.table);
    const reviewedLater = entry.documentId === "lp5ZpYjbFhe8IUcx" || ["XCxUCHrYFRdsgCqk","qEljKwu1UzA9BoL6","Fn3CiQjQCfE9IMy4","th5iQbnAiLsKzIVV","JTHWr7cr6HeS2mN5","KSd9eiC0XaVlIXkN","IONsTORca0MOKJgh","5T8HTf7E0y1Mu9Zu","qlSLcOpcqCUgyb8V","KLN1PeBwMBoPhlCd","3K2oXJT9AJviSub3","qqDWrw8j82P7DPc9","ZhmOXmBcKKxcPEv8","BeGAdzye5MeP3kUO","X9cMnQidJyiDg29B","g3Y0zWDI9VUNoUWK","VbocpE9suK7meAfY","YYbLmTtpw4LbcQZP","giRILdjCelBn3rjL","ctWJbJpYQ9Q30TWc","z5Qy6X4pCeRPEWUs","VcWcoUmXcFk6rOka","jRNRzVKtIkwZ0zN7","zZa8B73OW8EyQoMu","NJm96SJKxbdONtKU","71Syqx4X35IjLNdc","XJ3mQc6tGsm9Q12N","82hgjmzTXmd4VdEs","jrSZkw346rKVnTfc","jv0C9MAbuq1t9wkX"].includes(entry.documentId);
    assert.equal(entry.certification.descriptionReviewed, reviewedLater);
    assert.equal(entry.certification.acceptedModsReviewed, reviewedLater);
    assert.equal(entry.certification.apparelType, "powerArmor");
  }

  for (const language of ["en","fr"]) {
    const records = await generatedDocuments(language);
    const apparel = new Map(records.filter(({pack}) => pack === "apparel").map(({document}) => [document._id, document]));
    for (const [id,spec] of Object.entries(specs)) {
      const doc = apparel.get(id);
      assert.ok(doc, language + "/apparel/" + id + " missing");
      const source = doc.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page, 137, language + "/apparel/" + id + " source page");
      assert.equal(source?.errataReviewed, true, language + "/apparel/" + id + " errata review");
      assert.equal(doc.name, spec[language], language + "/apparel/" + id + " name");
      assert.equal(doc.system.apparelType, "powerArmor");
      assert.equal(doc.system.resistance.physical, spec.p);
      assert.equal(doc.system.resistance.energy, spec.e);
      assert.equal(doc.system.resistance.radiation, spec.r);
      assert.equal(doc.system.health.max, spec.hp);
      assert.equal(doc.system.health.value, spec.hp);
      assert.equal(doc.system.weight, language === "en" ? spec.w : spec.w / 2, language + "/apparel/" + id + " weight");
      assert.equal(doc.system.cost, spec.c);
      assert.equal(doc.system.rarity, spec.rarity);

      const loc = doc.system.location;
      for (const key of ["head","torso","armL","armR","legL","legR"]) {
        assert.equal(loc[key], spec.loc === key, language + "/apparel/" + id + " location " + key);
      }
      if (spec.loc === "all") assert.ok(Object.values(loc).every(value => value === false), language + "/apparel/" + id + " frame location representation");
    }
  }

  for (const id of ["VbocpE9suK7meAfY","YYbLmTtpw4LbcQZP"]) {
    const entry = p137Items.find(item => item.documentId === id);
    assert.match(entry.certification.note, /source-exact/);
    assert.equal(entry.certification.cost, 10);
  }
});

test("Core Power Armor p.138 Armor Frame rules are source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 140 && catalog.certifiedThrough.en.sourcePage >= 138);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 141 && catalog.certifiedThrough.fr.sourcePage >= 138);

  const frameEntry = catalog.entries.find(entry => entry.page === 137 && entry.documentId === "lp5ZpYjbFhe8IUcx");
  assert.ok(frameEntry);
  assert.deepEqual(frameEntry.sourcePages.en, [137,138]);
  assert.deepEqual(frameEntry.sourcePages.fr, [137,138]);
  assert.equal(frameEntry.certification.descriptionReviewed, true);
  assert.equal(frameEntry.certification.acceptedModsReviewed, true);
  assert.equal(frameEntry.certification.maxMods, 0);
  assert.equal(frameEntry.certification.frameRulesReviewed, true);
  assert.equal(frameEntry.certification.operation.enterOrLeaveAction, "major");
  assert.equal(frameEntry.certification.operation.fusionCoreChargesPerScene, 1);
  assert.equal(frameEntry.certification.operation.complicationsMayConsumeExtraCharges, true);
  assert.equal(frameEntry.certification.impactLanding.fallDamageIgnored, true);
  assert.equal(frameEntry.certification.impactLanding.damageDice, 3);
  assert.equal(frameEntry.certification.impactLanding.worksUnpowered, true);
  assert.equal(frameEntry.certification.enhancedStrength.strength, 11);
  assert.equal(frameEntry.certification.enhancedStrength.ignoreFrameAndAttachedArmorWeight, true);
  assert.equal(frameEntry.certification.enhancedStrength.requiresPower, true);
  assert.equal(frameEntry.certification.sealedEnvironment.requiresAllLocationsPresent, true);
  assert.equal(frameEntry.certification.sealedEnvironment.requiresNoDamagedComponents, true);
  assert.equal(frameEntry.certification.sealedEnvironment.breathableAtmosphere, true);
  assert.equal(frameEntry.certification.sealedEnvironment.requiresPower, true);
  assert.equal(frameEntry.certification.ablativeResilience.armorPieceTakesPostResistanceDamage, true);
  assert.equal(frameEntry.certification.ablativeResilience.damagedOnCriticalHit5Plus, true);
  assert.equal(frameEntry.certification.ablativeResilience.damagedAtZeroHP, true);
  assert.equal(frameEntry.certification.ablativeResilience.damagedPieceStopsProtecting, true);
  assert.equal(frameEntry.certification.technological.noNaturalHealing, true);
  assert.equal(frameEntry.certification.technological.noStimpaks, true);
  assert.equal(frameEntry.certification.technological.noMedicine, true);
  assert.equal(frameEntry.certification.technological.repairedLikeRobots, true);
  assert.equal(frameEntry.certification.technological.affectedAsMachineOrRobot, true);

  const rule = catalog.entries.find(entry => entry.page === 138 && entry.type === "rule_text" && entry.sourceName === "Armor Frame");
  assert.ok(rule);
  assert.equal(rule.status, "out_of_scope");
  assert.equal(rule.certification.representedByDocumentId, "lp5ZpYjbFhe8IUcx");
  assert.equal(rule.certification.errataReviewed, true);
  assert.match(rule.certification.errataNote, /no p\.138 Armor Frame correction/);

  const descriptions = {
    en: "<p>The standard armor frame is a West Tek powered exoskeleton. It draws power from a back-mounted TX-28 micro-fusion reactor, which is compatible with standard fusion cores (p.94). An armor frame cannot be modded.</p>\n<ul>\n<li><strong>Operation:</strong> Entering or leaving an armor frame requires a major action. The armor consumes a single charge from its fusion core at the end of each scene it is used in. If this would reduce the fusion core to 0 charges, then the frame becomes unpowered. Complications on <strong>Athletics</strong> tests made while operating the Power Armor may result (at the GM&rsquo;s discretion) in extra charges being used, as strenuous activity consumes power more quickly.</li>\n<li><strong>Impact Landing:</strong> A character wearing Power Armor suffers no damage for falling or jumping down any height. In fact, landing from any height higher than a single-story building inflicts 3 @fos[DC] damage to any creatures (or other damageable objects) within Reach of you when you land. This applies even if the armor is unpowered.</li>\n<li><strong>Enhanced Strength:</strong> A character wearing Power Armor uses the armor frame&rsquo;s <strong>STR</strong> of 11 instead of their own, for all purposes (such as skill tests, carry weight, and melee damage bonus). In addition, the weight of the armor frame and any attached armor pieces is not counted towards the wearer&rsquo;s carry weight. These benefits are lost if the armor is unpowered.</li>\n<li><strong>Sealed Environment:</strong> So long as the armor is sealed (it has components for each location, and none of those components are damaged), it provides a breathable atmosphere, allowing the wearer to survive underwater, in toxic gas, or similar inhospitable conditions. This benefit is lost if the armor is unpowered.</li>\n<li><strong>Ablative Resilience:</strong> When a character in Power Armor is attacked or otherwise suffers damage, then the damage is reduced by the damage resistances of the armor piece on that location, and any remaining damage marks off the armor piece&rsquo;s Health points. If an armor piece would suffer a Critical Hit (5+ damage in one hit), or is reduced to 0 HP, then it is <strong>damaged</strong>. Damaged armor pieces no longer provide protection&mdash;hits to that location strike the wearer instead&mdash;using the wearer&rsquo;s damage resistances and HP.</li>\n<li><strong>Technological:</strong> Armor pieces do not regain HP naturally, and cannot be restored using Stimpaks or the <strong>Medicine</strong> skill. They must be repaired, in the same way as robots (p.34). Power Armor is affected by any effect which targets or affects machines or robots.</li>\n</ul>\n<p>&nbsp;</p>",
    fr: "<p>Le châssis d’armure standard est un exosquelette motorisé de West Tek. Il est alimenté par une microcentrale à fusion TX-28 dorsal, compatible avec les réacteurs à fusion standard (voir page 94). Un châssis d’armure ne peut pas recevoir de module.</p>\n<ul>\n<li><strong>Utilisation :</strong> s’installer dans un châssis d’armure ou le quitter nécessite une action capitale. L’armure consomme 1 charge de son réacteur à fusion à la fin de chaque scène lors de laquelle elle est utilisée. Si cela en vient à faire tomber le réacteur à fusion à 0 charge, le châssis n’est plus alimenté en énergie. Si vous obtenez une complication sur un test d’<strong>Athlétisme</strong> effectué pendant que vous utilisez l’armure assistée, l’armure peut (si le MJ le décide) consommer des charges supplémentaires, car une activité physique intense nécessite davantage d’énergie.</li>\n<li><strong>Atterrissage à impact :</strong> un personnage qui porte une armure assistée ne subit pas de dégâts s’il chute ou se laisse tomber, quelle que soit la hauteur. D’ailleurs, lorsque vous atterrissez d’une hauteur supérieure à 3 mètres vous infligez 3 @fos[DC] de dégâts à toute créature (ou autre objet pouvant subir des dégâts) à portée de main au moment de l’impact. Ces dégâts s’appliquent même quand l’armure n’est plus alimentée en énergie.</li>\n<li><strong>Augmentation de Force :</strong> un personnage qui porte une armure assistée utilise la FOR de 11 du châssis d’armure au lieu de la sienne à toutes fins utiles (par exemple les tests de compétence, la charge maximale et le bonus aux dégâts de corps à corps). De plus, le poids du châssis d’armure et de toute pièce d’armure fixée dessus n’est pas comptabilisé pour déterminer si le porteur a ou non atteint sa charge maximale. Ces avantages sont perdus si l’armure n’est plus alimentée en énergie.</li>\n<li><strong>Environnement hermétique :</strong> tant que l’armure est hermétique (c’est-à-dire qu’elle a un composant pour chaque localisation et qu’aucun de ces composants n’est endommagé), elle fournit une atmosphère respirable, ce qui permet au porteur de survivre sous l’eau, dans un nuage de gaz toxique ou dans d’autres conditions normalement dommageables du même genre. Cet avantage est perdu si l’armure n’est plus alimentée en énergie.</li>\n<li><strong>Robustesse ablative :</strong> quand un personnage qui porte une armure assistée est attaqué ou subit des dégâts venant d’une autre source, la résistance aux dégâts appropriée de la pièce d’armure couvrant cette localisation est déduite des dégâts, et les dégâts restants sont déduits des points de vie de la pièce d’armure. Lorsqu’une pièce d’armure devrait subir un coup critique (5 points de dégâts ou plus en un seul coup) ou que ses PV tombent à 0, elle est <strong>endommagée</strong>. Les pièces d’armure endommagées ne fournissent plus de protection, les coups qui touchent cette localisation touchent donc le porteur et concernent les résistances aux dégâts et les PV du porteur.</li>\n<li><strong>Technologique :</strong> les pièces d’armure ne regagnent pas de PV naturellement et ne peuvent pas en regagner avec des Stimpaks ou avec la compétence <strong>Médecine</strong>. Elles doivent être réparées, de la même manière que les robots (voir page 34). Les armures assistées sont touchées par tous les effets qui ciblent ou touchent les machines ou les robots.</li>\n</ul>"
  };

  for (const language of ["en","fr"]) {
    const records = await generatedDocuments(language);
    const frame = records.find(({pack,document}) => pack === "apparel" && document._id === "lp5ZpYjbFhe8IUcx")?.document;
    assert.ok(frame, language + "/apparel/Armor Frame missing");
    assert.equal(frame.system.description, descriptions[language], language + " Armor Frame p.138 description");
    assert.equal(frame.system.apparelType, "powerArmor");
    assert.equal(frame.system.powerArmor.isFrame, true);
    assert.equal(frame.system.mods.max, 0);
    assert.equal(frame.system.mods.current, 0);
    assert.equal(frame.system.mods.modded, false);
    const embedded = Object.entries(frame.system.mods).filter(([,value]) => value && typeof value === "object" && value.system);
    assert.equal(embedded.length, 0, language + " Armor Frame must not expose mods");
  }
});

test("Core Power Armor p.139 Raider family and unique mods are source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 141 && catalog.certifiedThrough.en.sourcePage >= 139);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 142 && catalog.certifiedThrough.fr.sourcePage >= 139);

  const raiderIds = new Set(["XCxUCHrYFRdsgCqk","qEljKwu1UzA9BoL6","Fn3CiQjQCfE9IMy4","th5iQbnAiLsKzIVV","JTHWr7cr6HeS2mN5","KSd9eiC0XaVlIXkN"]);
  const descriptions = {
    en: "<p>Makeshift armor pieces made from scrap metal and salvaged Power Armor parts too damaged to undergo proper repair. Due to the improvised nature of its design, raider Power Armor is relatively weak compared to its fully functional counterparts.</p><p>Each piece of Raider Power Armor can accept two mods: an upgrade mod and a system mod. All Unique Raider Power Upgrade Mods are installed with the Repair Skill.</p><p>Raider Power Armor can make use of all the normal system mods (p.144) except for Tesla Arms, and may also use the following system mod which is installed with the Repair Skill:</p>",
    fr: "<p>Des pièces d’armure artisanales fabriquées à partir de ferraille et de pièces d’armure assistée récupérées après avoir été jetées par le propriétaire d’origine, car trop endommagées pour être réparées correctement. Comme c’est une amure totalement improvisée avec les moyens du bord, l’armure assistée de pillard est relativement faible par rapport aux armures assistées en bon état.</p><p>Chaque pièce d’armure assistée de pillard peut accepter 2 mods, dont l’un est un mod d’amélioration et l’autre un mod de système. Tous les mods d’amélioration réservés à l’armure assistée de pillard s’installent avec la compétence Réparation.</p><p>L’armure assistée de pillard peut utiliser tous les mods de système normaux (voir page 144) sauf les bracelets Tesla, et peut aussi utiliser le mod de système ci-dessous, lequel s’installe avec la compétence Réparation :</p>"
  };

  const specs = {
    "hZZpdrBclyd6MzHk": {en:"Raider II Helm",fr:"Casque Raider II",type:"upgrade",loc:"Head",p:1,e:0,r:0,hp:3,w:1,c:5,perks:"Armorer 1"},
    "4Oo36CKsvvcXj9o6": {en:"Raider II Chest Piece",fr:"Plastron Raider II",type:"upgrade",loc:"Torso",p:1,e:0,r:0,hp:4,w:2,c:10,perks:"Armorer 1"},
    "8ctHjfdxTRHeBlXp": {en:"Raider II Arm",fr:"Brassard Raider II",type:"upgrade",loc:"Arm",p:1,e:0,r:0,hp:3,w:2,c:7,perks:"Armorer 1"},
    "6qONvqbWs9mgnwZ2": {en:"Raider II Leg",fr:"Jambière Raider II",type:"upgrade",loc:"Leg",p:1,e:0,r:0,hp:3,w:2,c:7,perks:"Armorer 1"},
    "R7MSARmaFbVPiunS": {en:"Welded Rebar",fr:"Barre d’armature soudée",type:"system",loc:"Torso",p:0,e:0,r:0,hp:0,w:2,c:25,perks:"Armorer 1",effectEn:"<p>Enemies who attack you with a melee or unarmed attack and suffer a complication suffer 2 @fos[DC] damage</p>",effectFr:"<p>Les ennemis qui vous portent une attaque de corps à corps ou à mains nues et subissent une complication subissent 2 @fos[DC] de dégâts</p>"}
  };

  const p137Raiders = catalog.entries.filter(entry => entry.page === 137 && entry.pack === "apparel" && raiderIds.has(entry.documentId));
  assert.equal(p137Raiders.length, 6);
  for (const entry of p137Raiders) {
    assert.equal(entry.certification.descriptionReviewed, true);
    assert.equal(entry.certification.acceptedModsReviewed, true);
    assert.equal(entry.certification.maxMods, 2);
    assert.equal(entry.certification.upgradeSlots, 1);
    assert.equal(entry.certification.systemSlots, 1);
    assert.equal(entry.certification.platingSlots, 0);
    assert.ok(entry.sourcePages.en.includes(139));
    assert.ok(entry.sourcePages.fr.includes(139));
    assert.match(entry.certification.raiderSystemException, /Tesla/);
  }

  const rule = catalog.entries.find(entry => entry.page === 139 && entry.type === "rule_text" && entry.sourceName === "Raider Power Armor");
  assert.ok(rule);
  assert.equal(rule.certification.maxMods, 2);
  assert.equal(rule.certification.platingSlots, 0);
  assert.equal(rule.certification.teslaArmsExcluded, true);
  assert.equal(rule.certification.normalSystemModsReferencePage, 144);

  const p139Tables = catalog.entries.filter(entry => entry.page === 139 && entry.type === "table");
  assert.deepEqual(p139Tables.map(entry => entry.sourceName).sort(), ["Unique Raider Power Armor System Mod","Unique Raider Power Armor Upgrade Mods"]);
  assert.equal(p139Tables.find(entry => entry.sourceName === "Unique Raider Power Armor Upgrade Mods").certification.rowCount, 4);
  assert.equal(p139Tables.find(entry => entry.sourceName === "Unique Raider Power Armor System Mod").certification.rowCount, 1);

  const p139Mods = catalog.entries.filter(entry => entry.page === 139 && entry.pack === "apparel-mods" && entry.status === "verified");
  assert.equal(p139Mods.length, Object.keys(specs).length);
  assert.deepEqual(new Set(p139Mods.map(entry => entry.documentId)), new Set(Object.keys(specs)));

  const allowedSystems = {
    head: new Set(["2SqnqGHd7D3y4O5E","42Qe82QKBhubp9xU","En57MQ3hn0DkcHJy","zALOB7gLXndAThjj"]),
    torso: new Set(["908vI94cQ4wdtSaI","Fi4sOOvTpfCKlBVS","Fov5IU0CbgDuZUuO","HdcX4nu2ZKYDf9hG","HlZVuMrkMKwSx0gT","JCala9JIwLsgpDig","R7MSARmaFbVPiunS","dCYE8deU6qI7GARe","gCQROCvacrax9ukk","t2wGFT9GqqzS3Qt9","vuySzeWEI174mwLc"]),
    arm: new Set(["ZsGBPsT9kf1lVrFw","cMFQXRN9ZrDIU23Y","zX0aUfac1HnsEvZO"]),
    leg: new Set(["JpGZrBzUJTLieuRJ","RrhtyBPhjtENsF6w","pZ2FIyhKvuL7EPT0"])
  };
  const expectedUpgrade = {
    head:"hZZpdrBclyd6MzHk",
    torso:"4Oo36CKsvvcXj9o6",
    arm:"8ctHjfdxTRHeBlXp",
    leg:"6qONvqbWs9mgnwZ2"
  };

  for (const language of ["en","fr"]) {
    const records = await generatedDocuments(language);
    const apparel = new Map(records.filter(({pack}) => pack === "apparel").map(({document}) => [document._id, document]));
    const mods = new Map(records.filter(({pack}) => pack === "apparel-mods").map(({document}) => [document._id, document]));

    for (const id of raiderIds) {
      const doc = apparel.get(id);
      assert.ok(doc, language + "/apparel/" + id + " missing");
      assert.equal(doc.system.description, descriptions[language], language + "/apparel/" + id + " Raider p.139 description");
      assert.equal(doc.system.mods.max, 2, language + "/apparel/" + id + " max mods");
      const embedded = Object.entries(doc.system.mods).filter(([,value]) => value && typeof value === "object" && value.system);
      assert.equal(embedded.filter(([,value]) => value.system.modType === "plating").length, 0, language + "/apparel/" + id + " must not accept plating");
      assert.ok(!embedded.some(([,value]) => value.name === "Tesla Bracers" || value.name === "Bracelets Tesla"), language + "/apparel/" + id + " must exclude Tesla Arms/Bracers");

      const group = doc.system.location.head ? "head" : doc.system.location.torso ? "torso" : (doc.system.location.armL || doc.system.location.armR) ? "arm" : "leg";
      const systems = new Set(embedded.filter(([,value]) => value.system.modType === "system").map(([mid]) => mid));
      assert.deepEqual(systems, allowedSystems[group], language + "/apparel/" + id + " accepted system mods");
      const upgrades = embedded.filter(([,value]) => value.system.modType === "upgrade");
      assert.equal(upgrades.length, 1, language + "/apparel/" + id + " unique upgrade count");
      assert.equal(upgrades[0][0], expectedUpgrade[group], language + "/apparel/" + id + " unique Raider II identity");
      assert.equal(upgrades[0][1].system.perks, "Armorer 1", language + "/apparel/" + id + " embedded Raider II perk");
      if (group === "torso") assert.equal(doc.system.mods.R7MSARmaFbVPiunS.system.location, "Torso");
    }

    for (const [id,spec] of Object.entries(specs)) {
      const doc = mods.get(id);
      assert.ok(doc, language + "/apparel-mods/" + id + " missing");
      const source = doc.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page, 139, language + "/apparel-mods/" + id + " source page");
      assert.equal(source?.errataReviewed, true, language + "/apparel-mods/" + id + " errata review");
      assert.equal(doc.name, spec[language]);
      assert.equal(doc.system.apparelType, "powerArmor");
      assert.equal(doc.system.modType, spec.type);
      assert.equal(doc.system.location, spec.loc);
      assert.equal(doc.system.resistance.physical, spec.p);
      assert.equal(doc.system.resistance.energy, spec.e);
      assert.equal(doc.system.resistance.radiation, spec.r);
      assert.equal(doc.system.health.value, spec.hp);
      assert.equal(doc.system.weight, language === "en" ? spec.w : spec.w / 2);
      assert.equal(doc.system.cost, spec.c);
      assert.equal(doc.system.perks, spec.perks);
      if (spec.effectEn) assert.equal(doc.system.effect, language === "en" ? spec.effectEn : spec.effectFr);
    }
  }
});

test("Core Power Armor p.140 T-45 family and unique upgrades are source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 142 && catalog.certifiedThrough.en.sourcePage >= 140);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 143 && catalog.certifiedThrough.fr.sourcePage >= 140);

  const t45Ids = new Set(["IONsTORca0MOKJgh","5T8HTf7E0y1Mu9Zu","qlSLcOpcqCUgyb8V","KLN1PeBwMBoPhlCd","3K2oXJT9AJviSub3","qqDWrw8j82P7DPc9"]);
  const descriptions = {
    en: "<p>Developed before the Great War, the T-45 was originally developed and manufactured for the United States Army by American defense contractor, West Tek. The T-45 Power Armor was the first version of Power Armor to be successfully deployed in battle, and as such, it remains relatively common more than 200 years later.</p><p>Each piece of T-45 Power Armor can accept three mods: an upgrade mod, one plating mod, and a system. All Unique T-45 Power Armor Upgrade Mods are installed with the Repair Skill.</p>",
    fr: "<p>Développée avant la Grande Guerre, l’armure T-45 fut à l’origine conçue et fabriquée pour l’armée américaine par l’entreprise de Défense nationale américaine West Tek. L’armure assistée T-45 fut la première version de l’armure assistée à être utilisée avec succès au combat, en tant que telle, elle reste relativement répandue même plus de deux cents ans plus tard.</p><p>Chaque pièce d’armure assistée T-45 peut accepter 3 mods : 1 mod d’amélioration, 1 mod de blindage et 1 mod de système. Tous les mods d’amélioration réservés à l’armure assistée T-45 s’installent avec la compétence Réparation.</p>"
  };

  const specs = {
    "7KURZ8oGIgDt6YxK": {en:"T-45b Helm",fr:"Casque T-45b",loc:"Head",p:0,e:0,r:0,hp:1,w:1,c:3,perks:"Armorer 1"},
    "MYF3miuCrGR3jUjb": {en:"T-45b Chest Piece",fr:"Plastron T-45b",loc:"Torso",p:0,e:0,r:0,hp:1,w:1,c:7,perks:"Armorer 1"},
    "6OY0YUH32cpkcCuH": {en:"T-45b Arm",fr:"Brassard T-45b",loc:"Arm",p:1,e:1,r:0,hp:1,w:1,c:7,perks:"Armorer 1"},
    "AKhF3AMqHuvZ1STc": {en:"T-45b Leg",fr:"Jambière T-45b",loc:"Leg",p:1,e:1,r:0,hp:1,w:1,c:7,perks:"Armorer 1"},
    "qH24ODPdUtNy87vp": {en:"T-45c Helm",fr:"Casque T-45c",loc:"Head",p:1,e:1,r:0,hp:2,w:1,c:6,perks:"Armorer 2"},
    "wLaFI7WPiiBEFiN9": {en:"T-45c Chest Piece",fr:"Plastron T-45c",loc:"Torso",p:0,e:0,r:0,hp:4,w:2,c:14,perks:"Armorer 2"},
    "RR7Vs2f9fJxRK7nq": {en:"T-45c Arm",fr:"Brassard T-45c",loc:"Arm",p:2,e:2,r:0,hp:2,w:2,c:10,perks:"Armorer 2"},
    "gujEG9KDg5dMAUsY": {en:"T-45c Leg",fr:"Jambière T-45c",loc:"Leg",p:2,e:2,r:0,hp:2,w:2,c:10,perks:"Armorer 2"},
    "8Z8lfXud9r26HHkZ": {en:"T-45d Helm",fr:"Casque T-45d",loc:"Head",p:1,e:1,r:0,hp:3,w:2,c:9,perks:"Armorer 2, Science! 1"},
    "G1BevsRBcrOLIkSf": {en:"T-45d Chest Piece",fr:"Plastron T-45d",loc:"Torso",p:1,e:1,r:0,hp:5,w:3,c:21,perks:"Armorer 2, Science! 1"},
    "DtPOAGbxzkA9Ypyj": {en:"T-45d Arm",fr:"Brassard T-45d",loc:"Arm",p:2,e:3,r:0,hp:3,w:2,c:15,perks:"Armorer 2, Science! 1"},
    "qp17f82dYxaR8fGw": {en:"T-45d Leg",fr:"Jambière T-45d",loc:"Leg",p:2,e:3,r:0,hp:3,w:2,c:15,perks:"Armorer 2, Science! 1"},
    "3wSPEqbGcAysqqaq": {en:"T-45e Helm",fr:"Casque T-45e",loc:"Head",p:1,e:2,r:0,hp:3,w:2,c:12,perks:"Armorer 3, Science! 1"},
    "qWlZAyV7iemeqrmU": {en:"T-45e Chest Piece",fr:"Plastron T-45e",loc:"Torso",p:1,e:1,r:0,hp:7,w:4,c:28,perks:"Armorer 3, Science! 1"},
    "Pfh0zvUkSVL49AeL": {en:"T-45e Arm",fr:"Brassard T-45e",loc:"Arm",p:3,e:3,r:0,hp:3,w:3,c:20,perks:"Armorer 3, Science! 1"},
    "27Sls5dfZTAfQIgf": {en:"T-45e Leg",fr:"Jambière T-45e",loc:"Leg",p:3,e:3,r:0,hp:3,w:3,c:20,perks:"Armorer 3, Science! 1"},
    "7B2xH72N9Xpe5HV0": {en:"T-45f Helm",fr:"Casque T-45f",loc:"Head",p:2,e:2,r:0,hp:4,w:3,c:15,perks:"Armorer 3, Science! 2"},
    "j49aEIpiBTjvbGbO": {en:"T-45f Chest Piece",fr:"Plastron T-45f",loc:"Torso",p:1,e:1,r:0,hp:8,w:5,c:35,perks:"Armorer 3, Science! 2"},
    "v6Y7ypBdjXorV8ek": {en:"T-45f Arm",fr:"Brassard T-45f",loc:"Arm",p:3,e:4,r:0,hp:4,w:4,c:25,perks:"Armorer 3, Science! 2"},
    "Xm3NOI9pHqcAOiar": {en:"T-45f Leg",fr:"Jambière T-45f",loc:"Leg",p:3,e:4,r:0,hp:4,w:4,c:25,perks:"Armorer 3, Science! 2"}
  };

  const p137T45 = catalog.entries.filter(entry => entry.page === 137 && entry.pack === "apparel" && t45Ids.has(entry.documentId));
  assert.equal(p137T45.length, 6);
  for (const entry of p137T45) {
    assert.equal(entry.certification.descriptionReviewed, true);
    assert.equal(entry.certification.acceptedModsReviewed, true);
    assert.equal(entry.certification.maxMods, 3);
    assert.equal(entry.certification.upgradeSlots, 1);
    assert.equal(entry.certification.platingSlots, 1);
    assert.equal(entry.certification.systemSlots, 1);
    assert.equal(entry.certification.uniqueUpgradeModsReviewed, true);
    assert.ok(entry.sourcePages.en.includes(140));
    assert.ok(entry.sourcePages.fr.includes(140));
  }

  const rule = catalog.entries.find(entry => entry.page === 140 && entry.type === "rule_text" && entry.sourceName === "T-45 Power Armor");
  assert.ok(rule);
  assert.equal(rule.certification.maxMods, 3);
  assert.equal(rule.certification.upgradeSlots, 1);
  assert.equal(rule.certification.platingSlots, 1);
  assert.equal(rule.certification.systemSlots, 1);
  assert.deepEqual(rule.certification.genericSystemAndPlatingReferencePages, [144,145]);

  const table = catalog.entries.find(entry => entry.page === 140 && entry.type === "table" && entry.sourceName === "Unique T-45 Power Armor Upgrade Mods");
  assert.ok(table);
  assert.equal(table.certification.rowCount, 20);

  const p140Mods = catalog.entries.filter(entry => entry.page === 140 && entry.pack === "apparel-mods" && entry.status === "verified");
  assert.equal(p140Mods.length, Object.keys(specs).length);
  assert.deepEqual(new Set(p140Mods.map(entry => entry.documentId)), new Set(Object.keys(specs)));

  const upgradeIds = {
    head: new Set(["7KURZ8oGIgDt6YxK","qH24ODPdUtNy87vp","8Z8lfXud9r26HHkZ","3wSPEqbGcAysqqaq","7B2xH72N9Xpe5HV0"]),
    torso: new Set(["MYF3miuCrGR3jUjb","wLaFI7WPiiBEFiN9","G1BevsRBcrOLIkSf","qWlZAyV7iemeqrmU","j49aEIpiBTjvbGbO"]),
    arm: new Set(["6OY0YUH32cpkcCuH","RR7Vs2f9fJxRK7nq","DtPOAGbxzkA9Ypyj","Pfh0zvUkSVL49AeL","v6Y7ypBdjXorV8ek"]),
    leg: new Set(["AKhF3AMqHuvZ1STc","gujEG9KDg5dMAUsY","qp17f82dYxaR8fGw","27Sls5dfZTAfQIgf","Xm3NOI9pHqcAOiar"])
  };
  const systemIds = {
    head: new Set(["2SqnqGHd7D3y4O5E","42Qe82QKBhubp9xU","En57MQ3hn0DkcHJy","zALOB7gLXndAThjj"]),
    torso: new Set(["908vI94cQ4wdtSaI","Fi4sOOvTpfCKlBVS","Fov5IU0CbgDuZUuO","HdcX4nu2ZKYDf9hG","HlZVuMrkMKwSx0gT","JCala9JIwLsgpDig","dCYE8deU6qI7GARe","gCQROCvacrax9ukk","t2wGFT9GqqzS3Qt9","vuySzeWEI174mwLc"]),
    arm: new Set(["K63y4mcKxr792XLB","ZsGBPsT9kf1lVrFw","cMFQXRN9ZrDIU23Y","zX0aUfac1HnsEvZO"]),
    leg: new Set(["JpGZrBzUJTLieuRJ","RrhtyBPhjtENsF6w","pZ2FIyhKvuL7EPT0"])
  };
  const platingIds = {
    generic: new Set(["7iRkK1Elj5iRfANw","8fvlLrbWjODf6BCe","DxewSX1ooPKoNPPs","WKklumSE0xUCXFmc","kGts8ZQ6Lr4bkF9M","mgzavWT1TZT1qdoR"]),
    torso: new Set(["7IO8gCf1f2bCK4a0","JAN0jzOhkMyI3U1w","faqvoA7iZx90tXnH","hJDcOKYapml78um8","lqvdGQ6axRjBfNoe","vZs57HCeBc9iOVUR"])
  };

  for (const language of ["en","fr"]) {
    const records = await generatedDocuments(language);
    const apparel = new Map(records.filter(({pack}) => pack === "apparel").map(({document}) => [document._id, document]));
    const mods = new Map(records.filter(({pack}) => pack === "apparel-mods").map(({document}) => [document._id, document]));

    for (const id of t45Ids) {
      const doc = apparel.get(id);
      assert.ok(doc, language + "/apparel/" + id + " missing");
      assert.equal(doc.system.description, descriptions[language], language + "/apparel/" + id + " T-45 p.140 description");
      assert.equal(doc.system.mods.max, 3, language + "/apparel/" + id + " max mods");

      const embedded = Object.entries(doc.system.mods).filter(([,value]) => value && typeof value === "object" && value.system);
      const group = doc.system.location.head ? "head" : doc.system.location.torso ? "torso" : (doc.system.location.armL || doc.system.location.armR) ? "arm" : "leg";
      assert.deepEqual(new Set(embedded.filter(([,value]) => value.system.modType === "upgrade").map(([mid]) => mid)), upgradeIds[group], language + "/apparel/" + id + " T-45 upgrades");
      assert.deepEqual(new Set(embedded.filter(([,value]) => value.system.modType === "system").map(([mid]) => mid)), systemIds[group], language + "/apparel/" + id + " systems");
      assert.deepEqual(new Set(embedded.filter(([,value]) => value.system.modType === "plating").map(([mid]) => mid)), group === "torso" ? platingIds.torso : platingIds.generic, language + "/apparel/" + id + " plating");

      for (const [mid,value] of embedded.filter(([,value]) => value.system.modType === "upgrade")) {
        assert.equal(value.system.perks, specs[mid].perks, language + "/apparel/" + id + " embedded " + mid + " perks");
      }
    }

    for (const [id,spec] of Object.entries(specs)) {
      const doc = mods.get(id);
      assert.ok(doc, language + "/apparel-mods/" + id + " missing");
      const source = doc.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page, 140, language + "/apparel-mods/" + id + " source page");
      assert.equal(source?.errataReviewed, true, language + "/apparel-mods/" + id + " errata review");
      assert.equal(doc.name, spec[language]);
      assert.equal(doc.system.apparelType, "powerArmor");
      assert.equal(doc.system.modType, "upgrade");
      assert.equal(doc.system.location, spec.loc);
      assert.equal(doc.system.resistance.physical, spec.p);
      assert.equal(doc.system.resistance.energy, spec.e);
      assert.equal(doc.system.resistance.radiation, spec.r);
      assert.equal(doc.system.health.value, spec.hp);
      assert.equal(doc.system.weight, language === "en" ? spec.w : spec.w / 2);
      assert.equal(doc.system.cost, spec.c);
      assert.equal(doc.system.perks, spec.perks);
    }
  }
});

test("Core Power Armor p.141 T-51 family and unique upgrades are source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 143 && catalog.certifiedThrough.en.sourcePage >= 141);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 144 && catalog.certifiedThrough.fr.sourcePage >= 141);

  const t51Ids = new Set(["ZhmOXmBcKKxcPEv8","BeGAdzye5MeP3kUO","X9cMnQidJyiDg29B","g3Y0zWDI9VUNoUWK","VbocpE9suK7meAfY","YYbLmTtpw4LbcQZP"]);
  const descriptions = {
    en: "<p>The T-51b was the most advanced Power Armor in wide-scale use before the outbreak of the Great War. First seeing service, and inherently, great success, in the Anchorage Reclamation campaign, the T-51 Power Armor soon became standard issue for the army’s armored infantry regiments. The T-51 was the peak of pre-War Power Armor technology, deployed widely enough that it can still be found centuries later in the wastelands.</p><p>Constructed of a polylaminate composite, the outer shell of T-51 armor is surprisingly lightweight and features an ablative silver alloy coating which refracts and dissipates laser emissions efficiently.</p><p>Each piece of T-51 Power Armor can accept three mods: an upgrade mod, one plating mod, and a system. All Unique T-51 Power Armor Upgrade Mods are installed with the Repair Skill.</p>",
    fr: "<p>L’armure assistée T-51b était le modèle le plus avancé à être utilisé à grande échelle avant le début de la Grande Guerre. Employée pour la première fois, naturellement avec beaucoup de succès, lors de la Réclamation d’Anchorage, l’armure assistée T-51 devint rapidement l’armure standard pour les régiments d’infanterie lourde de l’armée. La T-51 était l’apogée de la technologie d’armure assistée d’avant-guerre, déployée à une échelle suffisamment vaste pour être encore présente plusieurs siècles plus tard dans les Terres désolées.</p><p>Fabriquée à partir d’un composé de polylaminé, la carapace externe d’une armure T-51 est étonnamment légère et intègre un revêtement ablatif dans un alliage d’argent qui réfracte et dissipe efficacement les émissions laser.</p><p>Chaque pièce d’armure assistée T-51 peut accepter 3 mods : 1 mod d’amélioration, 1 mod de blindage et 1 mod de système. Tous les mods d’amélioration réservés à l’armure assistée T-51 s’installent avec la compétence Réparation.</p>"
  };

  const specs = {
    "VL3DtHbWeTyr8Kjb": {en:"T-51b Helm",fr:"Casque T-51b",loc:"Head",p:0,e:0,r:0,hp:1,w:1,c:4,perks:"Armorer 1"},
    "dZdw4Kj5WZ3Y01Lh": {en:"T-51b Chest Piece",fr:"Plastron T-51b",loc:"Torso",p:1,e:0,r:0,hp:1,w:1,c:9,perks:"Armorer 1"},
    "YSEXVlKztyVBQ0f4": {en:"T-51b Arm",fr:"Brassard T-51b",loc:"Arm",p:0,e:0,r:0,hp:1,w:1,c:6,perks:"Armorer 1"},
    "HYslGbiJZcpnqQdh": {en:"T-51b Leg",fr:"Jambière T-51b",loc:"Leg",p:0,e:0,r:0,hp:1,w:1,c:6,perks:"Armorer 1"},
    "ItcCB3lRheDwUokU": {en:"T-51c Helm",fr:"Casque T-51c",loc:"Head",p:0,e:1,r:0,hp:1,w:1,c:8,perks:"Armorer 2"},
    "bGnNLaG7QGVNRLmT": {en:"T-51c Chest Piece",fr:"Plastron T-51c",loc:"Torso",p:1,e:1,r:0,hp:3,w:2,c:18,perks:"Armorer 2"},
    "r1vFai9QqhzIhXiA": {en:"T-51c Arm",fr:"Brassard T-51c",loc:"Arm",p:1,e:1,r:0,hp:1,w:2,c:13,perks:"Armorer 2"},
    "19b26SvJv3xOMCC4": {en:"T-51c Leg",fr:"Jambière T-51c",loc:"Leg",p:1,e:1,r:0,hp:1,w:2,c:13,perks:"Armorer 2"},
    "sX2oKETLQ733d01Z": {en:"T-51d Helm",fr:"Casque T-51d",loc:"Head",p:1,e:1,r:0,hp:2,w:2,c:12,perks:"Armorer 2, Science! 1"},
    "JI5elkyiOp0sq33b": {en:"T-51d Chest Piece",fr:"Plastron T-51d",loc:"Torso",p:1,e:1,r:0,hp:4,w:3,c:27,perks:"Armorer 2, Science! 1"},
    "WQ9FY8kJaZyYOshD": {en:"T-51d Arm",fr:"Brassard T-51d",loc:"Arm",p:1,e:1,r:0,hp:2,w:2,c:19,perks:"Armorer 2, Science! 1"},
    "vSd1iRQkY71KJirx": {en:"T-51d Leg",fr:"Jambière T-51d",loc:"Leg",p:1,e:1,r:0,hp:2,w:2,c:19,perks:"Armorer 2, Science! 1"},
    "owac6l9MM0H8RoLF": {en:"T-51e Helm",fr:"Casque T-51e",loc:"Head",p:1,e:1,r:0,hp:3,w:2,c:16,perks:"Armorer 3, Science! 1"},
    "RsBNLi8xBR14JKwj": {en:"T-51e Chest Piece",fr:"Plastron T-51e",loc:"Torso",p:2,e:1,r:0,hp:6,w:4,c:36,perks:"Armorer 3, Science! 1"},
    "EGyC3Cs5bYfGmIbh": {en:"T-51e Arm",fr:"Brassard T-51e",loc:"Arm",p:1,e:2,r:0,hp:3,w:3,c:26,perks:"Armorer 3, Science! 1"},
    "LBXtsM7QHqmo4gnH": {en:"T-51e Leg",fr:"Jambière T-51e",loc:"Leg",p:1,e:2,r:0,hp:3,w:3,c:26,perks:"Armorer 3, Science! 1"},
    "i9dDeSF3mXAeJgEZ": {en:"T-51f Helm",fr:"Casque T-51f",loc:"Head",p:1,e:2,r:0,hp:3,w:3,c:20,perks:"Armorer 3, Science! 2"},
    "5b56DVzDm2X2ueX4": {en:"T-51f Chest Piece",fr:"Plastron T-51f",loc:"Torso",p:2,e:2,r:0,hp:7,w:5,c:45,perks:"Armorer 3, Science! 2"},
    "i4FIoiiBSSxvToiZ": {en:"T-51f Arm",fr:"Brassard T-51f",loc:"Arm",p:2,e:2,r:0,hp:3,w:4,c:32,perks:"Armorer 3, Science! 2"},
    "bCszZlE3SxSa2e1G": {en:"T-51f Leg",fr:"Jambière T-51f",loc:"Leg",p:2,e:2,r:0,hp:3,w:4,c:32,perks:"Armorer 3, Science! 2"}
  };

  const p137T51 = catalog.entries.filter(entry => entry.page === 137 && entry.pack === "apparel" && t51Ids.has(entry.documentId));
  assert.equal(p137T51.length, 6);
  for (const entry of p137T51) {
    assert.equal(entry.certification.descriptionReviewed, true);
    assert.equal(entry.certification.acceptedModsReviewed, true);
    assert.equal(entry.certification.maxMods, 3);
    assert.equal(entry.certification.upgradeSlots, 1);
    assert.equal(entry.certification.platingSlots, 1);
    assert.equal(entry.certification.systemSlots, 1);
    assert.equal(entry.certification.uniqueUpgradeModsReviewed, true);
    assert.ok(entry.sourcePages.en.includes(141));
    assert.ok(entry.sourcePages.fr.includes(141));
  }

  const rule = catalog.entries.find(entry => entry.page === 141 && entry.type === "rule_text" && entry.sourceName === "T-51 Power Armor");
  assert.ok(rule);
  assert.equal(rule.certification.maxMods, 3);
  assert.equal(rule.certification.upgradeSlots, 1);
  assert.equal(rule.certification.platingSlots, 1);
  assert.equal(rule.certification.systemSlots, 1);
  assert.deepEqual(rule.certification.genericSystemAndPlatingReferencePages, [144,145]);

  const table = catalog.entries.find(entry => entry.page === 141 && entry.type === "table" && entry.sourceName === "Unique T-51 Power Armor Upgrade Mods");
  assert.ok(table);
  assert.equal(table.certification.rowCount, 20);
  assert.match(table.certification.errataNote, /no Core p\.141 T-51 Power Armor correction/);

  const p141Mods = catalog.entries.filter(entry => entry.page === 141 && entry.pack === "apparel-mods" && entry.status === "verified");
  assert.equal(p141Mods.length, Object.keys(specs).length);
  assert.deepEqual(new Set(p141Mods.map(entry => entry.documentId)), new Set(Object.keys(specs)));

  const upgradeIds = {
    head: new Set(["VL3DtHbWeTyr8Kjb","ItcCB3lRheDwUokU","sX2oKETLQ733d01Z","owac6l9MM0H8RoLF","i9dDeSF3mXAeJgEZ"]),
    torso: new Set(["dZdw4Kj5WZ3Y01Lh","bGnNLaG7QGVNRLmT","JI5elkyiOp0sq33b","RsBNLi8xBR14JKwj","5b56DVzDm2X2ueX4"]),
    arm: new Set(["YSEXVlKztyVBQ0f4","r1vFai9QqhzIhXiA","WQ9FY8kJaZyYOshD","EGyC3Cs5bYfGmIbh","i4FIoiiBSSxvToiZ"]),
    leg: new Set(["HYslGbiJZcpnqQdh","19b26SvJv3xOMCC4","vSd1iRQkY71KJirx","LBXtsM7QHqmo4gnH","bCszZlE3SxSa2e1G"])
  };
  const systemIds = {
    head: new Set(["2SqnqGHd7D3y4O5E","42Qe82QKBhubp9xU","En57MQ3hn0DkcHJy","zALOB7gLXndAThjj"]),
    torso: new Set(["908vI94cQ4wdtSaI","Fi4sOOvTpfCKlBVS","Fov5IU0CbgDuZUuO","HdcX4nu2ZKYDf9hG","HlZVuMrkMKwSx0gT","JCala9JIwLsgpDig","dCYE8deU6qI7GARe","gCQROCvacrax9ukk","t2wGFT9GqqzS3Qt9","vuySzeWEI174mwLc"]),
    arm: new Set(["K63y4mcKxr792XLB","ZsGBPsT9kf1lVrFw","cMFQXRN9ZrDIU23Y","zX0aUfac1HnsEvZO"]),
    leg: new Set(["JpGZrBzUJTLieuRJ","RrhtyBPhjtENsF6w","pZ2FIyhKvuL7EPT0"])
  };
  const platingIds = {
    generic: new Set(["7iRkK1Elj5iRfANw","8fvlLrbWjODf6BCe","DxewSX1ooPKoNPPs","WKklumSE0xUCXFmc","kGts8ZQ6Lr4bkF9M","mgzavWT1TZT1qdoR"]),
    torso: new Set(["7IO8gCf1f2bCK4a0","JAN0jzOhkMyI3U1w","faqvoA7iZx90tXnH","hJDcOKYapml78um8","lqvdGQ6axRjBfNoe","vZs57HCeBc9iOVUR"])
  };

  for (const language of ["en","fr"]) {
    const records = await generatedDocuments(language);
    const apparel = new Map(records.filter(({pack}) => pack === "apparel").map(({document}) => [document._id, document]));
    const mods = new Map(records.filter(({pack}) => pack === "apparel-mods").map(({document}) => [document._id, document]));

    for (const id of t51Ids) {
      const doc = apparel.get(id);
      assert.ok(doc, language + "/apparel/" + id + " missing");
      assert.equal(doc.system.description, descriptions[language], language + "/apparel/" + id + " T-51 p.141 description");
      assert.equal(doc.system.mods.max, 3, language + "/apparel/" + id + " max mods");

      const embedded = Object.entries(doc.system.mods).filter(([,value]) => value && typeof value === "object" && value.system);
      const group = doc.system.location.head ? "head" : doc.system.location.torso ? "torso" : (doc.system.location.armL || doc.system.location.armR) ? "arm" : "leg";
      assert.deepEqual(new Set(embedded.filter(([,value]) => value.system.modType === "upgrade").map(([mid]) => mid)), upgradeIds[group], language + "/apparel/" + id + " T-51 upgrades");
      assert.deepEqual(new Set(embedded.filter(([,value]) => value.system.modType === "system").map(([mid]) => mid)), systemIds[group], language + "/apparel/" + id + " systems");
      assert.deepEqual(new Set(embedded.filter(([,value]) => value.system.modType === "plating").map(([mid]) => mid)), group === "torso" ? platingIds.torso : platingIds.generic, language + "/apparel/" + id + " plating");

      for (const [mid,value] of embedded.filter(([,value]) => value.system.modType === "upgrade")) {
        assert.equal(value.system.perks, specs[mid].perks, language + "/apparel/" + id + " embedded " + mid + " perks");
      }
    }

    for (const [id,spec] of Object.entries(specs)) {
      const doc = mods.get(id);
      assert.ok(doc, language + "/apparel-mods/" + id + " missing");
      const source = doc.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page, 141, language + "/apparel-mods/" + id + " source page");
      assert.equal(source?.errataReviewed, true, language + "/apparel-mods/" + id + " errata review");
      assert.equal(doc.name, spec[language]);
      assert.equal(doc.system.apparelType, "powerArmor");
      assert.equal(doc.system.modType, "upgrade");
      assert.equal(doc.system.location, spec.loc);
      assert.equal(doc.system.resistance.physical, spec.p);
      assert.equal(doc.system.resistance.energy, spec.e);
      assert.equal(doc.system.resistance.radiation, spec.r);
      assert.equal(doc.system.health.value, spec.hp);
      assert.equal(doc.system.weight, language === "en" ? spec.w : spec.w / 2);
      assert.equal(doc.system.cost, spec.c);
      assert.equal(doc.system.perks, spec.perks);
    }
  }
});

test("Core Power Armor p.142 T-60 family and unique upgrades are source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 144 && catalog.certifiedThrough.en.sourcePage >= 142);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 145 && catalog.certifiedThrough.fr.sourcePage >= 142);

  const t60Ids = new Set(["giRILdjCelBn3rjL","ctWJbJpYQ9Q30TWc","z5Qy6X4pCeRPEWUs","VcWcoUmXcFk6rOka","jRNRzVKtIkwZ0zN7","zZa8B73OW8EyQoMu"]);
  const descriptions = {
    en: "<p>Developed shortly after the U.S. Army’s victory in Anchorage, the T-60 series of Power Armor was designed as the next generation of armor to replace the T-51. It was in the process of being issued to U.S. Army units serving domestically when the bombs dropped, meaning that large quantities were still in storage awaiting deployment. As a result, stockpiles of the armor have been claimed by the Brotherhood of Steel, and Brotherhood soldiers in T-60 armor has become an iconic feature of their presence in a region.</p><p>Each piece of T-60 Power Armor can accept three mods: an upgrade mod, one plating mod, and a system. All Unique T-60 Power Armor Upgrade Mods are installed with the Repair Skill.</p>",
    fr: "<p>Développée peu après la victoire de l’armée des États-Unis à Anchorage, la série T-60 d’armures assistées fut conçue comme la prochaine génération d’armures censée remplacer la série T-51. Elle était en cours de distribution aux unités de l’armée américaine en service à l’intérieur du pays lorsque les bombes tombèrent, ce qui signifie que de grandes quantités étaient encore en stock en attendant le déploiement. En conséquence, la Confrérie de l’Acier a récupéré de gros stocks de ce modèle d’armure assistée et les soldats de la Confrérie en armure T-60 sont devenus la marque clairement reconnaissable de sa présence dans une région donnée.</p><p>Chaque pièce d’armure assistée T-60 peut accepter 3 mods : 1 mod d’amélioration, 1 mod de blindage et 1 mod de système. Tous les mods d’amélioration réservés à l’armure assistée T-60 s’installent avec la compétence Réparation.</p>"
  };

  const specs = {
    "GZr9XRGzDiWvXMla": {en:"T-60b Helm",fr:"Casque T-60b",loc:"Head",p:1,e:1,r:0,hp:1,w:1,c:32,perks:""},
    "xwgy9oa25Drcpk1w": {en:"T-60b Chest Piece",fr:"Plastron T-60b",loc:"Torso",p:0,e:0,r:0,hp:2,w:1,c:37,perks:""},
    "SnqbemTKEDFKEwi7": {en:"T-60b Arm",fr:"Brassard T-60b",loc:"Arm",p:1,e:1,r:0,hp:1,w:1,c:35,perks:""},
    "WBODl13DtVwIr7KL": {en:"T-60b Leg",fr:"Jambière T-60b",loc:"Leg",p:1,e:1,r:0,hp:1,w:1,c:35,perks:""},
    "EoYPJPrpfi9ZRDy5": {en:"T-60c Helm",fr:"Casque T-60c",loc:"Head",p:1,e:1,r:0,hp:2,w:3,c:64,perks:"Armorer 1, Science! 1"},
    "vHVe3ysJaNtHLOTS": {en:"T-60c Chest Piece",fr:"Plastron T-60c",loc:"Torso",p:1,e:0,r:0,hp:3,w:2,c:74,perks:"Armorer 1, Science! 1"},
    "dVYTLN7YCoy2g97C": {en:"T-60c Arm",fr:"Brassard T-60c",loc:"Arm",p:1,e:1,r:0,hp:2,w:2,c:70,perks:"Armorer 1, Science! 1"},
    "nbeJXBz0LccZvmJP": {en:"T-60c Leg",fr:"Jambière T-60c",loc:"Leg",p:1,e:1,r:0,hp:2,w:2,c:70,perks:"Armorer 1, Science! 1"},
    "x0fAswh4AE8aeWJW": {en:"T-60d Helm",fr:"Casque T-60d",loc:"Head",p:1,e:2,r:0,hp:2,w:2,c:96,perks:"Armorer 2, Science! 1"},
    "LXuDtTGg54qdcwsX": {en:"T-60d Chest Piece",fr:"Plastron T-60d",loc:"Torso",p:1,e:1,r:0,hp:5,w:3,c:111,perks:"Armorer 2, Science! 1"},
    "YcGcdWoYlrPMOXHP": {en:"T-60d Arm",fr:"Brassard T-60d",loc:"Arm",p:1,e:2,r:0,hp:2,w:2,c:105,perks:"Armorer 2, Science! 1"},
    "igmcUhE1lEq2NPcP": {en:"T-60d Leg",fr:"Jambière T-60d",loc:"Leg",p:1,e:2,r:0,hp:2,w:2,c:105,perks:"Armorer 2, Science! 1"},
    "FheuMFwO0W6c9nGf": {en:"T-60e Helm",fr:"Casque T-60e",loc:"Head",p:2,e:2,r:0,hp:3,w:2,c:128,perks:"Armorer 3, Science! 1"},
    "jDw4c8ElBglnHYHP": {en:"T-60e Chest Piece",fr:"Plastron T-60e",loc:"Torso",p:1,e:1,r:0,hp:7,w:4,c:148,perks:"Armorer 3, Science! 1"},
    "8CQVJWspeg2CQmHI": {en:"T-60e Arm",fr:"Brassard T-60e",loc:"Arm",p:2,e:2,r:0,hp:3,w:3,c:140,perks:"Armorer 3, Science! 1"},
    "ZiNEsPVsZJflvKVh": {en:"T-60e Leg",fr:"Jambière T-60e",loc:"Leg",p:2,e:2,r:0,hp:3,w:3,c:140,perks:"Armorer 3, Science! 1"},
    "iiIFQHQgzaPihtGA": {en:"T-60f Helm",fr:"Casque T-60f",loc:"Head",p:2,e:3,r:0,hp:4,w:3,c:160,perks:"Armorer 3, Science! 2"},
    "uQYF58G4PuexOVGS": {en:"T-60f Chest Piece",fr:"Plastron T-60f",loc:"Torso",p:2,e:1,r:0,hp:8,w:5,c:185,perks:"Armorer 3, Science! 2"},
    "hqDB2ZzF92HmuN64": {en:"T-60f Arm",fr:"Brassard T-60f",loc:"Arm",p:2,e:3,r:0,hp:4,w:4,c:175,perks:"Armorer 3, Science! 2"},
    "eP0k4kn5PUwNE7OE": {en:"T-60f Leg",fr:"Jambière T-60f",loc:"Leg",p:2,e:3,r:0,hp:4,w:4,c:175,perks:"Armorer 3, Science! 2"}
  };

  const p137T60 = catalog.entries.filter(entry => entry.page === 137 && entry.pack === "apparel" && t60Ids.has(entry.documentId));
  assert.equal(p137T60.length, 6);
  for (const entry of p137T60) {
    assert.equal(entry.certification.descriptionReviewed, true);
    assert.equal(entry.certification.acceptedModsReviewed, true);
    assert.equal(entry.certification.maxMods, 3);
    assert.equal(entry.certification.upgradeSlots, 1);
    assert.equal(entry.certification.platingSlots, 1);
    assert.equal(entry.certification.systemSlots, 1);
    assert.equal(entry.certification.uniqueUpgradeModsReviewed, true);
    assert.ok(entry.sourcePages.en.includes(142));
    assert.ok(entry.sourcePages.fr.includes(142));
  }

  const rule = catalog.entries.find(entry => entry.page === 142 && entry.type === "rule_text" && entry.sourceName === "T-60 Power Armor");
  assert.ok(rule);
  assert.equal(rule.certification.maxMods, 3);
  assert.deepEqual(rule.certification.genericSystemAndPlatingReferencePages, [144,145]);

  const table = catalog.entries.find(entry => entry.page === 142 && entry.type === "table" && entry.sourceName === "Unique T-60 Power Armor Upgrade Mods");
  assert.ok(table);
  assert.equal(table.certification.rowCount, 20);
  assert.match(table.certification.errataNote, /p\.137 corrected T-60 base-piece costs/);

  const p142Mods = catalog.entries.filter(entry => entry.page === 142 && entry.pack === "apparel-mods" && entry.status === "verified");
  assert.equal(p142Mods.length, Object.keys(specs).length);
  assert.deepEqual(new Set(p142Mods.map(entry => entry.documentId)), new Set(Object.keys(specs)));

  const upgradeIds = {
    head: new Set(["GZr9XRGzDiWvXMla","EoYPJPrpfi9ZRDy5","x0fAswh4AE8aeWJW","FheuMFwO0W6c9nGf","iiIFQHQgzaPihtGA"]),
    torso: new Set(["xwgy9oa25Drcpk1w","vHVe3ysJaNtHLOTS","LXuDtTGg54qdcwsX","jDw4c8ElBglnHYHP","uQYF58G4PuexOVGS"]),
    arm: new Set(["SnqbemTKEDFKEwi7","dVYTLN7YCoy2g97C","YcGcdWoYlrPMOXHP","8CQVJWspeg2CQmHI","hqDB2ZzF92HmuN64"]),
    leg: new Set(["WBODl13DtVwIr7KL","nbeJXBz0LccZvmJP","igmcUhE1lEq2NPcP","ZiNEsPVsZJflvKVh","eP0k4kn5PUwNE7OE"])
  };
  const systemIds = {
    head: new Set(["2SqnqGHd7D3y4O5E","42Qe82QKBhubp9xU","En57MQ3hn0DkcHJy","zALOB7gLXndAThjj"]),
    torso: new Set(["908vI94cQ4wdtSaI","Fi4sOOvTpfCKlBVS","Fov5IU0CbgDuZUuO","HdcX4nu2ZKYDf9hG","HlZVuMrkMKwSx0gT","JCala9JIwLsgpDig","dCYE8deU6qI7GARe","gCQROCvacrax9ukk","t2wGFT9GqqzS3Qt9","vuySzeWEI174mwLc"]),
    arm: new Set(["K63y4mcKxr792XLB","ZsGBPsT9kf1lVrFw","cMFQXRN9ZrDIU23Y","zX0aUfac1HnsEvZO"]),
    leg: new Set(["JpGZrBzUJTLieuRJ","RrhtyBPhjtENsF6w","pZ2FIyhKvuL7EPT0"])
  };
  const platingIds = {
    generic: new Set(["7iRkK1Elj5iRfANw","8fvlLrbWjODf6BCe","DxewSX1ooPKoNPPs","WKklumSE0xUCXFmc","kGts8ZQ6Lr4bkF9M","mgzavWT1TZT1qdoR"]),
    torso: new Set(["7IO8gCf1f2bCK4a0","JAN0jzOhkMyI3U1w","faqvoA7iZx90tXnH","hJDcOKYapml78um8","lqvdGQ6axRjBfNoe","vZs57HCeBc9iOVUR"])
  };

  for (const language of ["en","fr"]) {
    const records = await generatedDocuments(language);
    const apparel = new Map(records.filter(({pack}) => pack === "apparel").map(({document}) => [document._id, document]));
    const mods = new Map(records.filter(({pack}) => pack === "apparel-mods").map(({document}) => [document._id, document]));

    for (const id of t60Ids) {
      const doc = apparel.get(id);
      assert.ok(doc, language + "/apparel/" + id + " missing");
      assert.equal(doc.system.description, descriptions[language], language + "/apparel/" + id + " T-60 p.142 description");
      assert.equal(doc.system.mods.max, 3, language + "/apparel/" + id + " max mods");

      const embedded = Object.entries(doc.system.mods).filter(([,value]) => value && typeof value === "object" && value.system);
      const group = doc.system.location.head ? "head" : doc.system.location.torso ? "torso" : (doc.system.location.armL || doc.system.location.armR) ? "arm" : "leg";
      assert.deepEqual(new Set(embedded.filter(([,value]) => value.system.modType === "upgrade").map(([mid]) => mid)), upgradeIds[group], language + "/apparel/" + id + " T-60 upgrades");
      assert.deepEqual(new Set(embedded.filter(([,value]) => value.system.modType === "system").map(([mid]) => mid)), systemIds[group], language + "/apparel/" + id + " systems");
      assert.deepEqual(new Set(embedded.filter(([,value]) => value.system.modType === "plating").map(([mid]) => mid)), group === "torso" ? platingIds.torso : platingIds.generic, language + "/apparel/" + id + " plating");

      for (const [mid,value] of embedded.filter(([,value]) => value.system.modType === "upgrade")) {
        assert.equal(value.system.perks, specs[mid].perks, language + "/apparel/" + id + " embedded " + mid + " perks");
      }
    }

    for (const [id,spec] of Object.entries(specs)) {
      const doc = mods.get(id);
      assert.ok(doc, language + "/apparel-mods/" + id + " missing");
      const source = doc.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page, 142, language + "/apparel-mods/" + id + " source page");
      assert.equal(source?.errataReviewed, true, language + "/apparel-mods/" + id + " errata review");
      assert.equal(doc.name, spec[language]);
      assert.equal(doc.system.apparelType, "powerArmor");
      assert.equal(doc.system.modType, "upgrade");
      assert.equal(doc.system.location, spec.loc);
      assert.equal(doc.system.resistance.physical, spec.p);
      assert.equal(doc.system.resistance.energy, spec.e);
      assert.equal(doc.system.resistance.radiation, spec.r);
      assert.equal(doc.system.health.value, spec.hp);
      assert.equal(doc.system.weight, language === "en" ? spec.w : spec.w / 2);
      assert.equal(doc.system.cost, spec.c);
      assert.equal(doc.system.perks, spec.perks);
    }
  }
});

test("Core Power Armor p.143 X-01 family and unique mods are source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 145 && catalog.certifiedThrough.en.sourcePage >= 143);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 146 && catalog.certifiedThrough.fr.sourcePage >= 143);

  const x01Ids = new Set(["NJm96SJKxbdONtKU","71Syqx4X35IjLNdc","XJ3mQc6tGsm9Q12N","82hgjmzTXmd4VdEs","jrSZkw346rKVnTfc","jv0C9MAbuq1t9wkX"]);
  const descriptions = {
    en: "<p>Developed shortly before the bombs fell, the X-01 series of Power Armor was still in the prototype stages at the end of the Great War. Work was completed by remnants of the U.S. military after the bombs dropped. It offers superior protection to earlier models of Power Armor, but it has never been manufactured in large quantities, making it especially rare.</p><p>Each piece of X-01 Power Armor can accept three mods: an upgrade mod, one plating mod, and a system. All Unique X-01 Power Armor Upgrade Mods are installed with the Repair Skill.</p><p>X-01 Power Armor can make use of all the normal system mods (p.144) and all the normal plating mods apart from Winterized, and may also use the following plating mod, which is installed with the Repair skill:</p>",
    fr: "<p>Développée peu avant la chute des bombes, la série X-01 d’armures assistées en était encore au stade de prototype à la fin de la Grande Guerre. Le travail fut achevé par ce qui restait de l’armée des États-Unis après l’explosion des engins nucléaires. Cette armure offre une protection supérieure à celle des modèles d’armure assistée antérieurs, mais n’a jamais été fabriquée en grandes quantités, ce qui la rend particulièrement rare.</p><p>Chaque pièce d’armure assistée X-01 peut accepter 3 mods : 1 mod d’amélioration, 1 mod de blindage et 1 mod de système. Tous les mods d’amélioration réservés à l’armure assistée X-01 s’installent avec la compétence Réparation.</p><p>L’armure assistée X-01 peut utiliser tous les mods de système normaux (voir page 144) et tous les mods de blindage normaux sauf Revêtement antigel. Elle peut aussi utiliser le mod de blindage ci-dessous, lequel s’installe avec la compétence Réparation :</p>"
  };

  const specs = {
    "qIO7j6PYi4ocPi9h": {en:"Mk II Helm",fr:"Casque Mk II",loc:"Head",type:"upgrade",p:0,e:0,r:0,hp:1,w:1,c:7,perks:""},
    "f2TJFwW2vfMqrmAY": {en:"Mk II Chest Piece",fr:"Plastron Mk II",loc:"Torso",type:"upgrade",p:0,e:0,r:0,hp:1,w:1,c:14,perks:""},
    "qwU5VY4f3vsx4i6z": {en:"Mk II Arm",fr:"Brassard Mk II",loc:"Arm",type:"upgrade",p:1,e:1,r:0,hp:0,w:1,c:10,perks:""},
    "suU2pnzcO5KYUF9N": {en:"Mk II Leg",fr:"Jambière Mk II",loc:"Leg",type:"upgrade",p:1,e:1,r:0,hp:0,w:1,c:10,perks:""},
    "jQN0cvQRoPLzNwi5": {en:"Mk III Helm",fr:"Casque Mk III",loc:"Head",type:"upgrade",p:1,e:0,r:0,hp:1,w:1,c:14,perks:"Armorer 1, Science! 1"},
    "4S9R2wqowQKgJ3q5": {en:"Mk III Chest Piece",fr:"Plastron Mk III",loc:"Torso",type:"upgrade",p:0,e:1,r:0,hp:2,w:2,c:28,perks:"Armorer 1, Science! 1"},
    "YswtxgeapixbJdL6": {en:"Mk III Arm",fr:"Brassard Mk III",loc:"Arm",type:"upgrade",p:1,e:1,r:0,hp:1,w:2,c:20,perks:"Armorer 1, Science! 1"},
    "YsLy9bVbtP056YN7": {en:"Mk III Leg",fr:"Jambière Mk III",loc:"Leg",type:"upgrade",p:1,e:1,r:0,hp:1,w:2,c:20,perks:"Armorer 1, Science! 1"},
    "20FKglk8LkB8A1c0": {en:"Mk IV Helm",fr:"Casque Mk IV",loc:"Head",type:"upgrade",p:1,e:1,r:0,hp:2,w:2,c:21,perks:"Armorer 2, Science! 1"},
    "PCloS69pzVlT1gUM": {en:"Mk IV Chest Piece",fr:"Plastron Mk IV",loc:"Torso",type:"upgrade",p:1,e:1,r:0,hp:3,w:3,c:42,perks:"Armorer 2, Science! 1"},
    "R6Z0Qp7iPfeZr0lp": {en:"Mk IV Arm",fr:"Brassard Mk IV",loc:"Arm",type:"upgrade",p:1,e:1,r:0,hp:2,w:2,c:30,perks:"Armorer 2, Science! 1"},
    "LQGTYf4MpGnQ8bi7": {en:"Mk IV Leg",fr:"Jambière Mk IV",loc:"Leg",type:"upgrade",p:1,e:1,r:0,hp:2,w:2,c:30,perks:"Armorer 2, Science! 1"},
    "Su9jHSoBdvTPSMD8": {en:"Mk V Helm",fr:"Casque Mk V",loc:"Head",type:"upgrade",p:2,e:1,r:0,hp:2,w:2,c:28,perks:"Armorer 3, Science! 1"},
    "kcEI3V2j23v89jGT": {en:"Mk V Chest Piece",fr:"Plastron Mk V",loc:"Torso",type:"upgrade",p:1,e:2,r:0,hp:4,w:4,c:56,perks:"Armorer 3, Science! 1"},
    "ae5urfGJTUVqw7C6": {en:"Mk V Arm",fr:"Brassard Mk V",loc:"Arm",type:"upgrade",p:2,e:2,r:0,hp:2,w:3,c:40,perks:"Armorer 3, Science! 1"},
    "nrkgX6ccemqUDUb1": {en:"Mk V Leg",fr:"Jambière Mk V",loc:"Leg",type:"upgrade",p:2,e:2,r:0,hp:2,w:3,c:40,perks:"Armorer 3, Science! 1"},
    "Aqhxp38UDkBJ1EJ0": {en:"Mk VI Helm",fr:"Casque Mk VI",loc:"Head",type:"upgrade",p:2,e:2,r:0,hp:3,w:3,c:35,perks:"Armorer 3, Science! 2"},
    "1QSjzncDxrx59OUf": {en:"Mk VI Chest Piece",fr:"Plastron Mk VI",loc:"Torso",type:"upgrade",p:2,e:2,r:0,hp:5,w:5,c:70,perks:"Armorer 3, Science! 2"},
    "VWq6f7jz0J0TRGUS": {en:"Mk VI Arm",fr:"Brassard Mk VI",loc:"Arm",type:"upgrade",p:2,e:3,r:0,hp:4,w:4,c:50,perks:"Armorer 3, Science! 2"},
    "zt3R2qkvtmgV3WLH": {en:"Mk VI Leg",fr:"Jambière Mk VI",loc:"Leg",type:"upgrade",p:2,e:3,r:0,hp:4,w:4,c:50,perks:"Armorer 3, Science! 2"},
    "143I7SjRcQBq9sht": {en:"EMP Shielding",fr:"Protection IEM",loc:"Helm, Arms, Legs",type:"plating",p:0,e:2,r:0,hp:0,w:1,c:20,perks:"Armorer 1"},
    "9WnVnLYY7epjkydJ": {en:"EMP Shielding (Torso)",fr:"Protection IEM (Torse)",loc:"Torso",type:"plating",p:0,e:2,r:0,hp:0,w:2,c:40,perks:"Armorer 1"}
  };

  const p137X01 = catalog.entries.filter(entry => entry.page === 137 && entry.pack === "apparel" && x01Ids.has(entry.documentId));
  assert.equal(p137X01.length, 6);
  for (const entry of p137X01) {
    assert.equal(entry.certification.descriptionReviewed, true);
    assert.equal(entry.certification.acceptedModsReviewed, true);
    assert.equal(entry.certification.maxMods, 3);
    assert.equal(entry.certification.upgradeSlots, 1);
    assert.equal(entry.certification.platingSlots, 1);
    assert.equal(entry.certification.systemSlots, 1);
    assert.equal(entry.certification.winterizedPlatingExcluded, true);
    assert.ok(entry.sourcePages.en.includes(143));
    assert.ok(entry.sourcePages.fr.includes(143));
  }

  const rule = catalog.entries.find(entry => entry.page === 143 && entry.type === "rule_text" && entry.sourceName === "X-01 Power Armor");
  assert.ok(rule);
  assert.equal(rule.certification.maxMods, 3);
  assert.equal(rule.certification.winterizedPlatingExcluded, true);
  assert.deepEqual(rule.certification.genericSystemAndPlatingReferencePages, [144,145]);

  const upgradeTable = catalog.entries.find(entry => entry.page === 143 && entry.type === "table" && entry.sourceName === "Unique X-01 Power Armor Upgrade Mods");
  assert.ok(upgradeTable);
  assert.equal(upgradeTable.certification.rowCount, 20);
  const platingTable = catalog.entries.find(entry => entry.page === 143 && entry.type === "table" && entry.sourceName === "Unique X-01 Power Armor Plating Mod");
  assert.ok(platingTable);
  assert.equal(platingTable.certification.rowCount, 1);
  assert.equal(platingTable.certification.publishedIdentityCount, 2);
  assert.equal(platingTable.certification.torsoVariantDerivedByRulePage, 144);

  const p143Mods = catalog.entries.filter(entry => entry.page === 143 && entry.pack === "apparel-mods" && entry.status === "verified");
  assert.equal(p143Mods.length, Object.keys(specs).length);
  assert.deepEqual(new Set(p143Mods.map(entry => entry.documentId)), new Set(Object.keys(specs)));

  const upgradeIds = {
    head: new Set(["qIO7j6PYi4ocPi9h","jQN0cvQRoPLzNwi5","20FKglk8LkB8A1c0","Su9jHSoBdvTPSMD8","Aqhxp38UDkBJ1EJ0"]),
    torso: new Set(["f2TJFwW2vfMqrmAY","4S9R2wqowQKgJ3q5","PCloS69pzVlT1gUM","kcEI3V2j23v89jGT","1QSjzncDxrx59OUf"]),
    arm: new Set(["qwU5VY4f3vsx4i6z","YswtxgeapixbJdL6","R6Z0Qp7iPfeZr0lp","ae5urfGJTUVqw7C6","VWq6f7jz0J0TRGUS"]),
    leg: new Set(["suU2pnzcO5KYUF9N","YsLy9bVbtP056YN7","LQGTYf4MpGnQ8bi7","nrkgX6ccemqUDUb1","zt3R2qkvtmgV3WLH"])
  };
  const systemIds = {
    head: new Set(["2SqnqGHd7D3y4O5E","42Qe82QKBhubp9xU","En57MQ3hn0DkcHJy","zALOB7gLXndAThjj"]),
    torso: new Set(["908vI94cQ4wdtSaI","Fi4sOOvTpfCKlBVS","Fov5IU0CbgDuZUuO","HdcX4nu2ZKYDf9hG","HlZVuMrkMKwSx0gT","JCala9JIwLsgpDig","dCYE8deU6qI7GARe","gCQROCvacrax9ukk","t2wGFT9GqqzS3Qt9","vuySzeWEI174mwLc"]),
    arm: new Set(["K63y4mcKxr792XLB","ZsGBPsT9kf1lVrFw","cMFQXRN9ZrDIU23Y","zX0aUfac1HnsEvZO"]),
    leg: new Set(["JpGZrBzUJTLieuRJ","RrhtyBPhjtENsF6w","pZ2FIyhKvuL7EPT0"])
  };
  const platingIds = {
    generic: new Set(["143I7SjRcQBq9sht","7iRkK1Elj5iRfANw","8fvlLrbWjODf6BCe","DxewSX1ooPKoNPPs","WKklumSE0xUCXFmc","kGts8ZQ6Lr4bkF9M"]),
    torso: new Set(["9WnVnLYY7epjkydJ","7IO8gCf1f2bCK4a0","JAN0jzOhkMyI3U1w","hJDcOKYapml78um8","lqvdGQ6axRjBfNoe","vZs57HCeBc9iOVUR"])
  };

  for (const language of ["en","fr"]) {
    const records = await generatedDocuments(language);
    const apparel = new Map(records.filter(({pack}) => pack === "apparel").map(({document}) => [document._id, document]));
    const mods = new Map(records.filter(({pack}) => pack === "apparel-mods").map(({document}) => [document._id, document]));

    for (const id of x01Ids) {
      const doc = apparel.get(id);
      assert.ok(doc, language + "/apparel/" + id + " missing");
      assert.equal(doc.system.description, descriptions[language], language + "/apparel/" + id + " X-01 p.143 description");
      assert.equal(doc.system.mods.max, 3, language + "/apparel/" + id + " max mods");
      const embedded = Object.entries(doc.system.mods).filter(([,value]) => value && typeof value === "object" && value.system);
      const group = doc.system.location.head ? "head" : doc.system.location.torso ? "torso" : (doc.system.location.armL || doc.system.location.armR) ? "arm" : "leg";
      assert.deepEqual(new Set(embedded.filter(([,value]) => value.system.modType === "upgrade").map(([mid]) => mid)), upgradeIds[group], language + "/apparel/" + id + " X-01 upgrades");
      assert.deepEqual(new Set(embedded.filter(([,value]) => value.system.modType === "system").map(([mid]) => mid)), systemIds[group], language + "/apparel/" + id + " systems");
      assert.deepEqual(new Set(embedded.filter(([,value]) => value.system.modType === "plating").map(([mid]) => mid)), group === "torso" ? platingIds.torso : platingIds.generic, language + "/apparel/" + id + " plating");
      assert.ok(!embedded.some(([mid]) => mid === "mgzavWT1TZT1qdoR" || mid === "faqvoA7iZx90tXnH"), language + "/apparel/" + id + " must exclude Winterized plating");
      for (const [mid,value] of embedded.filter(([,value]) => value.system.modType === "upgrade")) {
        assert.equal(value.system.perks, specs[mid].perks, language + "/apparel/" + id + " embedded " + mid + " perks");
      }
    }

    for (const [id,spec] of Object.entries(specs)) {
      const doc = mods.get(id);
      assert.ok(doc, language + "/apparel-mods/" + id + " missing");
      const source = doc.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page, 143, language + "/apparel-mods/" + id + " source page");
      assert.equal(source?.errataReviewed, true, language + "/apparel-mods/" + id + " errata review");
      assert.equal(doc.name, spec[language]);
      assert.equal(doc.system.apparelType, "powerArmor");
      assert.equal(doc.system.modType, spec.type);
      assert.equal(doc.system.location, spec.loc);
      assert.equal(doc.system.resistance.physical, spec.p);
      assert.equal(doc.system.resistance.energy, spec.e);
      assert.equal(doc.system.resistance.radiation, spec.r);
      assert.equal(doc.system.health.value, spec.hp);
      assert.equal(doc.system.weight, language === "en" ? spec.w : spec.w / 2);
      assert.equal(doc.system.cost, spec.c);
      assert.equal(doc.system.perks, spec.perks);
    }
  }
});

test("Core Power Armor pp.144-145 shared mods are source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 147 && catalog.certifiedThrough.en.sourcePage >= 145);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 148 && catalog.certifiedThrough.fr.sourcePage >= 145);

  const intro = {
    en: "<p>Power Armor mods apply to all the types of armor listed and are collected here to avoid repetition. There are two main kinds of Power Armor mod: systems, that provide additional features to the armor, and plating, which alters the outer surface of the armor.</p><p>Plating can be applied separately to any individual piece of Power Armor. However, due to size differences, the cost and weight of a plating mod applied to a chest piece is doubled. Raider Power Armor cannot take a plating mod, due to its makeshift nature. Each mod is listed with the skill required to install it.</p>",
    fr: "<p>Les mods d’armure assistée s’appliquent à tous les types d’armures présentés juste avant (sauf exception) et sont rassemblés ci-dessous pour éviter de les répéter pour chaque armure. Il existe deux grands types de mod d’armure assistée : les mods de système, qui fournissent des fonctionnalités supplémentaires à l’armure, et les mods de blindage qui modifient la surface externe de l’armure.</p><p>Un blindage peut être appliqué séparément à n’importe quelle pièce d’armure assistée. Cependant, à cause des différences de taille, le coût et le poids d’un mod de blindage appliqué sur un plastron sont doublés. À cause de sa nature artisanale, l’armure assistée de pillard ne peut pas accepter de mod de blindage. La compétence requise pour installer chaque mod est indiquée dans sa ligne du tableau.</p>"
  };

  const systems = new Map([
    ["2SqnqGHd7D3y4O5E",{page:144,en:"Rad Scrubber",fr:"Épurateur de radiations",loc:"Head",w:1,c:100,perks:"Science! 2",skill:"Science",enEffect:"<p>Ignore radiation from Irradiated food or drink consumed while armor is powered</p>",frEffect:"<p>Ignorez les dégâts de radiation venant de la nourriture ou des boissons Irradiées consommées tant que l’armure est alimentée en énergie</p>"}],
    ["En57MQ3hn0DkcHJy",{page:144,en:"Sensor Array",fr:"Détecteur",loc:"Head",w:1,c:100,perks:"Science! 3",skill:"Science",enEffect:"<p>Re-roll 1d20 on all PER tests while armor is powered</p>",frEffect:"<p>Vous pouvez relancer 1d20 sur tous vos tests de PER tant que l’armure est alimentée en énergie</p>"}],
    ["42Qe82QKBhubp9xU",{page:144,en:"Targeting HUD",fr:"ATH de visée",loc:"Head",w:1,c:100,perks:"Science! 3",skill:"Science",enEffect:"<p>When you take the Aim minor action, you may take a second minor action for 0 AP while armor is powered</p>",frEffect:"<p>Quand vous effectuez l’action mineure viser, vous pouvez effectuer une deuxième action mineure pour 0 PA tant que l’armure est alimentée en énergie</p>"}],
    ["zALOB7gLXndAThjj",{page:144,en:"Internal Database",fr:"Base de données interne",loc:"Head",w:1,c:100,perks:"Science! 2",skill:"Science",enEffect:"<p>Re-roll 1d20 on all INT tests while armor is powered</p>",frEffect:"<p>Vous pouvez relancer 1d20 sur tous vos tests d’INT tant que l’armure est alimentée en énergie</p>"}],
    ["R7MSARmaFbVPiunS",{page:139,en:"Welded Rebar",fr:"Barre d’armature soudée",loc:"Torso",w:2,c:25,perks:"Armorer 1",skill:"Repair",enEffect:"<p>Enemies who attack you with a melee or unarmed attack and suffer a complication suffer 2 @fos[DC] damage</p>",frEffect:"<p>Les ennemis qui vous portent une attaque de corps à corps ou à mains nues et subissent une complication subissent 2 @fos[DC] de dégâts</p>"}],
    ["t2wGFT9GqqzS3Qt9",{page:144,en:"Core Assembly",fr:"Noyau de réacteur",loc:"Torso",w:2,c:100,perks:"Science! 3",skill:"Science",enEffect:"<p>While armor is powered, if you begin your turn and there is no AP in the group pool, add +1 AP</p>",frEffect:"<p>Tant que l’armure est alimentée en énergie, si au début de votre tour, la réserve du groupe ne contient pas de PA, ajoutez-y +1 PA</p>"}],
    ["Fov5IU0CbgDuZUuO",{page:144,en:"Blood Cleanser",fr:"Purificateur sanguin",loc:"Torso",w:2,c:100,perks:"Science! 1",skill:"Science",enEffect:"<p>Re-roll addiction roll for addictive chems while armor is powered</p>",frEffect:"<p>Vous pouvez relancer le jet de dépendance pour les drogues addictives tant que l’armure est alimentée en énergie</p>"}],
    ["dCYE8deU6qI7GARe",{page:144,en:"Emergency Protocols",fr:"Protocoles d’urgence",loc:"Torso",w:2,c:100,perks:"Science! 4",skill:"Science",enEffect:"<p>While armor is powered, if your current HP is below 1/4 of your maximum, add +1 to Defense and +3 to all damage resistances</p>",frEffect:"<p>Tant que l’armure est alimentée en énergie, si vos PV actuels sont en dessous du quart de votre maximum, ajoutez +1 à votre défense et +3 à toutes vos résistances aux dégâts</p>"}],
    ["vuySzeWEI174mwLc",{page:144,en:"Motion-Assist Servos",fr:"Servomoteurs de déplacement assisté",loc:"Torso",w:2,c:100,perks:"Science! 3",skill:"Science",enEffect:"<p>Increase STR of armor frame to 13 while armor is powered</p>",frEffect:"<p>La FOR du châssis d’armure passe à 13 tant que l’armure est alimentée en énergie</p>"}],
    ["Fi4sOOvTpfCKlBVS",{page:144,en:"Kinetic Dynamo",fr:"Dynamo cinétique",loc:"Torso",w:2,c:100,perks:"Science! 4",skill:"Science",enEffect:"<p>While armor is powered, when you suffer any damage (after reductions for damage resistances), add +1 to the group AP pool</p>",frEffect:"<p>Tant que l’armure est alimentée en énergie, si vous subissez des dégâts (après les réductions des résistances aux dégâts), ajoutez +1 à la réserve de PA du groupe</p>"}],
    ["gCQROCvacrax9ukk",{page:144,en:"Medic Pump",fr:"Pompe médicale",loc:"Torso",w:2,c:100,perks:"Science! 4",skill:"Science",enEffect:"<p>While armor is powered, when your HP are reduced to below 1/2 of your maximum, you immediately use a Stimpak, regaining 3 HP or treating one Injury.</p>",frEffect:"<p>Tant que l’armure est alimentée en énergie, quand vos PV tombent en dessous de la moitié de votre maximum, vous utilisez immédiatement un Stimpak et vous regagnez 3 PV ou vous traitez 1 blessure</p>"}],
    ["JCala9JIwLsgpDig",{page:144,en:"Reactive Plates",fr:"Plaques réactives",loc:"Torso",w:2,c:100,perks:"Armorer 4",skill:"Repair",enEffect:"<p>While armor is powered, when you suffer damage from a melee or unarmed attack, you inflict Physical damage back to the attacker equal to half the damage total rolled</p>",frEffect:"<p>Tant que l’armure est alimentée en énergie, quand vous subissez des dégâts venant d’une attaque de corps à corps ou à mains nues, vous infligez une quantité de dégâts balistiques égale à la moitié du total de dégâts obtenu sur le jet à l’attaquant en retour</p>"}],
    ["908vI94cQ4wdtSaI",{page:145,en:"Tesla Coils",fr:"Bobines Tesla",loc:"Torso",w:2,c:100,perks:"Science! 3",skill:"Science",enEffect:"<p>While armor is powered, whenever an enemy makes a melee attack against you, they suffer 4 @fos[DC] Energy damage</p>",frEffect:"<p>Tant que l’armure est alimentée en énergie, chaque fois qu’un ennemi vous porte une attaque de corps à corps, il subit 4 @fos[DC] de dégâts énergétiques</p>"}],
    ["HlZVuMrkMKwSx0gT",{page:145,en:"Stealth Boy",fr:"Stealth Boy",loc:"Torso",w:1,c:100,perks:"Science! 4",skill:"Science",enEffect:"<p>You may activate a Stealth Boy (p.171) once per scene by spending 1 charge</p>",frEffect:"<p>Vous pouvez activer un Stealth Boy (voir page 171) une fois par scène en dépensant 1 charge</p>"}],
    ["HdcX4nu2ZKYDf9hG",{page:145,en:"Jetpack",fr:"Jetpack",loc:"Torso",w:1,c:500,perks:"Armorer 4, Science! 4",skill:"Repair",enEffect:"<p>When you move you may activate a jetpack by spending 1 charge; this allows you to move one additional zone (horizontally or vertically) or gain enough height for an impact landing</p>",frEffect:"<p>Quand vous vous déplacez, vous pouvez activer un jetpack en dépensant 1 charge, ce qui vous permet de vous déplacer de 1 zone supplémentaire (à l’horizontale ou à la verticale) ou de gagner suffisamment de hauteur pour effectuer un atterrissage à impact</p>"}],
    ["zX0aUfac1HnsEvZO",{page:145,en:"Rusty Knuckles",fr:"Poing rouillé",loc:"Arm",w:1,c:50,perks:"Blacksmith 1",skill:"Repair",enEffect:"<p>Your unarmed attacks gain the Persistent damage effect</p>",frEffect:"<p>Vos attaques à mains nues gagnent l’effet de dégâts Persistant</p>"}],
    ["cMFQXRN9ZrDIU23Y",{page:145,en:"Hydraulic Bracers",fr:"Bracelets hydrauliques",loc:"Arm",w:1,c:100,perks:"Blacksmith 3",skill:"Repair",enEffect:"<p>While armor is powered, your unarmed attacks inflict +2 @fos[DC] damage</p>",frEffect:"<p>Tant que l’armure est alimentée en énergie, vos attaques à mains nues infligent +2 @fos[DC] de dégâts</p>"}],
    ["ZsGBPsT9kf1lVrFw",{page:145,en:"Optimized Bracers",fr:"Bracelets optimisés",loc:"Arm",w:1,c:100,perks:"Blacksmith 1",skill:"Repair",enEffect:"<p>While armor is powered, you may spend up to 4 AP on bonus damage for melee attacks</p>",frEffect:"<p>Tant que l’armure est alimentée en énergie, vous pouvez dépenser jusqu’à 4 PA en dégâts bonus pour les attaques de corps à corps</p>"}],
    ["K63y4mcKxr792XLB",{page:145,en:"Tesla Bracers",fr:"Bracelets Tesla",loc:"Arm",w:1,c:150,perks:"Blacksmith 3, Science! 1",skill:"Repair",enEffect:"<p>While armor is powered, your unarmed attacks inflict +2 @fos[DC] damage and now inflict Energy damage</p>",frEffect:"<p>Tant que l’armure est alimentée en énergie, vos attaques à mains nues infligent +2 @fos[DC] de dégâts. Les dégâts de ces attaques sont énergétiques.</p>"}],
    ["RrhtyBPhjtENsF6w",{page:145,en:"Calibrated Shocks",fr:"Amortisseurs calibrés",loc:"Leg",w:1,c:100,perks:"Science! 2",skill:"Science",enEffect:"<p>Your carry weight is increased by +50</p>",frEffect:"<p>Votre charge maximale augmente de +25</p>"}],
    ["JpGZrBzUJTLieuRJ",{page:145,en:"Explosive Vent",fr:"Évent d’explosion",loc:"Leg",w:1,c:100,perks:"Science! 3",skill:"Science",enEffect:"<p>While the armor is powered, when you land from a height, you inflict 4 @fos[DC] damage to all creatures and damageable objects within Close range</p>",frEffect:"<p>Tant que l’armure est alimentée en énergie, quand vous atterrissez depuis une hauteur, vous infligez 4 @fos[DC] de dégâts à toutes les créatures et objets pouvant subir des dégâts à portée courte</p>"}],
    ["pZ2FIyhKvuL7EPT0",{page:145,en:"Overdrive Servos",fr:"Servomoteurs à vitesse surmultipliée",loc:"Leg",w:1,c:100,perks:"Science! 3",skill:"Science",enEffect:"<p>While armor is powered, when you Sprint, you may spend +2 AP to move one additional zone</p>",frEffect:"<p>Tant que l’armure est alimentée en énergie, quand vous sprintez, vous pouvez dépenser +2 PA pour vous déplacer de 1 zone supplémentaire</p>"}]
  ]);

  const platings = new Map([
    ["kGts8ZQ6Lr4bkF9M",{en:"Titanium Plating",fr:"Blindage en titane",loc:"Helm, Arms, Legs",w:1,c:10,perks:"Armorer 3",skill:"Repair",hp:1,e:0,r:0,enEffect:"<p>+1 HP to Armor Piece</p>",frEffect:"<p>+1 PV pour la pièce d’armure</p>"}],
    ["hJDcOKYapml78um8",{en:"Titanium Plating (Torso)",fr:"Blindage en titane (Torse)",loc:"Torso",w:2,c:20,perks:"Armorer 3",skill:"Repair",hp:2,e:0,r:0,enEffect:"<p>+2 HP to Armor Piece</p>",frEffect:"<p>+2 PV pour la pièce d’armure</p>"}],
    ["8fvlLrbWjODf6BCe",{en:"Lead Plating",fr:"Blindage en plomb",loc:"Helm, Arms, Legs",w:2,c:10,perks:"Armorer 1",skill:"Repair",hp:0,e:0,r:2,enEffect:"<p>+2 Radiation damage resistance</p>",frEffect:"<p>+2 résistance aux dégâts de radiation</p>"}],
    ["7IO8gCf1f2bCK4a0",{en:"Lead Plating (Torso)",fr:"Blindage en plomb (Torse)",loc:"Torso",w:4,c:20,perks:"Armorer 1",skill:"Repair",hp:0,e:0,r:2,enEffect:"<p>+2 Radiation damage resistance</p>",frEffect:"<p>+2 résistance aux dégâts de radiation</p>"}],
    ["DxewSX1ooPKoNPPs",{en:"Photovoltaic Plating",fr:"Revêtement photovoltaïque",loc:"Helm, Arms, Legs",w:1,c:10,perks:"Science! 3",skill:"Science",hp:0,e:0,r:0,enEffect:"<p>+1 AP at the start of a scene if in direct sunlight (only applies once)</p>",frEffect:"<p>+1 PA au début d’une scène si vous êtes directement exposé à la lumière du soleil (ne s’applique qu’une fois)</p>"}],
    ["lqvdGQ6axRjBfNoe",{en:"Photovoltaic Plating (Torso)",fr:"Revêtement photovoltaïque (Torse)",loc:"Torso",w:2,c:20,perks:"Science! 3",skill:"Science",hp:0,e:0,r:0,enEffect:"<p>+1 AP at the start of a scene if in direct sunlight (only applies once)</p>",frEffect:"<p>+1 PA au début d’une scène si vous êtes directement exposé à la lumière du soleil (ne s’applique qu’une fois)</p>"}],
    ["mgzavWT1TZT1qdoR",{en:"Winterized Coating",fr:"Revêtement antigel",loc:"Helm, Arms, Legs",w:1,c:10,perks:"Armorer 1",skill:"Repair",hp:0,e:1,r:0,enEffect:"<p>+1 Energy damage resistance</p>",frEffect:"<p>+1 résistance aux dégâts énergétiques</p>"}],
    ["faqvoA7iZx90tXnH",{en:"Winterized Coating (Torso)",fr:"Revêtement antigel (Torse)",loc:"Torso",w:2,c:20,perks:"Armorer 1",skill:"Repair",hp:0,e:1,r:0,enEffect:"<p>+1 Energy damage resistance</p>",frEffect:"<p>+1 résistance aux dégâts énergétiques</p>"}],
    ["WKklumSE0xUCXFmc",{en:"Prism Shielding",fr:"Blindage prismatique",loc:"Helm, Arms, Legs",w:2,c:10,perks:"Science! 2",skill:"Science",hp:0,e:3,r:0,enEffect:"<p>+3 Energy damage resistance</p>",frEffect:"<p>+3 résistance aux dégâts énergétiques</p>"}],
    ["JAN0jzOhkMyI3U1w",{en:"Prism Shielding (Torso)",fr:"Blindage prismatique (Torse)",loc:"Torso",w:4,c:20,perks:"Science! 2",skill:"Science",hp:0,e:3,r:0,enEffect:"<p>+3 Energy damage resistance</p>",frEffect:"<p>+3 résistance aux dégâts énergétiques</p>"}],
    ["7iRkK1Elj5iRfANw",{en:"Explosive Shielding",fr:"Blindage antiexplosion",loc:"Helm, Arms, Legs",w:1,c:10,perks:"Science! 1",skill:"Science",hp:0,e:0,r:0,enEffect:"<p>+2 to all damage resistances vs Blast weapons.</p>",frEffect:"<p>+2 à toutes les résistances aux dégâts contre les armes à Zone d’impact</p>"}],
    ["vZs57HCeBc9iOVUR",{en:"Explosive Shielding (Torso)",fr:"Blindage antiexplosion (Torse)",loc:"Torso",w:2,c:20,perks:"Science! 1",skill:"Science",hp:0,e:0,r:0,enEffect:"<p>+2 to all damage resistances vs Blast weapons.</p>",frEffect:"<p>+2 à toutes les résistances aux dégâts contre les armes à Zone d’impact</p>"}]
  ]);

  const p144 = catalog.entries.filter(entry => entry.page === 144 && entry.pack === "apparel-mods" && entry.status === "verified");
  assert.equal(p144.length, 11);
  assert.deepEqual(new Set(p144.map(entry => entry.documentId)), new Set([...systems].filter(([,spec]) => spec.page === 144).map(([id]) => id)));
  const repeatedWelded = catalog.entries.find(entry => entry.page === 144 && entry.type === "repeated_row" && entry.certification?.representedByDocumentId === "R7MSARmaFbVPiunS");
  assert.ok(repeatedWelded);
  assert.equal(repeatedWelded.status, "out_of_scope");
  assert.equal(repeatedWelded.certification.firstCertifiedPage, 139);

  const p145 = catalog.entries.filter(entry => entry.page === 145 && entry.pack === "apparel-mods" && entry.status === "verified");
  assert.equal(p145.length, 22);
  assert.deepEqual(new Set(p145.map(entry => entry.documentId)), new Set([...systems].filter(([,spec]) => spec.page === 145).map(([id]) => id).concat([...platings.keys()])));

  const sharedRule = catalog.entries.find(entry => entry.page === 144 && entry.type === "rule_text" && entry.sourceName === "Power Armor Mods");
  assert.ok(sharedRule);
  assert.equal(sharedRule.certification.chestPlatingWeightCostMultiplier, 2);
  assert.equal(sharedRule.certification.raiderPlatingExcluded, true);
  assert.equal(sharedRule.certification.errataReviewed, true);
  assert.match(sharedRule.certification.errataNote, /no Core p\.144–145 Power Armor Mods correction/);

  const powerArmorEntries = catalog.entries.filter(entry => entry.page === 137 && entry.pack === "apparel" && entry.documentId !== "lp5ZpYjbFhe8IUcx");
  assert.equal(powerArmorEntries.length, 30);
  for (const entry of powerArmorEntries) {
    assert.ok(entry.sourcePages.en.includes(144) && entry.sourcePages.en.includes(145), entry.sourceName + " EN shared-mod dependency");
    assert.ok(entry.sourcePages.fr.includes(144) && entry.sourcePages.fr.includes(145), entry.sourceName + " FR shared-mod dependency");
    assert.equal(entry.certification.sharedSystemModsReviewed, true, entry.sourceName + " System mods reviewed");
    assert.equal(entry.certification.powerArmorModsRulesReviewed, true, entry.sourceName + " shared rules reviewed");
    assert.equal(entry.certification.sharedPlatingModsReviewed, !entry.sourceName.startsWith("Raider "), entry.sourceName + " Plating review");
  }

  for (const language of ["en","fr"]) {
    const records = await generatedDocuments(language);
    const mods = new Map(records.filter(({pack}) => pack === "apparel-mods").map(({document}) => [document._id, document]));
    const apparel = new Map(records.filter(({pack}) => pack === "apparel").map(({document}) => [document._id, document]));

    for (const [id,spec] of systems) {
      const doc = mods.get(id);
      assert.ok(doc, language + "/apparel-mods/" + id + " missing");
      const source = doc.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page, spec.page, language + "/apparel-mods/" + id + " source page");
      assert.equal(source?.errataReviewed, true, language + "/apparel-mods/" + id + " errata review");
      assert.equal(doc.name, spec[language]);
      assert.equal(doc.system.apparelType, "powerArmor");
      assert.equal(doc.system.modType, "system");
      assert.equal(doc.system.location, spec.loc);
      assert.equal(doc.system.cost, spec.c);
      assert.equal(doc.system.perks, spec.perks);
      assert.equal(doc.system.weight, language === "en" ? spec.w : spec.w / 2);
      assert.equal(doc.system.effect, language === "en" ? spec.enEffect : spec.frEffect);
      if (id !== "R7MSARmaFbVPiunS") {
        assert.ok(doc.system.description.startsWith(intro[language]), language + "/apparel-mods/" + id + " shared source description");
        assert.match(doc.system.description, /data-f2d20-recipe="core"/, language + "/apparel-mods/" + id + " recipe retained");
      }
    }

    for (const [id,spec] of platings) {
      const doc = mods.get(id);
      assert.ok(doc, language + "/apparel-mods/" + id + " missing");
      const source = doc.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page, 145, language + "/apparel-mods/" + id + " source page");
      assert.equal(source?.errataReviewed, true);
      assert.equal(doc.name, spec[language]);
      assert.equal(doc.system.apparelType, "powerArmor");
      assert.equal(doc.system.modType, "plating");
      assert.equal(doc.system.location, spec.loc);
      assert.equal(doc.system.cost, spec.c);
      assert.equal(doc.system.perks, spec.perks);
      assert.equal(doc.system.weight, language === "en" ? spec.w : spec.w / 2);
      assert.equal(doc.system.health.value, spec.hp);
      assert.deepEqual(doc.system.resistance, {energy:spec.e,physical:0,radiation:spec.r});
      assert.equal(doc.system.effect, language === "en" ? spec.enEffect : spec.frEffect);
      assert.ok(doc.system.description.startsWith(intro[language]), language + "/apparel-mods/" + id + " shared source description");
      assert.match(doc.system.description, /data-f2d20-recipe="core"/, language + "/apparel-mods/" + id + " recipe retained");
    }

    for (const entry of powerArmorEntries) {
      const piece = apparel.get(entry.documentId);
      assert.ok(piece, language + "/apparel/" + entry.documentId + " missing");
      const embedded = Object.entries(piece.system.mods || {}).filter(([,value]) => value && typeof value === "object" && value.system);
      for (const [id, embeddedMod] of embedded) {
        if (!systems.has(id) && !platings.has(id)) continue;
        const central = mods.get(id);
        assert.ok(central, language + "/apparel-mods/" + id + " central mod missing");
        assert.equal(embeddedMod.system.modType, central.system.modType, language + "/apparel/" + entry.documentId + "/" + id + " modType");
        assert.equal(embeddedMod.system.location, central.system.location, language + "/apparel/" + entry.documentId + "/" + id + " location");
        assert.equal(embeddedMod.system.cost, central.system.cost, language + "/apparel/" + entry.documentId + "/" + id + " cost");
        assert.equal(embeddedMod.system.perks, central.system.perks, language + "/apparel/" + entry.documentId + "/" + id + " perks");
        assert.deepEqual(embeddedMod.system.resistance, central.system.resistance, language + "/apparel/" + entry.documentId + "/" + id + " resistances");
        assert.equal(embeddedMod.system.health.value, central.system.health.value, language + "/apparel/" + entry.documentId + "/" + id + " health");
        assert.equal(embeddedMod.system.weight, central.system.weight, language + "/apparel/" + entry.documentId + "/" + id + " weight");
      }
    }
  }
});

test("Core Robot Armor pp.146–147 table is source-complete", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 149 && catalog.certifiedThrough.en.sourcePage >= 147);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 150 && catalog.certifiedThrough.fr.sourcePage >= 147);

  const identities = [
    ["hNlPV160j8Uk9qAZ","actuated_frame","arm_1"],["l2R15upfww3XvNHA","actuated_frame","arm_2"],["ByXJVAAdbklXkx4F","actuated_frame","arm_3"],["0d7qFZHVsWYFhFoI","actuated_frame","main_body"],["HYNVUjwQxMO4KXIe","actuated_frame","optics"],["LLnQeNnD1C4zlqXv","actuated_frame","thruster"],
    ["Bw8LJy7nJMkiXcBo","factory_armor","arm_1"],["eBkpFQgUgEY577D8","factory_armor","arm_2"],["bjYeD4BiCQS4kEGu","factory_armor","arm_3"],["WaHiQ6eWFNacsUJ3","factory_armor","main_body"],["ItAAKsRwZQEbmwIF","factory_armor","optics"],["bCVyhEfW7raPOUnE","factory_armor","thruster"],
    ["mqCbnQQasrmkZsvU","factory_storage_armor","main_body"],
    ["JDKYtZyqEV2lQvFx","hydraulic_frame","arm_1"],["OkcwSvkgUoyWp5s1","hydraulic_frame","arm_2"],["agLROEPeyQHPmptB","hydraulic_frame","arm_3"],["WfmNUwj6vf1J1B1D","hydraulic_frame","main_body"],["D8Y0T7cpVY4XgXWq","hydraulic_frame","optics"],["QBX0JeYQ35RQR7N8","hydraulic_frame","thruster"],
    ["TsWbvZ5RsybpeN2y","mister_gutsy_plating",null],
    ["Kf577cR3G6pb7Mkt","noxious_plate","arm_1"],["f51NNsrFdLVVsNqJ","noxious_plate","arm_2"],["g81eSQdioCxlp7Dm","noxious_plate","arm_3"],["ShuSwxf2xbRbpn9D","noxious_plate","main_body"],["tH4nPzaOhBjnfmpC","noxious_plate","optics"],["yWyTsnEUgTIAwldJ","noxious_plate","thruster"],
    ["9EqSrg7jA5qcLniC","primal_plate","arm_1"],["i3ORYuQ06JEuR1Sg","primal_plate","arm_2"],["2B6NdSIDwwqjTqZn","primal_plate","arm_3"],["RDjyaSvAT6HzfEBn","primal_plate","main_body"],["oXFQizWTeO3HB4GA","primal_plate","optics"],["Qe00ZMs3pujwwgjs","primal_plate","thruster"],
    ["F0EnePOunzae56lJ","serrated_plate","arm_1"],["vqETiW7Kb0SgXV43","serrated_plate","arm_2"],["UCJpZzvuttkA0QgE","serrated_plate","arm_3"],["VgbaAYRw7EgisEiA","serrated_plate","main_body"],["SfpbSl7s62PyLVD1","serrated_plate","optics"],["MIbiWiYfApYYj1ft","serrated_plate","thruster"],
    ["BDGcAACYaQF0qXxX","standard_plating",null],
    ["MOmIwergCNwfesgP","toxic_plate","arm_1"],["q13iMNcRH0zc729C","toxic_plate","arm_2"],["wGGosbG83Om5a1ac","toxic_plate","arm_3"],["wS4PyRQOedMKih10","toxic_plate","main_body"],["acP42rzsrff1QOU2","toxic_plate","optics"],["p6isTJnOmQhUGLck","toxic_plate","thruster"],
    ["IU0gtAAG6EOwvSXA","voltaic_frame","arm_1"],["5922ioSDVB2hnY72","voltaic_frame","arm_2"],["c7bdRUlaii4Yn8oH","voltaic_frame","arm_3"],["ai8sQG55s9dcHrH2","voltaic_frame","main_body"],["KIeIEy9kJXroD5wH","voltaic_frame","optics"],["qAnuaudKfDpd72Sl","voltaic_frame","thruster"]
  ];
  assert.equal(identities.length, 51);

  const families = {
    actuated_frame:{en:"Actuated Frame",fr:"Châssis actif",p:1,e:1,perks:"",cost:{optics:15,main_body:30,arm:15,thruster:15},carry:{optics:10,main_body:20,arm:10,thruster:10}},
    factory_armor:{en:"Factory Armor",fr:"Armure d’usine",p:1,e:1,perks:"",cost:{optics:10,main_body:20,arm:10,thruster:10},carry:{optics:0,main_body:0,arm:0,thruster:0}},
    factory_storage_armor:{en:"Factory Storage Armor",fr:"Armure de stockage d’usine",p:1,e:1,perks:"Armorer 1",cost:{main_body:25},carry:{main_body:20}},
    hydraulic_frame:{en:"Hydraulic Frame",fr:"Châssis hydraulique",p:3,e:3,perks:"Armorer 3",cost:{optics:30,main_body:60,arm:30,thruster:30},carry:{optics:5,main_body:10,arm:5,thruster:5}},
    mister_gutsy_plating:{en:"Mister Gutsy Plating",fr:"Blindage Mister Gutsy",p:2,e:2,perks:"",cost:{all:0},carry:{all:-10}},
    noxious_plate:{en:"Noxious Plate",fr:"Plaque néfaste",p:2,e:0,perks:"Armorer 1",cost:{optics:15,main_body:30,arm:15,thruster:15},carry:{optics:-10,main_body:-20,arm:-10,thruster:-10}},
    primal_plate:{en:"Primal Plate",fr:"Plaque de base",p:2,e:0,perks:"",cost:{optics:10,main_body:20,arm:10,thruster:10},carry:{optics:-10,main_body:-20,arm:-10,thruster:-10}},
    serrated_plate:{en:"Serrated Plate",fr:"Plaque dentelée",p:2,e:0,perks:"Armorer 1",cost:{optics:15,main_body:30,arm:15,thruster:15},carry:{optics:-10,main_body:-20,arm:-10,thruster:-10}},
    standard_plating:{en:"Standard Plating",fr:"Blindage standard",p:2,e:0,perks:"",cost:{all:0},carry:{all:0}},
    toxic_plate:{en:"Toxic Plate",fr:"Plaque toxique",p:2,e:0,perks:"Armorer 3",cost:{optics:15,main_body:30,arm:15,thruster:15},carry:{optics:-10,main_body:-20,arm:-10,thruster:-10}},
    voltaic_frame:{en:"Voltaic Frame",fr:"Châssis voltaïque",p:2,e:2,perks:"Armorer 2",cost:{optics:20,main_body:40,arm:20,thruster:20},carry:{optics:10,main_body:20,arm:10,thruster:10}}
  };
  const enSuffix={optics:"Optics",main_body:"Main Body",arm_1:"Arm 1",arm_2:"Arm 2",arm_3:"Arm 3",thruster:"Thruster"};
  const frSuffix={optics:"Optiques",main_body:"Corps principal",arm_1:"Bras 1",arm_2:"Bras 2",arm_3:"Bras 3",thruster:"Propulseur"};
  const described=new Set(["standard_plating","mister_gutsy_plating","factory_armor","factory_storage_armor","primal_plate"]);
  const desc = {
    en:{
      standard_plating:"<p>The default factory plating provided with all brand-new Mister Handy models. This has no cost, as it&rsquo;s the default which a Mister Handy character begins with most of the time.</p>",
      mister_gutsy_plating:"<p>Like the standard plating, but with better thermal absorption properties to reinforce it against energy weaponry, this is the standard plating for a Mister Gutsy. It is the default for all Mister Handy characters who select the Mister Gutsy starting package.</p>",
      factory_armor:"<p>A standardized, factory-made set of armor plating designed to fit any Mister Handy model.</p>",
      factory_storage_armor:"<p>A factory-made set of standard armor which also provides additional storage compartments to increase a robot&rsquo;s carrying capacity.</p>",
      primal_plate:"<p>Makeshift supplementary armor that can be affixed to a robot&rsquo;s structure to provide extra protection from physical hazards. The bulk and crude design reduce the robot&rsquo;s carrying capacity, however.</p>"
    },
    fr:{
      standard_plating:"<p>Le blindage sorti d’usine par défaut fourni avec tous les modèles neufs de Mister Handy. Le coût n’est pas indiqué, car c’est le blindage par défaut avec lequel un personnage Mister Handy commence le jeu la plupart du temps.</p>",
      mister_gutsy_plating:"<p>Identique au blindage standard, mais avec de meilleures propriétés d’absorption thermique pour le renforcer contre les armes à énergie. Ce blindage est le blindage standard pour un Mister Gutsy. C’est donc aussi le blindage par défaut pour tous les personnages Mister Handy qui choisissent le pack d’équipement de départ Mister Gutsy.</p>",
      factory_armor:"<p>Un ensemble de blindage d’armure standardisé fabriqué en usine conçu pour pouvoir être monté sur n’importe quel modèle de Mister Handy.</p>",
      factory_storage_armor:"<p>Une armure standard fabriquée en usine qui fournit également des compartiments de stockage supplémentaires pour augmenter la charge que peut porter le robot.</p>",
      primal_plate:"<p>Une armure complémentaire artisanale qui peut être fixée sur la structure d’un robot pour fournir une protection supplémentaire contre les dangers physiques. Cependant, le volume et le design rudimentaire de cette armure réduisent la charge que le robot peut porter.</p>"
    }
  };

  const table = catalog.entries.find(entry => entry.page === 146 && entry.type === "table" && entry.sourceName === "Robot Armor Types");
  assert.ok(table);
  assert.equal(table.certification.rowCount, 35);
  assert.equal(table.certification.publishedIdentityCount, 51);
  assert.equal(table.certification.armVariantsDerived, true);
  assert.equal(table.certification.sourceArmsCoverAllThree, true);
  assert.match(table.certification.errataNote, /Wasteland Wanderer/);
  assert.match(table.certification.errataNote, /Rust Devils NPC Pack/);

  const robotEntries = catalog.entries.filter(entry => entry.pack === "robot-armor" && [146,147].includes(entry.page) && entry.status === "verified");
  assert.equal(robotEntries.length, 51);
  assert.deepEqual(new Set(robotEntries.map(entry => entry.documentId)), new Set(identities.map(([id]) => id)));

  for(const [family] of Object.entries(families)){
    const arms=robotEntries.filter(entry => entry.certification.sourceTableName === families[family].en && entry.certification.sourceRowLocation === "Arms");
    if(["standard_plating","mister_gutsy_plating","factory_storage_armor"].includes(family)) assert.equal(arms.length,0);
    else {
      assert.equal(arms.length,3,family+" published arm variants");
      assert.deepEqual(new Set(arms.map(entry=>entry.certification.armVariant)),new Set([1,2,3]));
    }
  }

  for (const language of ["en","fr"]) {
    const records = await generatedDocuments(language);
    const docs = new Map(records.filter(({pack}) => pack === "robot-armor").map(({document}) => [document._id, document]));
    assert.equal(docs.size, 51);

    for (const [id,family,suffix] of identities) {
      const f=families[family], doc=docs.get(id);
      assert.ok(doc,language+"/robot-armor/"+id+" missing");
      const locKey=suffix?.startsWith("arm_")?"arm":(suffix||"all");
      const page=(family==="voltaic_frame"||family==="hydraulic_frame"||(family==="actuated_frame"&&suffix==="thruster"))?147:146;
      const expectedName=f[language]+(suffix?" ("+(language==="en"?enSuffix[suffix]:frSuffix[suffix])+")":"");
      assert.equal(doc.name,expectedName,language+"/robot-armor/"+id+" name");
      assert.deepEqual(doc.system.resistance,{energy:f.e,physical:f.p,radiation:0},language+"/robot-armor/"+id+" resistances");
      assert.equal(doc.system.cost,f.cost[locKey],language+"/robot-armor/"+id+" cost");
      assert.equal(doc.system.perks,f.perks,language+"/robot-armor/"+id+" perks");
      assert.equal(doc.system.carry,language==="en"?f.carry[locKey]:f.carry[locKey]/2,language+"/robot-armor/"+id+" carry");
      const source=doc.flags?.["fallout2d20-compendium"]?.source;
      assert.equal(source?.page,page,language+"/robot-armor/"+id+" source page");
      assert.equal(source?.errataReviewed,true,language+"/robot-armor/"+id+" errata review");
      const catEntry=robotEntries.find(entry=>entry.documentId===id);
      assert.equal(catEntry.certification.descriptionReviewed,described.has(family) || catEntry.certification.descriptionSourcePage === 148);
      if(described.has(family)){
        assert.ok(doc.system.description.startsWith(desc[language][family]),language+"/robot-armor/"+id+" p.147 description");
        if(!["standard_plating","mister_gutsy_plating"].includes(family)) assert.match(doc.system.description,/data-f2d20-recipe="core"/,language+"/robot-armor/"+id+" recipe retained");
      }
    }
  }
});



test("Core Robot Armor p.148 descriptions and special effects are source-exact", async () => {
  assert.ok(catalog.certifiedThrough.en.pdfPage >= 150 && catalog.certifiedThrough.en.sourcePage >= 148);
  assert.ok(catalog.certifiedThrough.fr.pdfPage >= 151 && catalog.certifiedThrough.fr.sourcePage >= 148);

  const families = {
    serrated_plate: {
      sourceName: "Serrated Plate",
      ids: ["F0EnePOunzae56lJ","vqETiW7Kb0SgXV43","UCJpZzvuttkA0QgE","VgbaAYRw7EgisEiA","SfpbSl7s62PyLVD1","MIbiWiYfApYYj1ft"],
      en: "Makeshift armor plating with jagged, serrated edges. Like primal plate, but more hazardous to those who would do the robot ill, as the sharp protrusions can lead to injury. Special: When a melee attack is made against a location fitted with serrated plate, and the attacker suffers a complication, then the attacker suffers 2 @fos[DC] Persistent (Physical) damage. In addition, melee attacks made using arms fitted with serrated plate gain the Persistent (Physical) damage effect.",
      fr: "Un blindage d’armure artisanal aux bords dentelés et tranchants. Fournit la même protection que la plaque de base, mais s’avère plus dangereux pour ceux qui voudraient faire du mal au robot, car les excroissances aiguisées peuvent causer des blessures. Spécial : quand une attaque de corps à corps est portée sur une localisation équipée de plaque dentelée et que l’attaquant subit une complication, l’attaquant subit 2 @fos[DC] de dégâts Persistants (balistiques). De plus, les attaques de corps à corps portées avec des bras équipés de plaque dentelée gagnent l’effet de dégâts Persistant (balistiques)."
    },
    noxious_plate: {
      sourceName: "Noxious Plate",
      ids: ["Kf577cR3G6pb7Mkt","f51NNsrFdLVVsNqJ","g81eSQdioCxlp7Dm","ShuSwxf2xbRbpn9D","tH4nPzaOhBjnfmpC","yWyTsnEUgTIAwldJ"],
      en: "Makeshift armor coated in toxic materials which are hazardous to the health of any who seeks to inflict harm upon the robot or its companions. Special: When a melee attack is made against a location fitted with noxious plate, and the attacker suffers a complication, then the attacker suffers 2 @fos[DC] Persistent (Poison) damage. In addition, melee attacks made using arms fitted with serrated plate gain the Persistent (Poison) damage effect.",
      fr: "Une armure artisanale recouverte d’une couche de matériaux toxiques représentant un risque pour la santé de quiconque cherche à infliger des dommages au robot ou à ses compagnons. Spécial : quand une attaque de corps à corps est portée sur une localisation équipée de plaque néfaste et que l’attaquant subit une complication, l’attaquant subit 2 @fos[DC] de dégâts Persistants (de poison). De plus, les attaques de corps à corps portées avec des bras équipés de plaque néfaste gagnent l’effet de dégâts Persistant (de poison)."
    },
    toxic_plate: {
      sourceName: "Toxic Plate",
      ids: ["MOmIwergCNwfesgP","q13iMNcRH0zc729C","wGGosbG83Om5a1ac","wS4PyRQOedMKih10","acP42rzsrff1QOU2","p6isTJnOmQhUGLck"],
      en: "Makeshift armor made with irradiated metal plating, dangerous to living creatures nearby. Special: When a melee attack is made against a location fitted with toxic plate, and the attacker suffers a complication, then the attacker suffers 2 @fos[DC] Radiation damage. In addition, melee attacks made using arms fitted with serrated plate gain the Radioactive damage effect.",
      fr: "Une armure artisanale fabriquée avec des plaques de métal irradié, dangereuse pour les créatures vivantes à proximité. Spécial : quand une attaque de corps à corps est portée sur une localisation équipée de plaque toxique et que l’attaquant subit une complication, l’attaquant subit 2 @fos[DC] de dégâts de radiation. De plus, les attaques de corps à corps portées avec des bras équipés de plaque toxique gagnent l’effet de dégâts Radioactif."
    },
    actuated_frame: {
      sourceName: "Actuated Frame",
      ids: ["hNlPV160j8Uk9qAZ","l2R15upfww3XvNHA","ByXJVAAdbklXkx4F","0d7qFZHVsWYFhFoI","HYNVUjwQxMO4KXIe","LLnQeNnD1C4zlqXv"],
      en: "A specially made set of armor plates fitted with actuators and motive systems which aid the robot’s actions. Special: Melee attacks made from arms fitted with an actuated frame inflict +1 @fos[DC] damage. If the robot’s Thruster is fitted with an actuated frame, it may make both a Move minor action and a Sprint major action in the same turn.",
      fr: "Un ensemble de plaques d’armure de confection spéciale équipé d’actionneurs et de systèmes moteurs qui facilitent les actions du robot. Spécial : les attaques de corps à corps portées avec des bras équipés d’un châssis actif infligent +1 @fos[DC] de dégâts. Si le propulseur du robot est équipé d’un châssis actif, le robot peut effectuer à la fois une action mineure se déplacer et une action capitale sprinter lors du même tour."
    },
    voltaic_frame: {
      sourceName: "Voltaic Frame",
      ids: ["IU0gtAAG6EOwvSXA","5922ioSDVB2hnY72","c7bdRUlaii4Yn8oH","ai8sQG55s9dcHrH2","KIeIEy9kJXroD5wH","qAnuaudKfDpd72Sl"],
      en: "A specially made set of armor plates fitted with additional conduits and capacitors to bolster the effectiveness of energy weaponry. Special: Any of the robot’s attacks which deal energy damage inflict +1 @fos[DC] if the robot is fitted with any voltaic frame armor. This bonus increases by +1 @fos[DC] for every two additional locations fitted with Voltaic Frame (so +2 @fos[DC] for 3 pieces, or +3 @fos[DC] for 5 or more pieces)",
      fr: "Un ensemble de plaques d’armure de confection spéciale équipé de conduits et de condensateurs supplémentaires pour renforcer l’efficacité des armes à énergie. Spécial : toute attaque du robot infligeant des dégâts énergétiques inflige +1 @fos[DC] de dégâts si le robot est équipé d’au moins une pièce d’armure châssis voltaïque. Ce bonus augmente de +1 @fos[DC] par tranche de 2 localisations supplémentaires équipées d’un revêtement voltaïque (donc +2 @fos[DC] pour 3 pièces ou +3 @fos[DC] pour 5 pièces ou plus)."
    },
    hydraulic_frame: {
      sourceName: "Hydraulic Frame",
      ids: ["JDKYtZyqEV2lQvFx","OkcwSvkgUoyWp5s1","agLROEPeyQHPmptB","WfmNUwj6vf1J1B1D","D8Y0T7cpVY4XgXWq","QBX0JeYQ35RQR7N8"],
      en: "A specially made set of armor plates which conceal powerful hydraulics which enhance the robot’s movements. Special: Melee attacks made from arms fitted with a hydraulic frame inflict +1 @fos[DC] damage and gain the Stun damage effect.",
      fr: "Un ensemble de plaques d’armure de confection spéciale dissimulant de puissants systèmes hydrauliques qui augmentent la force des mouvements du robot. Spécial : les attaques de corps à corps portées avec des bras équipés d’un châssis hydraulique infligent +1 @fos[DC] de dégâts et gagnent l’effet de dégâts Étourdissant."
    }
  };

  const p148Rules = catalog.entries.filter(entry => entry.page === 148 && entry.type === "rule_text");
  assert.equal(p148Rules.length, 6);
  assert.deepEqual(new Set(p148Rules.map(entry => entry.sourceName)), new Set(Object.values(families).map(f => f.sourceName)));
  for (const rule of p148Rules) {
    assert.equal(rule.status, "out_of_scope");
    assert.equal(rule.certification.descriptionAppliedToItems, true);
    assert.equal(rule.certification.specialEffectReviewed, true);
    assert.equal(rule.certification.errataReviewed, true);
  }
  assert.equal(p148Rules.find(r => r.sourceName === "Noxious Plate").certification.englishArmReference, "serrated plate (as printed)");
  assert.equal(p148Rules.find(r => r.sourceName === "Toxic Plate").certification.englishArmReference, "serrated plate (as printed)");

  const htmlText = value => value
    .split('<section data-f2d20-recipe="core">')[0]
    .replace(/<[^>]+>/g, " ")
    .replace(/&rsquo;/g, "’")
    .replace(/\s+/g, " ")
    .trim();

  for (const language of ["en","fr"]) {
    const records = await generatedDocuments(language);
    const docs = new Map(records.filter(({pack}) => pack === "robot-armor").map(({document}) => [document._id, document]));
    for (const family of Object.values(families)) {
      for (const id of family.ids) {
        const doc = docs.get(id);
        assert.ok(doc, language + "/robot-armor/" + id + " missing");
        assert.equal(htmlText(doc.system.description), family[language], language + "/robot-armor/" + id + " p.148 text");
        assert.match(doc.system.description, /data-f2d20-recipe="core"/, language + "/robot-armor/" + id + " recipe retained");
        const entry = catalog.entries.find(candidate => candidate.documentId === id);
        assert.equal(entry.certification.descriptionReviewed, true, id + " description reviewed");
        assert.equal(entry.certification.descriptionSourcePage, 148, id + " description source page");
        assert.equal(entry.certification.specialEffectReviewed, true, id + " special effect reviewed");
      }
    }
  }
});
