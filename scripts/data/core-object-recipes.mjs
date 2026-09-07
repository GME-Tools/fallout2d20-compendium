const recipe = (station, pack, name, complexity, perks, skill, rarity, materials, page) => ({
  station, pack, name, complexity, perks, skill, rarity, materials, page
});

const m = (...entries) => entries.map((entry) => {
  const [name, quantity = "1"] = entry.split(":");
  return { name, quantity: Number(quantity) };
});

export const CORE_OBJECT_RECIPES = [
  // Chemistry station - chems (Core Rulebook pp. 213-214)
  recipe("chemistry", "consumables", "Antibiotics", 4, ["Chemist"], "Science", "uncommon", m("Rare Materials:2", "Glowing Fungus:3", "Purified Water:2", "Stimpak:3"), 213),
  recipe("chemistry", "consumables", "Berry Mentats", 3, [], "Science", "common", m("Rare Materials", "Mentats", "Tarberry:2"), 213),
  recipe("chemistry", "consumables", "Buffjet", 2, [], "Science", "common", m("Buffout", "Jet"), 213),
  recipe("chemistry", "consumables", "Bufftats", 2, [], "Science", "common", m("Buffout", "Mentats"), 213),
  recipe("chemistry", "consumables", "Diluted RadAway", 2, [], "Science", "common", m("RadAway", "Purified Water"), 213),
  recipe("chemistry", "consumables", "Diluted Rad-X", 2, [], "Science", "common", m("Rad-X", "Purified Water"), 213),
  recipe("chemistry", "consumables", "Diluted Stimpak", 2, [], "Science", "common", m("Stimpak", "Purified Water"), 213),
  recipe("chemistry", "consumables", "Fury", 2, ["Chemist"], "Science", "uncommon", m("Berserk Syringe", "Buffout"), 213),
  recipe("chemistry", "consumables", "Glowing Blood Pack", 3, [], "Science", "common", m("Rare Materials", "Blood Pack", "Irradiated Blood"), 213),
  recipe("chemistry", "consumables", "Grape Mentats", 3, [], "Science", "common", m("Hubflower:2", "Mentats", "Whiskey"), 213),
  recipe("chemistry", "consumables", "Jet", 2, [], "Science", "common", m("Uncommon Materials:2", "Common Materials"), 213),
  recipe("chemistry", "consumables", "Jet Fuel", 2, ["Chemist"], "Science", "uncommon", m("Flamer Fuel:5", "Jet"), 214),
  recipe("chemistry", "consumables", "Mentats", 3, [], "Science", "common", m("Uncommon Materials:3", "Rare Materials:2", "Brain Fungus:2"), 214),
  recipe("chemistry", "consumables", "Orange Mentats", 3, [], "Science", "common", m("Uncommon Materials", "Carrot:3", "Mentats"), 214),
  recipe("chemistry", "consumables", "Overdrive", 3, ["Chemist"], "Science", "uncommon", m("Rare Materials:2", "Nuka-Cola", "Psycho"), 214),
  recipe("chemistry", "consumables", "Psycho", 4, [], "Science", "common", m("Rare Materials:2", "Hubflower:2", "Stimpak"), 214),
  recipe("chemistry", "consumables", "Psycho Jet", 2, [], "Science", "common", m("Jet", "Psycho"), 214),
  recipe("chemistry", "consumables", "Psychobuff", 2, [], "Science", "common", m("Buffout", "Psycho"), 214),
  recipe("chemistry", "consumables", "RadAway", 4, [], "Science", "common", m("Rare Materials:2", "Glowing Fungus:3", "Common Materials", "Purified Water"), 214),
  recipe("chemistry", "consumables", "Refreshing Beverage", 5, [], "Science", "common", m("Rare Materials:3", "Blood Pack", "Purified Water:2", "RadAway:2", "Stimpak"), 214),
  recipe("chemistry", "consumables", "Robot Repair Kit", 4, [], "Science", "common", m("Rare Materials:2", "Fusion Cell:4", "Uncommon Materials:2", "Common Materials"), 214),
  recipe("chemistry", "consumables", "Skeeto Spit", 4, [], "Science", "common", m("Blood Sac", "Bloodleaf", "Uncommon Materials", "Common Materials"), 214),
  recipe("chemistry", "consumables", "Stimpak", 3, [], "Science", "common", m("Antiseptic:2", "Blood Pack", "Common Materials"), 214),
  recipe("chemistry", "consumables", "Ultra Jet", 4, ["Chemist"], "Science", "uncommon", m("Bloodleaf", "Uncommon Materials", "Jet", "Common Materials:2"), 214),

  // Chemistry station - explosives (Core Rulebook pp. 214-215)
  recipe("chemistry", "weapons", "Baseball Grenade", 5, ["Demolition Expert"], "Explosives", "uncommon", m("Common Materials:3", "Uncommon Materials:2"), 214),
  recipe("chemistry", "weapons", "Frag Grenade", 5, ["Demolition Expert"], "Explosives", "uncommon", m("Common Materials:2", "Uncommon Materials:3"), 215),
  recipe("chemistry", "weapons", "Molotov Cocktail", 4, [], "Explosives", "common", m("Common Materials:3", "Uncommon Materials:2"), 215),
  recipe("chemistry", "weapons", "Plasma Grenade", 5, ["Demolition Expert", "Science! 3"], "Explosives", "uncommon", m("Uncommon Materials:3", "Rare Materials:2"), 215),
  recipe("chemistry", "weapons", "Pulse Grenade", 5, ["Demolition Expert", "Science! 2"], "Explosives", "uncommon", m("Uncommon Materials:3", "Rare Materials:2"), 215),
  recipe("chemistry", "weapons", "Bottlecap Mine", 5, ["Demolition Expert"], "Explosives", "uncommon", m("Common Materials:4", "Uncommon Materials"), 215),
  recipe("chemistry", "weapons", "Frag Mine", 5, ["Demolition Expert"], "Explosives", "uncommon", m("Common Materials:2", "Uncommon Materials:3"), 215),
  recipe("chemistry", "weapons", "Plasma Mine", 5, ["Demolition Expert", "Science! 3"], "Explosives", "uncommon", m("Uncommon Materials:3", "Rare Materials:2"), 215),
  recipe("chemistry", "weapons", "Pulse Mine", 5, ["Demolition Expert", "Science! 2"], "Explosives", "uncommon", m("Uncommon Materials:3", "Rare Materials:2"), 215),

  // Chemistry station - Syringer ammunition (Core Rulebook p. 215)
  recipe("chemistry", "ammunition", "Berserk Syringe", 4, [], "Science", "common", m("Uncommon Materials", "Bourbon", "Dirty Water", "Common Materials"), 215),
  recipe("chemistry", "ammunition", "Bleed-Out Syringe", 3, [], "Science", "common", m("Uncommon Materials:2", "Common Materials"), 215),
  recipe("chemistry", "ammunition", "Bloatfly Larva Syringe", 3, [], "Science", "common", m("Bloatfly Gland", "Uncommon Materials", "Psycho"), 215),
  recipe("chemistry", "ammunition", "Endangerol Syringe", 4, [], "Science", "common", m("Uncommon Materials:3", "Med-X"), 215),
  recipe("chemistry", "ammunition", "Lock Joint Syringe", 5, [], "Science", "common", m("Dirty Water", "Uncommon Materials:2", "Common Materials", "Stingwing Barb", "Tarberry:2"), 215),
  recipe("chemistry", "ammunition", "Mind Cloud Syringe", 4, [], "Science", "common", m("Uncommon Materials:2", "Rare Materials:3", "Asbestos:2", "Purified Water"), 215),
  recipe("chemistry", "ammunition", "Pax Syringe", 3, [], "Science", "common", m("Mutfruit:2", "Nuka-Cola", "Common Materials"), 215),
  recipe("chemistry", "ammunition", "Radscorpion Venom Syringe", 3, [], "Science", "common", m("Uncommon Materials", "Radscorpion Stinger", "Common Materials"), 215),
  recipe("chemistry", "ammunition", "Yellow Belly Syringe", 4, [], "Science", "common", m("Uncommon Materials:5"), 215),

  // Cooking station - beverages and food (Core Rulebook pp. 216-217)
  recipe("cooking", "consumables", "Dirty Wastelander", 3, [], "Survival", "rare", m("Mutfruit", "Nuka-Cola", "Whiskey:2"), 216),
  recipe("cooking", "consumables", "Purified Water", 1, [], "Survival", "common", m("Dirty Water:3"), 216),
  recipe("cooking", "consumables", "Melon Juice", 2, [], "Survival", "common", m("Purified Water", "Melon"), 216),
  recipe("cooking", "consumables", "Mutfruit Juice", 2, [], "Survival", "common", m("Purified Water", "Mutfruit"), 216),
  recipe("cooking", "consumables", "Tarberry Juice", 2, [], "Survival", "common", m("Purified Water", "Tarberry"), 216),
  recipe("cooking", "consumables", "Tato Juice", 2, [], "Survival", "common", m("Purified Water", "Tato"), 216),
  recipe("cooking", "consumables", "Baked Bloatfly", 1, [], "Survival", "common", m("Bloatfly Meat:2"), 216),
  recipe("cooking", "consumables", "Bloodbug Steak", 1, [], "Survival", "common", m("Bloodbug Meat"), 216),
  recipe("cooking", "consumables", "Cooked Softshell Meat", 1, [], "Survival", "common", m("Softshell Mirelurk Meat:2"), 216),
  recipe("cooking", "consumables", "Crispy Squirrel Bits", 1, [], "Survival", "common", m("Squirrel Bits"), 216),
  recipe("cooking", "consumables", "Deathclaw Omelette", 2, [], "Survival", "common", m("Blood Pack", "Deathclaw Egg"), 216),
  recipe("cooking", "consumables", "Deathclaw Steak", 1, [], "Survival", "common", m("Deathclaw Meat"), 216),
  recipe("cooking", "consumables", "Grilled Radroach", 1, [], "Survival", "common", m("Radroach Meat:3"), 216),
  recipe("cooking", "consumables", "Grilled Radstag", 1, [], "Survival", "common", m("Radstag Meat"), 216),
  recipe("cooking", "consumables", "Iguana on a Stick", 2, [], "Survival", "common", m("Iguana Bits", "Common Materials"), 217),
  recipe("cooking", "consumables", "Iguana Soup", 3, [], "Survival", "common", m("Carrot", "Dirty Water", "Iguana Bits:3"), 217),
  recipe("cooking", "consumables", "Mirelurk Cake", 4, [], "Survival", "rare", m("Mirelurk Egg", "Mirelurk Meat", "Uncommon Materials", "Razorgrain"), 217),
  recipe("cooking", "consumables", "Mirelurk Egg Omelette", 2, [], "Survival", "common", m("Dirty Water", "Mirelurk Egg"), 217),
  recipe("cooking", "consumables", "Mirelurk Queen Steak", 1, [], "Survival", "common", m("Queen Mirelurk Meat"), 217),
  recipe("cooking", "consumables", "Mole Rat Chunks", 1, [], "Survival", "common", m("Mole Rat Meat:2"), 217),
  recipe("cooking", "consumables", "Mutant Hound Chops", 1, [], "Survival", "common", m("Mutant Hound Meat"), 217),
  recipe("cooking", "consumables", "Mutt Chops", 1, [], "Survival", "common", m("Mongrel Dog Meat"), 217),
  recipe("cooking", "consumables", "Noodle Cup", 2, [], "Survival", "rare", m("Dirty Water", "Razorgrain"), 217),
  recipe("cooking", "consumables", "Radscorpion Egg Omelette", 2, [], "Survival", "common", m("Purified Water", "Radscorpion Egg"), 217),
  recipe("cooking", "consumables", "Radscorpion Steak", 1, [], "Survival", "common", m("Radscorpion Meat"), 217),
  recipe("cooking", "consumables", "Radstag Stew", 4, [], "Survival", "rare", m("Gourd", "Radstag Meat", "Silt Bean", "Vodka"), 217),
  recipe("cooking", "consumables", "Ribeye Steak", 1, [], "Survival", "common", m("Brahmin Meat"), 217),
  recipe("cooking", "consumables", "Roasted Mirelurk Meat", 1, [], "Survival", "common", m("Mirelurk Meat:2"), 217),
  recipe("cooking", "consumables", "Squirrel on a Stick", 2, [], "Survival", "common", m("Squirrel Bits", "Common Materials"), 217),
  recipe("cooking", "consumables", "Stingwing Filet", 1, [], "Survival", "common", m("Stingwing Meat"), 217),
  recipe("cooking", "consumables", "Vegetable Soup", 3, [], "Survival", "common", m("Carrot", "Dirty Water", "Tato"), 217),
  recipe("cooking", "consumables", "Yao Guai Ribs", 1, [], "Survival", "common", m("Yao Guai Meat"), 217),
  recipe("cooking", "consumables", "Yao Guai Roast", 3, [], "Survival", "rare", m("Carrot", "Tato", "Yao Guai Meat"), 217),
  // Errata V6 adds this missing recipe to p. 217.
  recipe("cooking", "consumables", "Squirrel Stew", 5, [], "Survival", "rare", m("Bloodleaf", "Carrot", "Dirty Water:2", "Squirrel Bits", "Tato"), 217)
];
