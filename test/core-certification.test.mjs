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
    assert.equal(entry.certification.acceptedModsReviewed, false);
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
    assert.equal(entry.certification.descriptionReviewed, false);
    assert.equal(entry.certification.acceptedModsReviewed, false);
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
    assert.equal(entry.certification.acceptedModsReviewed, false);
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
