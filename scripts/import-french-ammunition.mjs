import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID, documentKey } from "./config.mjs";
import { getPublication } from "./data/publications.mjs";

const sourceId = getPublication("core_rulebook").id;
import { slugify } from "./lib/files.mjs";

const extractedTextPath = process.argv[2];
if (!extractedTextPath) {
  console.error("Usage: node scripts/import-french-ammunition.mjs /path/to/ammunition-fr-raw.txt");
  process.exit(2);
}

const raw = await readFile(extractedTextPath, "utf8");
const names = JSON.parse(await readFile("catalog/v1-core-ammunition-fr-names.json", "utf8"));
const englishRoot = "src/packs/en/ammunition.db";
const frenchRoot = "src/packs/fr/ammunition.db";

const headings = [
  [".38 Round", "CARTOUCHE .38"],
  ["10mm Round", "CARTOUCHE 10 MM"],
  [".308 Round", "CARTOUCHE .308"],
  ["Shotgun Shell", "CALIBRE 12"],
  ["Flare", "FUSÉE ÉCLAIRANTE"],
  [".45 Round", "CARTOUCHE .45"],
  ["Flamer Fuel", "CARBURANT DE LANCE-FLAMMES"],
  ["Fusion Cell", "CELLULE À FUSION"],
  ["Gamma Round", "CARTOUCHE GAMMA"],
  ["Railway Spike", "CLOU DE RAIL"],
  ["Syringer Ammo", "SERINGUE"],
  [".44 Magnum Round", "CARTOUCHE .44"],
  [".50 Round", "CALIBRE .50"],
  ["5.56mm Round", "CARTOUCHE 5,56 MM"],
  ["5mm Round", "CARTOUCHE 5 MM"],
  ["Fusion Core", "RÉACTEUR À FUSION"],
  ["Missile", "MISSILE"],
  ["Plasma Cartridge", "CARTOUCHE AU PLASMA"],
  ["2mm Electromagnetic Cartridge", "CE 2 MM"],
  ["Mini-Nuke", "MINI-BOMBE NUCLÉAIRE"]
];

function cleanText(value) {
  return value
    .replace(/\f/g, " ")
    .replace(/\n(?:VAULT-TEC|INTRODUCTION).*?\n/g, "\n")
    .replace(/\n\d+\s+(?:FALLOUT|Chapitre quatre).*?\n/g, "\n")
    .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function descriptionSections() {
  const start = raw.indexOf("\nCARTOUCHE .38\n", raw.indexOf("Chapitre quatre"));
  if (start < 0) throw new Error("Could not locate the French ammunition descriptions");
  const body = raw.slice(start);
  const located = headings.map(([english, heading]) => {
    const index = body.indexOf(`\n${heading}\n`);
    if (index < 0) throw new Error(`Missing French heading ${heading}`);
    return { english, heading, index };
  }).sort((a, b) => a.index - b.index);
  return new Map(located.map((entry, index) => {
    const from = entry.index + entry.heading.length + 2;
    const until = located[index + 1]?.index ?? body.length;
    return [entry.english, cleanText(body.slice(from, until))];
  }));
}

const descriptions = descriptionSections();
const englishDocuments = new Map();
for (const filename of (await readdir(englishRoot)).filter(file => file.endsWith(".json"))) {
  const document = JSON.parse(await readFile(path.join(englishRoot, filename), "utf8"));
  englishDocuments.set(document.name, document);
}
if (englishDocuments.size !== 20) throw new Error(`Expected 20 English ammunition documents, found ${englishDocuments.size}`);

await rm(frenchRoot, { recursive: true, force: true });
await mkdir(frenchRoot, { recursive: true });
for (const [englishName, frenchName] of Object.entries(names)) {
  const document = structuredClone(englishDocuments.get(englishName));
  if (!document) throw new Error(`No English ammunition source for ${englishName}`);
  document.name = frenchName;
  document.system.description = `<p>${descriptions.get(englishName)}</p>`;
  if (englishName === "Fusion Core") {
    document.system.description = document.system.description.replace("Farfouilleur ne permet pas", "Farfouilleur ne permet pas");
  }
  document._key = documentKey("Item", document._id);
  const source = document.flags[MODULE_ID].source;
  document.flags[MODULE_ID].source = {
    book: sourceId,
    language: "fr",
    page: "91-94",
    translatedFrom: document._id,
    extraction: "pdftotext-raw",
    translationReviewed: false,
    diceSymbolsReviewed: true,
    errataReviewed: source.errataReviewed ?? false,
    ...(source.errata ? { errata: source.errata } : {})
  };
  await writeFile(path.join(frenchRoot, `${slugify(frenchName)}__${document._id}.json`), `${JSON.stringify(document, null, 2)}\n`);
}
console.log("Imported 20 French ammunition documents from the official PDF.");
