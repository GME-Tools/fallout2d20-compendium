import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID, SOURCE_ID, documentKey } from "./config.mjs";
import { slugify } from "./lib/files.mjs";

const extractedTextPath = process.argv[2];
if (!extractedTextPath) {
  console.error("Usage: node scripts/import-french-weapons.mjs /path/to/weapons-fr-raw.txt");
  process.exit(2);
}
const raw = await readFile(extractedTextPath, "utf8");
const names = JSON.parse(await readFile("catalog/v1-core-weapon-fr-names.json", "utf8"));
const ammunitionNames = JSON.parse(await readFile("catalog/v1-core-ammunition-fr-names.json", "utf8"));
const englishRoot = "src/packs/en/weapons.db";
const frenchRoot = "src/packs/fr/weapons.db";

const officialHeadings = {
  ".44 Pistol": "PISTOLET .44", "10mm Pistol": "PISTOLET 10 MM", "Flare Gun": "PISTOLET LANCE-FUSÉES",
  "Assault Rifle": "FUSIL D’ASSAUT", "Combat Rifle": "CARABINE DE COMBAT", "Gauss Rifle": "FUSIL DE GAUSS",
  "Hunting Rifle": "FUSIL DE CHASSE", "Submachine Gun": "MITRAILLETTE", "Combat Shotgun": "FUSIL DE COMBAT",
  "Double-Barrel Shotgun": "FUSIL À DOUBLE CANON", "Pipe Bolt-Action": "ARME À VERROU DE FORTUNE",
  "Pipe Gun": "ARME DE FORTUNE", "Pipe Revolver": "REVOLVER DE FORTUNE", "Railway Rifle": "FUSIL À CLOUS",
  "Syringer": "PISTOLET À SERINGUES", "Institute Laser": "LASER DE L’INSTITUT", "Laser Musket": "MOUSQUET LASER",
  "Laser Gun": "ARME LASER", "Plasma Gun": "ARME PLASMA", "Gamma Gun": "PISTOLET GAMMA", "Fat Man": "FAT MAN",
  "Heavy Incinerator": "INCINÉRATEUR LOURD", "Junk Jet": "JUNK JET", "Flamer": "LANCE-FLAMMES",
  "Missile Launcher": "LANCE-MISSILES", "Gatling Laser": "LASER GATLING", "Minigun": "MINIGUN", "Sword": "ÉPÉE",
  "Combat Knife": "COUTEAU DE COMBAT", "Machete": "MACHETTE", "Ripper": "ÉVENTREUR", "Shishkebab": "FLAMBEUR",
  "Switchblade": "CRAN D’ARRÊT", "Baseball Bat": "BATTE DE BASEBALL", "Board": "PLANCHE", "Lead Pipe": "TUYAU DE PLOMB",
  "Pipe Wrench": "CLÉ SERRE-TUBE", "Pool Cue": "QUEUE DE BILLARD", "Rolling Pin": "ROULEAU À PÂTISSERIE",
  "Baton": "MATRAQUE", "Sledgehammer": "MASSE", "Super Sledge": "SUPER MASSE", "Tire Iron": "DÉMONTE-PNEU",
  "Walking Cane": "CANNE", "Boxing Glove": "GANT DE BOXE", "Deathclaw Gauntlet": "GANTELET D’ÉCORCHEUR",
  "Knuckles": "POING AMÉRICAIN", "Power Fist": "POING ASSISTÉ", "Throwing Knives": "COUTEAUX DE LANCER",
  "Tomahawk": "TOMAHAWK", "Javelin": "JAVELOT", "Molotov Cocktail": "COCKTAIL MOLOTOV",
  "Frag Grenade": "GRENADE À FRAGMENTATION", "Pulse Grenade": "GRENADE À IMPULSION", "Plasma Grenade": "GRENADE À PLASMA",
  "Nuka Grenade": "GRENADE NUKA", "Baseball Grenade": "GRENADE RONDE", "Bottlecap Mine": "MINE À CAPSULES",
  "Frag Mine": "MINE À FRAGMENTATION", "Pulse Mine": "MINE À IMPULSION", "Plasma Mine": "MINE À PLASMA", "Nuke Mine": "MINE NUCLÉAIRE"
};

const derivedFrom = {
  "10mm Auto Pistol": "10mm Pistol", "Aluminum Baseball Bat": "Baseball Bat",
  "Gun Bash": "Combat Rifle", "Gun Bash (1H)": ".44 Pistol", "Laser Emitter": "Laser Gun"
};
const supplementalDescriptions = {
  "Buzz-Saw": "<p>Une scie circulaire montée sur un bras robotique, conçue pour découper les matériaux et les adversaires à portée de main.</p>",
  "Handy Rock": "<p>Une pierre saisie et lancée par un Mister Handy.</p>",
  "Pincer": "<p>Une pince robotique robuste pouvant saisir, écraser ou frapper une cible.</p>",
  "Unarmed Strike": "<p>Une attaque portée sans arme, à coups de poing, de pied ou avec une autre partie du corps.</p>"
};

function clean(value) {
  return value.replace(/\f/g, " ").replace(/\n(?:VAULT-TEC|INTRODUCTION).*?\n/g, "\n")
    .replace(/\n\d+\s+(?:FALLOUT|Chapitre quatre).*?\n/g, "\n")
    .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2").replace(/\s+/g, " ").trim();
}

const located = Object.entries(officialHeadings).map(([english, heading]) => {
  const index = raw.indexOf(`\n${heading}\n`);
  if (index < 0) throw new Error(`Missing French weapon heading ${heading}`);
  return { english, heading, index };
}).sort((a, b) => a.index - b.index);
const descriptions = new Map(located.map((entry, index) => {
  const from = entry.index + entry.heading.length + 2;
  const until = located[index + 1]?.index ?? raw.indexOf("\nHABILLEMENT\n", from);
  return [entry.english, `<p>${clean(raw.slice(from, until))}</p>`];
}));

const englishDocuments = new Map();
for (const filename of (await readdir(englishRoot)).filter(file => file.endsWith(".json"))) {
  const document = JSON.parse(await readFile(path.join(englishRoot, filename), "utf8"));
  if (englishDocuments.has(document.name)) englishDocuments.set(`${document.name}#${document._id}`, document);
  else englishDocuments.set(document.name, document);
}
const sourceDocuments = [...englishDocuments.values()];
if (sourceDocuments.length !== 72) throw new Error(`Expected 72 English weapon documents, found ${sourceDocuments.length}`);

await rm(frenchRoot, { recursive: true, force: true });
await mkdir(frenchRoot, { recursive: true });
for (const source of sourceDocuments) {
  const englishName = source.name;
  const document = structuredClone(source);
  document.name = names[englishName];
  if (!document.name) throw new Error(`Missing French name for ${englishName}`);
  document.system.description = descriptions.get(englishName)
    ?? descriptions.get(derivedFrom[englishName])
    ?? supplementalDescriptions[englishName];
  if (!document.system.description) throw new Error(`Missing French description for ${englishName}`);
  if (ammunitionNames[document.system.ammo]) document.system.ammo = ammunitionNames[document.system.ammo];
  document._key = documentKey("Item", document._id);
  const sourceFlags = source.flags[MODULE_ID].source;
  document.flags[MODULE_ID].source = {
    book: SOURCE_ID, language: "fr", page: "95-121", translatedFrom: document._id,
    extraction: officialHeadings[englishName] ? "pdftotext-raw" : "derived",
    translationReviewed: false, diceSymbolsReviewed: false,
    errataReviewed: sourceFlags.errataReviewed ?? false,
    ...(sourceFlags.errata ? { errata: sourceFlags.errata } : {})
  };
  await writeFile(path.join(frenchRoot, `${slugify(document.name)}__${document._id}.json`), `${JSON.stringify(document, null, 2)}\n`);
}
console.log("Imported 72 French weapon documents from the official PDF and derived robot variants.");
