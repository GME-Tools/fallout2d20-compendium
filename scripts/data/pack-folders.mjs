import { createHash } from "node:crypto";

const labels = (en, fr) => ({ en, fr });
const folder = (key, en, fr, parent = null) => ({ key, label: labels(en, fr), parent });

const publicationSeries = [
  ["tesla", "Tesla Science Magazine", "Tesla Science Magazine"],
  ["live-love", "Live & Love", "Live & Love"],
  ["backwoodsman", "Backwoodsman", "Backwoodsman"],
  ["awesome-tales", "Astoundingly Awesome Tales", "Astoundingly Awesome Tales"],
  ["guns-bullets", "Guns and Bullets", "Guns and Bullets"],
  ["grognak", "Grognak the Barbarian", "Grognak le Barbare"],
  ["tumblers", "Tumblers Today", "Tumblers Today"],
  ["misc-magazines", "Other Magazines", "Autres magazines"],
  ["unstoppables", "The Unstoppables", "Les Imbattables"],
  ["survival-guide", "Wasteland Survival Guide", "Guide de survie des Terres désolées"],
  ["covert-operations", "U.S. Covert Operations Manual", "Manuel des opérations secrètes des États-Unis"]
];

const weaponTypes = {
  bigGuns: labels("Big Guns", "Armes lourdes"),
  energyWeapons: labels("Energy Weapons", "Armes à énergie"),
  explosives: labels("Explosives", "Explosifs"),
  meleeWeapons: labels("Melee Weapons", "Armes de corps à corps"),
  smallGuns: labels("Small Guns", "Armes légères"),
  throwing: labels("Throwing Weapons", "Armes de lancer"),
  unarmed: labels("Unarmed", "Mains nues")
};

const modTypes = {
  barrel: labels("Barrels", "Canons"), capacitor: labels("Capacitors", "Condensateurs"),
  dish: labels("Dishes", "Paraboles"), fuel: labels("Fuel", "Carburant"),
  grip: labels("Grips", "Poignées"), magazine: labels("Magazines", "Chargeurs"),
  melee: labels("Melee Modifications", "Mods de corps à corps"), muzzle: labels("Muzzles", "Embouts"),
  nozzle: labels("Nozzles", "Buses"), propellantTank: labels("Propellant Tanks", "Réservoirs de carburant"),
  receiver: labels("Receivers", "Boîtiers"), sight: labels("Sights", "Viseurs"),
  stock: labels("Stocks", "Crosses")
};

const weaponModPairs = [
  "bigGuns/barrel", "bigGuns/capacitor", "bigGuns/fuel", "bigGuns/melee", "bigGuns/muzzle", "bigGuns/nozzle", "bigGuns/propellantTank", "bigGuns/sight", "bigGuns/stock",
  "energyWeapons/barrel", "energyWeapons/capacitor", "energyWeapons/dish", "energyWeapons/muzzle", "energyWeapons/sight", "energyWeapons/stock",
  "meleeWeapons/melee", "smallGuns/barrel", "smallGuns/capacitor", "smallGuns/grip", "smallGuns/magazine", "smallGuns/muzzle", "smallGuns/receiver", "smallGuns/sight", "smallGuns/stock", "unarmed/melee"
];

export const PACK_FOLDER_DEFINITIONS = {
  apparel: [
    folder("armor", "Armor", "Armures"), folder("outfits", "Outfits", "Tenues"), folder("power-armor", "Power Armor", "Armures assistées"),
    ...[["combat", "Combat Armor", "Armure de combat"], ["dog", "Dog Armor", "Armure pour chien"], ["leather", "Leather Armor", "Armure de cuir"], ["metal", "Metal Armor", "Armure de métal"], ["raider", "Raider Armor", "Armure de pillard"], ["synth", "Synth Armor", "Armure de synthétique"], ["vault-security", "Vault-Tec Security Armor", "Armure de sécurité Vault-Tec"]].map(x => folder(`armor-${x[0]}`, x[1], x[2], "armor")),
    folder("headgear", "Headgear", "Couvre-chefs", "outfits"), folder("clothing", "Clothing", "Vêtements", "outfits"), folder("outfit", "Full Outfits", "Tenues complètes", "outfits"),
    ...[["frame", "Armor Frames", "Châssis"], ["raider", "Raider", "Pillard"], ["t45", "T-45", "T-45"], ["t51", "T-51", "T-51"], ["t60", "T-60", "T-60"], ["x01", "X-01", "X-01"]].map(x => folder(`power-${x[0]}`, x[1], x[2], "power-armor"))
  ],
  "apparel-mods": [
    folder("armor", "Armor", "Armures"), folder("clothing", "Clothing", "Vêtements"), folder("power-armor", "Power Armor", "Armures assistées"),
    folder("armor-material", "Materials", "Matériaux", "armor"), folder("armor-upgrade", "Upgrades", "Améliorations", "armor"),
    ...[["combat", "Combat Armor", "Armure de combat"], ["leather", "Leather Armor", "Armure de cuir"], ["metal", "Metal Armor", "Armure de métal"], ["synth", "Synth Armor", "Armure de synthétique"]].map(x => folder(`material-${x[0]}`, x[1], x[2], "armor-material")),
    ...[["arms", "Arms", "Bras"], ["torso", "Torso", "Torse"], ["legs", "Legs", "Jambes"], ["general", "General", "Général"]].map(x => folder(`upgrade-${x[0]}`, x[1], x[2], "armor-upgrade")),
    folder("clothing-lining", "Linings", "Doublures", "clothing"),
    folder("power-plating", "Plating", "Blindages", "power-armor"), folder("power-systems", "Systems", "Systèmes", "power-armor"), folder("power-upgrades", "Model Upgrades", "Améliorations de modèles", "power-armor"),
    ...[["raider", "Raider", "Pillard"], ["t45", "T-45", "T-45"], ["t51", "T-51", "T-51"], ["t60", "T-60", "T-60"], ["x01", "X-01", "X-01"]].map(x => folder(`power-upgrade-${x[0]}`, x[1], x[2], "power-upgrades"))
  ],
  "books-and-magazines": publicationSeries.map(x => folder(x[0], x[1], x[2])),
  consumables: [folder("chems", "Chems", "Drogues"), folder("ingredients", "Ingredients", "Ingrédients"), folder("food", "Food", "Nourriture"), folder("beverages", "Beverages", "Boissons"), folder("other", "Other Consumables", "Autres consommables")],
  denizens: ["animals-insects", "mutated-humanoids", "robots", "super-mutants", "synths", "turrets", "brotherhood", "raiders", "wastelanders", "adventure", "starter-set"].map((key, index) => folder(key, ["Animals and Insects", "Mutated Humanoids", "Robots", "Super Mutants", "Synths", "Turrets", "Brotherhood of Steel", "Raiders", "Wastelanders", "With a Bang, or a Whimper", "Starter Set"][index], ["Animaux et insectes", "Humanoïdes mutants", "Robots", "Super mutants", "Synthétiques", "Tourelles", "Confrérie de l’Acier", "Pillards", "Résidents des Terres désolées", "Il était une fois dans le Commonwealth", "Kit d’initiation"][index])),
  perks: [folder("magazine-perks", "Magazine Perks", "Aptitudes de magazines"), ...publicationSeries.map(x => folder(`magazine-${x[0]}`, x[1], x[2], "magazine-perks"))],
  "robot-armor": [["actuated", "Actuated Frame", "Châssis actionné"], ["factory", "Factory Armor", "Blindage d’usine"], ["hydraulic", "Hydraulic Frame", "Châssis hydraulique"], ["gutsy", "Mister Gutsy Plating", "Blindage de Mister Gutsy"], ["noxious", "Noxious Plate", "Plaque nocive"], ["primal", "Primal Plate", "Plaque primitive"], ["serrated", "Serrated Plate", "Plaque dentelée"], ["standard", "Standard Plating", "Blindage standard"], ["toxic", "Toxic Plate", "Plaque toxique"], ["voltaic", "Voltaic Frame", "Châssis voltaïque"]].map(x => folder(x[0], x[1], x[2])),
  "roll-tables": [
    folder("core", "Core Rulebook", "Livre de règles"), folder("character", "Character Creation", "Création de personnage", "core"), folder("publications", "Publications", "Publications", "core"), folder("equipment", "Equipment", "Équipement", "core"),
    folder("armor-clothing", "Armor and Clothing", "Armures et vêtements", "equipment"), folder("food-chems", "Food, Beverages and Chems", "Nourriture, boissons et drogues", "equipment"), folder("weapons-ammo", "Weapons and Ammunition", "Armes et munitions", "equipment"),
    folder("encounters", "Encounters", "Rencontres", "core"), folder("vaults", "Vaults", "Abris", "core"),
    folder("gamemaster-toolkit", "GM Toolkit", "Kit du MJ"), folder("gm-locations", "Locations", "Lieux", "gamemaster-toolkit"), folder("gm-encounters", "Encounters", "Rencontres", "gamemaster-toolkit"),
    folder("starter-set", "Starter Set", "Kit d’initiation")
  ],
  weapons: Object.entries(weaponTypes).map(([key, value]) => folder(key, value.en, value.fr)),
  "weapon-mods": [
    ...["bigGuns", "energyWeapons", "meleeWeapons", "smallGuns", "unarmed"].map(key => folder(key, weaponTypes[key].en, weaponTypes[key].fr)),
    ...weaponModPairs.map(pair => { const [weapon, mod] = pair.split("/"); return folder(`${weapon}-${mod}`, modTypes[mod].en, modTypes[mod].fr, weapon); })
  ]
};

export function folderId(pack, key) {
  return createHash("sha256").update(`fallout2d20-compendium:${pack}:${key}`).digest("hex").slice(0, 16);
}

export function folderKeyForDocument(pack, document) {
  return document.$folder ?? null;
}

export function folderRecords(language, pack) {
  const definitions = PACK_FOLDER_DEFINITIONS[pack.name] ?? [];
  return definitions.map((definition, index) => {
    const id = folderId(pack.name, definition.key);
    return {
      name: definition.label[language], sorting: "a", folder: definition.parent ? folderId(pack.name, definition.parent) : null,
      type: pack.type, _id: id, sort: (index + 1) * 100000, color: null, description: "", flags: {}, _stats: {}, _key: `!folders!${id}`
    };
  });
}
