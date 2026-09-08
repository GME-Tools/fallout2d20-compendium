import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID, documentKey } from "./config.mjs";
import { getPublication } from "./data/publications.mjs";

const sourceId = getPublication("core_rulebook").id;
import { slugify } from "./lib/files.mjs";

const extractedTextPath = process.argv[2];
if (!extractedTextPath) {
  console.error("Usage: node scripts/import-french-perks.mjs /path/to/perks-fr-raw.txt");
  process.exit(2);
}
const extractedText = await readFile(extractedTextPath, "utf8");

const nameMap = JSON.parse(await readFile("catalog/v1-core-perk-fr-names.json", "utf8"));
const inverseNames = new Map(Object.entries(nameMap).map(([english, french]) => [normalize(french), english]));
const englishRoot = "src/packs/en/perks.db";
const frenchRoot = "src/packs/fr/perks.db";

function normalize(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function cleanBody(lines) {
  const useful = lines.map(line => line.replaceAll("\f", "").trim()).filter(line => {
    if (!line) return false;
    if (/^(INTRODUCTION|VAULT-TEC)/.test(line)) return false;
    if (/^Chapitre Trois/.test(line)) return false;
    if (/^\d+\s+FALLOUT/.test(line) || /^\d+$/.test(line)) return false;
    return true;
  });
  let text = "";
  for (const line of useful) {
    if (text.endsWith("-")) text = text.slice(0, -1) + line;
    else text += `${text ? " " : ""}${line}`;
  }
  return `<p>${escapeHtml(text)}</p>`;
}

const lines = extractedText.split(/\r?\n/);
const headings = [];
for (let index = 0; index < lines.length - 1; index++) {
  if (/^Rangs\s*:/.test(lines[index + 1].trim())) headings.push({ index, french: lines[index].trim() });
}
if (headings.length !== 94) throw new Error(`Expected 94 French perks in PDF extraction, found ${headings.length}`);

const englishDocuments = new Map();
for (const filename of (await readdir(englishRoot)).filter(file => file.endsWith(".json"))) {
  const document = JSON.parse(await readFile(path.join(englishRoot, filename), "utf8"));
  englishDocuments.set(document.name, document);
}

await rm(frenchRoot, { recursive: true, force: true });
await mkdir(frenchRoot, { recursive: true });
for (let position = 0; position < headings.length; position++) {
  const heading = headings[position];
  const englishName = inverseNames.get(normalize(heading.french));
  if (!englishName) throw new Error(`No English mapping for French perk ${heading.french}`);
  const document = structuredClone(englishDocuments.get(englishName));
  if (!document) throw new Error(`No English source document for ${englishName}`);
  const end = headings[position + 1]?.index ?? lines.length;
  document.name = nameMap[englishName];
  document.system.description = cleanBody(lines.slice(heading.index + 1, end));
  if (englishName === "Barbarian") {
    document.system.description = document.system.description.replaceAll("RD balistiques", "RD balistiques et énergétiques");
  }
  document._key = documentKey("Item", document._id);
  const englishSource = document.flags[MODULE_ID].source;
  document.flags[MODULE_ID].source = {
    book: sourceId,
    language: "fr",
    page: "59-73",
    translatedFrom: document._id,
    extraction: "pdftotext-raw",
    translationReviewed: false,
    diceSymbolsReviewed: false,
    errataReviewed: englishSource.errataReviewed ?? false,
    ...(englishSource.errata ? { errata: englishSource.errata } : {})
  };
  await writeFile(path.join(frenchRoot, `${slugify(document.name)}__${document._id}.json`), `${JSON.stringify(document, null, 2)}\n`);
}
console.log("Imported 94 French character perks from the official PDF; editorial and dice-symbol review remains required.");
