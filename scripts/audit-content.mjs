import { readFile } from "node:fs/promises";
import path from "node:path";
import { LANGUAGES, PACKS } from "./config.mjs";
import { listFiles } from "./lib/files.mjs";
import { validateProvenance } from "./lib/provenance.mjs";
import { PUBLICATIONS } from "./data/publications.mjs";

const rows = [];
const issues = [];
const publicationCounts = Object.fromEntries(Object.entries(PUBLICATIONS).map(([id, publication]) => [id, {
  firstAppearances: 0,
  secondaryAppearances: 0,
  languages: [...publication.languages],
  editions: Object.fromEntries(publication.languages.map(language => [language, publication.editions[language].map(edition => ({
    id: edition.id, translation: edition.translation, errata: [...edition.errata]
  }))]))
}]));

function isRootDocument(document) {
  return /^!(?:items|actors|tables)![^.!]+$/.test(document._key ?? "");
}

function editorialText(value) {
  return (value ?? "")
    .replace(/\s*<section data-f2d20-recipe=["']core["']>[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

const extractionMarkers = [
  "VAULT-TEC LE COMMONWEALTH",
  "INTRODUCTION RÈGLES DU JEU",
  "MOD AJOUT AU NOM",
  "TYPE D’ARME VALEUR DE DÉGÂTS"
];
for (const pack of PACKS) {
  const row = { pack: pack.name, type: pack.type };
  const documentsByLanguage = {};
  for (const language of LANGUAGES) {
    const files = await listFiles(path.resolve("generated/source-packs", language, `${pack.name}.db`), file => file.endsWith(".json"));
    row[language] = 0;
    row[`${language}ErrataReviewed`] = 0;
    row[`${language}ImageWarnings`] = 0;
    row[`${language}TranslationReviewed`] = 0;
    row[`${language}StructuralBaseline`] = 0;
    documentsByLanguage[language] = new Map();
    for (const file of files) {
      const document = JSON.parse(await readFile(file, "utf8"));
      if (!isRootDocument(document)) continue;
      const provenance = validateProvenance(document, { language });
      publicationCounts[provenance.book].firstAppearances++;
      for (const appearance of provenance.appearances) {
        publicationCounts[appearance.book].secondaryAppearances++;
      }
      documentsByLanguage[language].set(document._id, document);
      row[language]++;
      if (document.flags?.["fallout2d20-compendium"]?.source?.errataReviewed) row[`${language}ErrataReviewed`]++;
      if (provenance?.translationReviewed) row[`${language}TranslationReviewed`]++;
      if (provenance?.structuralBaseline) row[`${language}StructuralBaseline`]++;
    }
  }
  row.frUntranslatedNames = 0;
  row.frUntranslatedDescriptions = 0;
  row.frUntranslatedOtherText = 0;
  row.frUntranslatedBiographies = 0;
  row.frUntranslatedEmbeddedNames = 0;
  row.frUntranslatedEmbeddedText = 0;
  row.frExtractionBleed = 0;
  for (const [id, english] of documentsByLanguage.en) {
    const french = documentsByLanguage.fr.get(id);
    if (!french) continue;
    if (english.name && english.name === french.name) row.frUntranslatedNames++;
    if (editorialText(english.system?.description) && editorialText(english.system.description) === editorialText(french.system?.description)) {
      row.frUntranslatedDescriptions++;
      issues.push({ pack: pack.name, id, name: french.name, kind: "untranslated-description" });
    }
    for (const field of ["effect", "summary"]) {
      if (editorialText(english.system?.[field]) && editorialText(english.system[field]) === editorialText(french.system?.[field])) {
        row.frUntranslatedOtherText++;
        issues.push({ pack: pack.name, id, name: french.name, field, kind: "untranslated-text" });
      }
    }
    if (english.system?.biography && english.system.biography === french.system?.biography) row.frUntranslatedBiographies++;
    const frenchItems = new Map((french.items ?? []).map(item => [item._id, item]));
    for (const englishItem of english.items ?? []) {
      const frenchItem = frenchItems.get(englishItem._id);
      if (!frenchItem) continue;
      if (englishItem.name && englishItem.name === frenchItem.name) row.frUntranslatedEmbeddedNames++;
      for (const field of ["description", "effect", "summary"]) {
        if (editorialText(englishItem.system?.[field]) && editorialText(englishItem.system[field]) === editorialText(frenchItem.system?.[field])) {
          row.frUntranslatedEmbeddedText++;
          issues.push({ pack: pack.name, id, name: french.name, embeddedId: englishItem._id, embeddedName: frenchItem.name, field, kind: "untranslated-embedded-text" });
        }
      }
    }
    const serialized = JSON.stringify(french);
    const markers = extractionMarkers.filter(marker => serialized.includes(marker));
    if (markers.length) {
      row.frExtractionBleed++;
      issues.push({ pack: pack.name, id, name: french.name, kind: "pdf-extraction-bleed", markers });
    }
  }
  rows.push(row);
}

const totals = Object.fromEntries(LANGUAGES.map(language => [language, rows.reduce((sum, row) => sum + row[language], 0)]));
console.log(`Audited content (EN ${totals.en}, FR ${totals.fr}; ${issues.length} actionable issue(s)).`);
for (const issue of issues) console.error(`ERROR ${JSON.stringify(issue)}`);
if (issues.length) process.exitCode = 1;
