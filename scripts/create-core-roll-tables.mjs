import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { CORE_ROLL_TABLES } from "./data/core-roll-tables.mjs";
import { MODULE_ID, documentKey, packId } from "./config.mjs";
import { getPublication } from "./data/publications.mjs";

const sourceId = getPublication("core_rulebook").id;
import { slugify } from "./lib/files.mjs";

const trinkets = {
  en: { name: "Random Trinkets", results: ["A gold pocket watch", "A garbled holodisk", "A brightly colored bandanna", "A silver locket", "Medal", "Potted plant", "Tickets to a pre-war event", "Wedding ring", "Pre-war party invitation", "An engraved flip lighter", "Loaded casino dice", "ID card", "Cosmetics case", "Musical instrument", "Broken eyeglasses", "Necklace made of junk", "Pages of an unfinished story", "Overdue library book", "A postcard with an address", "A pre-war neck-tie"] },
  fr: { name: "Babioles aléatoires", results: ["Montre à gousset en or", "Holodisque brouillé", "Bandana aux couleurs vives", "Médaillon en argent", "Médaille", "Plante en pot", "Tickets pour un événement d’avant-guerre", "Alliance", "Invitation à une fête d’avant-guerre", "Briquet-tempête gravé", "Dés de casino pipés", "Carte d’identité", "Mallette de cosmétiques", "Instrument de musique", "Lunettes cassées", "Collier fait de bric-à-brac", "Pages d’une histoire non terminée", "Livre de bibliothèque jamais rendu", "Carte postale avec adresse", "Cravate d’avant-guerre"] }
};
const publicationNames = { "Grognak the Barbarian": "Grognak le Barbare", "Guns and Bullets": "Armes et munitions", "Live & Love": "Vivre et aimer", "Tumblers Today": "Serrures d’aujourd’hui", Unstoppables: "Les Imbattables", "U.S. Covert Operations Manual": "Manuel des opérations secrètes des États-Unis", "Wasteland Survival Guide": "Guide de survie des Terres désolées" };
const publicationTables = { "Astoundingly Awesome Tales": "astoundingly-awesome-tales", Backwoodsman: "backwoodsman", "Grognak the Barbarian": "grognak", "Guns and Bullets": "guns-and-bullets", "Live & Love": "live-and-love", "Tesla Science Magazine": "tesla-science", "Tumblers Today": "tumblers-today", Unstoppables: "unstoppables", "U.S. Covert Operations Manual": "covert-operations", "Wasteland Survival Guide": "wasteland-survival-guide" };
const resultTranslations = { "Re-roll result": "Relancez le résultat", "Re-roll on this table.": "Relancez sur cette table.", Empty: "Vide", "1+2 CD glass bottles": "1+2 DC bouteilles en verre", "Junk; salvage each for 2 common materials.": "Bric-à-brac ; chacune fournit 2 matériaux fréquents.", "Magazine (see Random Publication)": "Magazine (voir Publication aléatoire)" };
const itemAliases = { "Utility Overalls": "Utility Coveralls", "Throwing Knive": "Throwing Knives" };

function stableId(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return [...createHash("sha256").update(value).digest().subarray(0, 16)].map((byte) => alphabet[byte % alphabet.length]).join("");
}

async function itemIndex(language) {
  const index = new Map();
  for (const pack of ["ammunition", "weapons", "apparel", "consumables", "miscellany", "robot-modules", "books-and-magazines", "diseases"]) {
    const root = path.join("src", "packs", language, `${pack}.db`);
    for (const filename of (await readdir(root)).filter((file) => file.endsWith(".json"))) {
      const document = JSON.parse(await readFile(path.join(root, filename), "utf8"));
      if (document._key === `!items!${document._id}` && !index.has(document._id)) index.set(document._id, { document, pack });
    }
  }
  return index;
}

const english = await itemIndex("en");
const french = await itemIndex("fr");
const normalizeName = (value) => value.replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
const englishByName = new Map([...english.values()].map((entry) => [normalizeName(entry.document.name), entry]));
const pairedNames = [...english.values()].map((source) => [source.document.name, french.get(source.document._id)?.document.name]).filter(([, translated]) => translated).sort(([left], [right]) => right.length - left.length);
const freeTextTranslations = {
  "X-01 Power Armor Piece": "Pièce d’armure assistée X-01", "T-60 Power Armor Piece": "Pièce d’armure assistée T-60", "T-51 Power Armor Piece": "Pièce d’armure assistée T-51", "T-45 Power Armor Piece": "Pièce d’armure assistée T-45", "Raider Power Armor Piece": "Pièce d’armure assistée de pillard", "Power Armor Frame": "Châssis d’armure assistée", "Plasma Pistol": "Pistolet plasma", "Laser Rifle": "Fusil laser", "Institute Laser Rifle": "Fusil laser de l’Institut", "Pipe Rifle": "Fusil de fortune", "Auto Pipe Gun": "Arme automatique de fortune", "Pipe Bolt Action Rifle": "Fusil à verrou de fortune", "Scoped Hunting Rifle": "Fusil de chasse à lunette", "Institute Laser Pistol": "Pistolet laser de l’Institut", "Laser Pistol": "Pistolet laser", "Plasma Rifle": "Fusil plasma", "Long Barrel": "Canon long", "Standard Stock": "Crosse standard", "Automatic Receiver": "Culasse automatique", "Short Scope": "Lunette courte", "Pre-War Money": "Argent d’avant-guerre", "Caps": "capsules", "Container, Locked": "Conteneur verrouillé", Container: "Conteneur", "Note or Holotape": "Note ou holobande", Key: "Clé", Magazine: "Magazine", "see Random Publication": "voir Publication aléatoire", "Signal Flares": "Fusées de signalisation", "Bobby Pins": "Épingles à cheveux"
};

function translateFreeText(value = "") {
  let translated = value;
  for (const [name, localized] of pairedNames) translated = translated.replaceAll(name, localized);
  for (const [name, localized] of Object.entries(freeTextTranslations).sort(([left], [right]) => right.length - left.length)) translated = translated.replaceAll(name, localized);
  return translated.replaceAll("CD", "DC");
}

function localizedResult(language, result) {
  const fallbackName = language === "fr" ? translateFreeText(result.frName ?? resultTranslations[result.name] ?? result.name) : result.name;
  const fallbackDescription = language === "fr" ? translateFreeText(result.frDescription ?? resultTranslations[result.description] ?? result.description ?? "") : result.description ?? "";
  if (!result.link) return { name: fallbackName, description: fallbackDescription };
  const source = englishByName.get(normalizeName(itemAliases[result.link.name] ?? result.link.name));
  if (!source) throw new Error(`Roll-table link target not found: ${result.link.pack}/${result.link.name}`);
  const target = language === "en" ? source : french.get(source.document._id);
  if (!target || target.pack !== result.link.pack) throw new Error(`Missing ${language} roll-table target for ${result.link.name}`);
  let label = result.name;
  if (language === "fr") {
    if (normalizeName(result.name) === normalizeName(result.link.name)) label = target.document.name;
    else if (normalizeName(result.name).includes(normalizeName(result.link.name))) label = result.name.replace(result.link.name, target.document.name).replace("non-irradiated", "non irradié").replaceAll("CD", "DC");
    else label = `${target.document.name} — ${result.name.replaceAll("CD", "DC")}`;
  }
  const uuid = `Compendium.${MODULE_ID}.${packId(language, target.pack)}.Item.${target.document._id}`;
  return { name: label, description: `@UUID[${uuid}]{${label}}${fallbackDescription ? ` — ${fallbackDescription}` : ""}` };
}

async function writeTable(language, definition, root) {
  const tableId = stableId(`core:${definition.key}`);
  const resultIds = definition.results.map((_, index) => stableId(`core:${definition.key}:${index + 1}`));
  const table = { _id: tableId, _key: documentKey("RollTable", tableId), name: definition.names[language], description: `<p>${language === "fr" ? "Table du Livre de base" : "Core Rulebook table"}, p. ${definition.page}.</p>`, img: "icons/svg/d20-grey.svg", formula: definition.formula, replacement: true, displayRoll: true, folder: null, results: resultIds, flags: { [MODULE_ID]: { source: { book: sourceId, language, page: definition.page, errataReviewed: true } } } };
  await writeFile(path.join(root, `${slugify(table.name)}__${tableId}.json`), `${JSON.stringify(table, null, 2)}\n`);
  for (let index = 0; index < definition.results.length; index++) {
    const source = definition.results[index], resultId = resultIds[index], localized = localizedResult(language, source);
    const nestedTable = source.tableLink;
    const result = { _id: resultId, _key: `!tables.results!${tableId}.${resultId}`, name: localized.name, description: localized.description || localized.name, type: nestedTable ? "pack" : "text", img: "icons/svg/d20-black.svg", weight: 1, range: source.range, drawn: false,
      ...(nestedTable ? { documentCollection: `${MODULE_ID}.${packId(language, "roll-tables")}`, documentId: stableId(`core:${nestedTable}`) } : {}) };
    await writeFile(path.join(root, `${slugify(definition.key)}_${String(index + 1).padStart(2, "0")}__${resultId}.json`), `${JSON.stringify(result, null, 2)}\n`);
  }
}

for (const language of ["en", "fr"]) {
  const root = path.join("src", "packs", language, "roll-tables.db");
  await rm(root, { recursive: true, force: true });
  await mkdir(root, { recursive: true });
  const personal = trinkets[language];
  await writeTable(language, { key: "random-trinkets", page: 80, formula: "1d20", names: { [language]: personal.name }, results: personal.results.map((name, index) => ({ range: [index + 1, index + 1], name })) }, root);
  for (const source of CORE_ROLL_TABLES) {
    const definition = structuredClone(source);
    if (definition.key === "random-publication") definition.results = definition.results.map((result) => {
      const tableLink = publicationTables[result.name];
      const linkedItem = tableLink ? {} : { link: { name: result.name.replace(/[’‘]/g, "'"), pack: "books-and-magazines" } };
      return { ...result, ...linkedItem, ...(tableLink ? { tableLink } : {}), ...(language === "fr" ? { name: publicationNames[result.name] ?? result.name } : {}) };
    });
    await writeTable(language, definition, root);
  }
}

console.log(`Created ${CORE_ROLL_TABLES.length + 1} EN/FR Core roll tables.`);
