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
    "Full Stock": "bRV8rXkptjU6mz9Y", "Marksman’s Stock": "Q6VUr8ae7Rf7WOhA", "Recoil-Compensating Stock": "pxflsyihN3fjKgYq",
    "Long Scope": "sg1EfJrr3S307XPy", "Short Night Vision Scope": "vyesQvmRObpdSNpO", "Long Night Vision Scope": "wvsSsznT8GDmdoUa",
    ".38 Receiver": "oiW2VvXVdhGgw4oL", ".308 Receiver": "ybNloPq9nZTqGAur", "Bayonet": "CYODpO6JvopXWYW7",
    "Shielded Barrel": "iiF3omvvTgVv5LoP", "Full Capacitors": "bS7ZxJKZA2JAhPV8", "Capacitor Boosting Coil": "6hh0Evmfv0N8kX81",
    ".50 Receiver": "XShTCPVSPhRDhMBo", "Muzzle Brake": "2aqYiSm1nrIYHgoA", "Sawed-off Barrel": "Iec8KCIeHqCk886z",
    "Finned Barrel": "aCMBNHf2jilKz2Zg", ".45 Receiver": "zpUwoy1BLHyUXuvy", "Automatic Piston": "nGgcu0NLeLIbc3Pi",
    "Marksman’s": "Q6VUr8ae7Rf7WOhA", "Recoil-Compensating": "pxflsyihN3fjKgYq"
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
    ["dh2R5SMlhGBmDuAU", { en:"Large Magazine", fr:"Grand chargeur", type:"magazine", prefixes:["High Capacity","Grande capacité"], weight:1, cost:8, perks:["Gun Nut 2","Fana d’armes 2"], fireRate:1, unreliable:1 }],
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
