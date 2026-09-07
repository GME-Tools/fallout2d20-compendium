import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID } from "./config.mjs";
import { slugify } from "./lib/files.mjs";

const diseases = {
  "Blood Worms": "Vers de sang", "Bone Worms": "Vers des os", "Buzz Brain": "Cerveau bourdonnant", Dysentery: "Dysenterie",
  "Fever Claw": "Griffe fiévreuse", "Flap Limb": "Membre flasque", "Glowing Pustules": "Pustules luminescentes",
  "Heat Flashes": "Bouffées de chaleur", "Jelly Fingers": "Doigts gélatineux", "Lock Joint": "Articulations bloquées",
  "Needle Spine": "Épine dorsale", Parasites: "Parasites", "Rad Worms": "Vers radioactifs", "Shell Shock": "Traumatisme de guerre",
  "Sludge Lung": "Poumon de vase", "Snot Ear": "Oreille purulente", "Swamp Gas": "Gaz des marais",
  "Swamp Itch": "Démangeaison des marais", "The Whoopsies": "La tremblote", "Weeping Sores": "Plaies suintantes"
};
const exact = {
  Antibiotics: "Antibiotiques", Asbestos: "Amiante", Beer: "Bière", "Blood Pack": "Poche de sang", "Blood Sac": "Poche de sang animal",
  Bloodleaf: "Feuille de sang", Bourbon: "Bourbon", Carrot: "Carotte", Corn: "Maïs", "Dirty Wastelander": "Habitant crasseux des Terres désolées",
  "Dirty Water": "Eau sale", "Food Paste": "Pâte nutritive", Gourd: "Courge", "Healing Salve": "Baume curatif",
  Hubflower: "Hubélie", "Institute Food Packet": "Ration alimentaire de l’Institut", "Irradiated Blood": "Sang irradié",
  Melon: "Melon", "Melon Juice": "Jus de melon", Moonshine: "Tord-boyaux", Mutfruit: "Mutfruit", "Mutfruit Juice": "Jus de mutfruit",
  "Noodle Cup": "Bol de nouilles", "Perfectly Preserved Pie": "Tarte parfaitement conservée", "Purified Water": "Eau purifiée",
  Razorgrain: "Caroubier", "Refreshing Beverage": "Boisson rafraîchissante", "Robot Repair Kit": "Kit de réparation de robot",
  Rum: "Rhum", "Silt Bean": "Haricot vaseux", "Skeeto Spit": "Crachat de moustique", "Stealth Boy": "Stealth Boy",
  "Stimpak Diffuser": "Diffuseur à Stimpak", "Super Stimpak": "Super Stimpak", "Sweet Roll": "Petit pain sucré",
  Tarberry: "Baie de goudron", "Tarberry Juice": "Jus de baie de goudron", Tato: "Tato", "Tato Juice": "Jus de tato",
  "Vegetable Soup": "Soupe de légumes", Vodka: "Vodka", Whiskey: "Whisky", Wine: "Vin"
};
const creature = {
  Bloatfly: "mouche bouffie", Bloodbug: "moustique sanguinaire", Brahmin: "brahmine", Deathclaw: "écorcheur",
  Mirelurk: "fangeux", "Mole Rat": "rataupe", "Mongrel Dog": "chien errant", "Mutant Hound": "molosse mutant",
  Radroach: "radcafard", Radscorpion: "radscorpion", Radstag: "radcerf", Squirrel: "écureuil", Stingwing: "aile venimeuse", "Yao Guai": "yao guai"
};

function consumable(name) {
  if (exact[name]) return exact[name];
  let n = name.replace(" (Preserved)", " (conservé)").replace(" (Diluted)", " (dilué)");
  for (const [en, fr] of Object.entries(creature)) n = n.replace(en, fr);
  const words = [["Baked ", "Cuit "], ["Cooked ", "Cuit "], ["Grilled ", "Grillé "], ["Roasted ", "Rôti "], ["Meat", "viande"], ["Steak", "steak"], ["Egg Omelette", "omelette aux œufs"], ["Egg", "œuf"], ["Omelette", "omelette"], ["Chops", "côtelettes"], ["Chunks", "morceaux"], ["Ribs", "côtes"], ["Roast", "rôti"], ["Stew", "ragoût"], ["Soup", "soupe"], ["Juice", "jus"], ["Gland", "glande"], ["Hide", "peau"], ["Stinger", "dard"], ["Barb", "barbillon"], ["Filet", "filet"], ["Bits", "morceaux"], ["on a Stick", "en brochette"]];
  for (const [en, fr] of words) n = n.replace(en, fr);
  return n;
}

async function localizePack(pack, translate) {
  const root = `src/packs/fr/${pack}.db`;
  for (const file of (await readdir(root)).filter(file => file.endsWith(".json"))) {
    const oldPath = path.join(root, file);
    const document = JSON.parse(await readFile(oldPath, "utf8"));
    document.name = translate(document.name);
    const provenance = document.flags[MODULE_ID].source;
    provenance.structuralBaseline = false;
    provenance.nameTranslationReviewed = false;
    provenance.translationReviewed = false;
    await writeFile(oldPath, `${JSON.stringify(document, null, 2)}\n`);
    const next = path.join(root, `${slugify(document.name)}__${document._id}.json`);
    if (next !== oldPath) await rename(oldPath, next);
  }
}

await localizePack("consumables", consumable);
await localizePack("addictions", name => name === "Mentat" ? "Mentats" : name);
await localizePack("diseases", name => diseases[name] ?? (() => { throw new Error(`Missing disease translation: ${name}`); })());
console.log("Localized consumable, addiction, and disease names.");
