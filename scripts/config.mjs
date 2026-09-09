export const MODULE_ID = "fallout2d20-compendium";
export const LANGUAGES = ["en", "fr"];

export const PACKS = [
  { name: "skills", label: { en: "Skills", fr: "Compétences" }, type: "Item" },
  { name: "traits", label: { en: "Traits", fr: "Traits" }, type: "Item" },
  { name: "perks", label: { en: "Perks", fr: "Aptitudes" }, type: "Item" },
  { name: "ammunition", label: { en: "Ammunition", fr: "Munitions" }, type: "Item" },
  { name: "weapons", label: { en: "Weapons", fr: "Armes" }, type: "Item" },
  { name: "weapon-mods", label: { en: "Weapon Mods", fr: "Mods d'armes" }, type: "Item" },
  { name: "apparel", label: { en: "Apparel", fr: "Tenues et armures" }, type: "Item" },
  { name: "apparel-mods", label: { en: "Apparel Mods", fr: "Mods de tenues et armures" }, type: "Item" },
  { name: "robot-armor", label: { en: "Robot Armor", fr: "Blindages de robot" }, type: "Item" },
  { name: "robot-modules", label: { en: "Robot Modules", fr: "Modules de robot" }, type: "Item" },
  { name: "consumables", label: { en: "Consumables", fr: "Consommables" }, type: "Item" },
  { name: "addictions", label: { en: "Addictions", fr: "Addictions" }, type: "Item" },
  { name: "diseases", label: { en: "Diseases", fr: "Maladies" }, type: "Item" },
  { name: "books-and-magazines", label: { en: "Books and Magazines", fr: "Livres et magazines" }, type: "Item" },
  { name: "miscellany", label: { en: "Miscellany", fr: "Objets divers" }, type: "Item" },
  { name: "crafting-stations", label: { en: "Crafting Stations", fr: "Établis de fabrication" }, type: "Item" },
  { name: "denizens", label: { en: "Denizens of the Wasteland", fr: "Résidents des Terres désolées" }, type: "Actor" },
  { name: "roll-tables", label: { en: "Roll Tables", fr: "Tables aléatoires" }, type: "RollTable" }
];

export const LEGACY_PACK_MAP = {
  "ammunition": "ammunition",
  "apparel-mods": "apparel-mods",
  "apparel": "apparel",
  "books-and-magazines": "books-and-magazines",
  "consumables": "consumables",
  "perks": "perks",
  "robot-armor": "robot-armor",
  "robot-modules": "robot-modules",
  "tools-and-utility-items": "miscellany",
  "traits": "traits",
  "weapon-mods": "weapon-mods",
  "weapons": "weapons"
};

export function packId(language, name) {
  return `${language}-${name}`;
}

export function documentKey(type, id) {
  const collection = { Actor: "actors", Item: "items", RollTable: "tables" }[type];
  if (!collection) throw new Error(`Unsupported pack document type: ${type}`);
  return `!${collection}!${id}`;
}
