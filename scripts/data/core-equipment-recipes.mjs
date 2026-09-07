const r = (station, pack, group, name, complexity, perks, skill, rarity, page) => ({ station, pack, group, name, complexity, perks, skill, rarity, page });

const armor = (group, name, complexity, perks = [], rarity = "uncommon") => r("armor", "apparel-mods", group, name, complexity, perks, "Repair", rarity, 211 + (group !== "ballistic-weave" && group !== "vault-suit-lining"));
const power = (group, name, complexity, perks, skill = "Repair", rarity = "uncommon") => r("power-armor", "apparel-mods", group, name, complexity, perks, skill, rarity, group === "upgrades" ? 219 : 220);
const robotArmor = (name, complexity, perks = [], rarity = "uncommon") => r("robot", "robot-armor", "armor", name, complexity, perks, "Repair", rarity, 221);
const robotMod = (name, complexity, perks = [], rarity = "uncommon") => r("robot", "robot-modules", "modules", name, complexity, perks, "Science", rarity, 221);

export const CORE_EQUIPMENT_RECIPES = [
  armor("ballistic-weave", "Ballistic Weave", 3, [], "rare"),
  armor("ballistic-weave", "Ballistic Weave Mk II", 3, ["Armorer 1"], "rare"),
  armor("ballistic-weave", "Ballistic Weave Mk III", 3, ["Armorer 2"], "rare"),
  armor("ballistic-weave", "Ballistic Weave Mk IV", 3, ["Armorer 3"], "rare"),
  armor("ballistic-weave", "Ballistic Weave Mk V", 3, ["Armorer 4"], "rare"),
  armor("vault-suit-lining", "Insulated Lining", 2, [], "common"),
  armor("vault-suit-lining", "Treated Lining", 3, ["Armorer 2"]),
  armor("vault-suit-lining", "Resistant Lining", 4, ["Armorer 3"]),
  armor("vault-suit-lining", "Protective Lining", 5, ["Armorer 4", "Science! 2"]),
  armor("vault-suit-lining", "Shielded Lining", 6, ["Armorer 4", "Science! 4"]),
  ...[["Welded",2,[],"common"],["Tempered",3,[],"common"],["Hardened",4,["Armorer 1"]],["Buttressed",5,["Armorer 1"]]].map(([n,c,p,q]) => armor("raider-material",n,c,p,q)),
  ...[["Boiled Leather",2,[],"common"],["Girded Leather",3,[],"common"],["Treated Leather",4,["Armorer 1"]],["Shadowed Leather",5,["Armorer 1"]],["Studded Leather",6,["Armorer 1"]]].map(([n,c,p,q]) => armor("leather-material",n,c,p,q)),
  ...[["Painted Metal",2,[],"common"],["Enameled Metal",3,["Armorer 1"],"common"],["Shadowed Metal",4,["Armorer 1"]],["Alloyed Metal",5,["Armorer 1"]],["Polished Metal",6,["Armorer 2"]]].map(([n,c,p,q]) => armor("metal-material",n,c,p,q)),
  ...[["Reinforced",3,[],"common"],["Shadowed",4,["Armorer 1"]],["Fiberglass",5,["Armorer 1"]],["Polymer",6,["Armorer 1"]]].map(([n,c,p,q]) => armor("combat-material",n,c,p,q)),
  ...[["Laminated",4,[],"common"],["Resin",5,["Armorer 1"]],["Microcarbon",6,["Armorer 1"]],["Nanofilament",7,["Armorer 1"]]].map(([n,c,p,q]) => armor("synth-material",n,c,p,q)),
  ...[
    ["Lighter Build",2,[],"common"],["Pocketed",2,[]],["Deep Pocketed",4,["Armorer 2"]],["Lead Lined",5,["Armorer 2","Science! 1"]],
    ["Ultra-Light Build",5,["Armorer 3"]],["Padded",3,[],"common"],["Asbestos Lining",4,["Armorer 1"]],["Dense",6,["Armorer 3"]],
    ["BioCommMesh",7,["Armorer 4","Science! 2"]],["Pneumatic",6,["Armorer 4"]],["Brawling",3,["Armorer 1"]],["Braced",3,["Armorer 1"]],
    ["Stabilized",4,["Armorer 2"]],["Aerodynamic",5,["Armorer 3"]],["Weighted",6,["Armorer 4"]],["Cushioned",3,["Armorer 1"]],["Muffled",4,["Armorer 2"]]
  ].map(([n,c,p,q]) => armor("armor-mods",n,c,p,q)),

  ...[
    ["Raider II",3,["Armorer 1"]],["T-45b",3,["Armorer 1"]],["T-45c",4,["Armorer 2"]],["T-45d",5,["Armorer 2","Science! 1"]],
    ["T-45e",6,["Armorer 3","Science! 1"]],["T-45f",7,["Armorer 3","Science! 2"]],["T-51b",3,["Armorer 1"]],["T-51c",4,["Armorer 2"]],
    ["T-51d",5,["Armorer 2","Science! 1"]],["T-51e",6,["Armorer 3","Science! 1"]],["T-51f",7,["Armorer 3","Science! 2"]],
    ["T-60b",3,[],"Repair","common"],["T-60c",4,["Armorer 1","Science! 1"]],["T-60d",5,["Armorer 2","Science! 2"]],
    ["T-60e",6,["Armorer 3","Science! 1"]],["T-60f",7,["Armorer 3","Science! 2"]],["X-01 Mk II",3,[],"Repair","common"],
    ["X-01 Mk III",4,["Armorer 1","Science! 1"]],["X-01 Mk IV",5,["Armorer 2","Science! 2"]],["X-01 Mk V",6,["Armorer 3","Science! 1"]],["X-01 Mk VI",7,["Armorer 3","Science! 2"]]
  ].map(([n,c,p,s="Repair",q="uncommon"]) => power("upgrades",n,c,p,s,q)),
  ...[
    ["Rad Scrubber",4,["Science! 2"],"Science"],["Sensor Array",5,["Science! 3"],"Science"],["Targeting HUD",5,["Science! 3"],"Science"],
    ["Internal Database",4,["Science! 2"],"Science"],["Welded Rebar",2,["Armorer 1"],"Repair"],["Core Assembly",5,["Science! 3"],"Science"],
    ["Blood Cleanser",4,["Science! 1"],"Science"],["Emergency Protocols",6,["Science! 4"],"Science"],["Motion-Assist Servos",5,["Science! 3"],"Science"],
    ["Kinetic Dynamo",6,["Science! 4"],"Science"],["Medic Pump",6,["Science! 4"],"Science"],["Reactive Plates",5,["Armorer 4"],"Repair"],
    ["Tesla Coils",5,["Science! 3"],"Science"],["Stealth Boy",6,["Science! 4"],"Science"],["Jetpack",7,["Armorer 4","Science! 4"],"Repair"],
    ["Rusty Knuckles",2,["Blacksmith 1"],"Repair"],["Hydraulic Bracers",4,["Blacksmith 3"],"Repair"],["Optimized Bracers",2,["Blacksmith 1"],"Repair"],
    ["Tesla Bracers",6,["Blacksmith 3","Science! 1"],"Repair"],["Calibrated Shocks",4,["Science! 2"],"Science"],
    ["Explosive Vent",5,["Science! 3"],"Science"],["Overdrive Servos",5,["Science! 3"],"Science"]
  ].map(([n,c,p,s]) => power("systems",n,c,p,s)),
  ...[
    ["Titanium Plating",4,["Armorer 3"],"Repair"],["Lead Plating",3,["Armorer 1"],"Repair"],["Photovoltaic Plating",5,["Science! 3"],"Science"],
    ["Winterized Coating",3,["Armorer 1"],"Repair"],["Prism Shielding",4,["Science! 2"],"Science"],["Explosive Shielding",3,["Science! 1"],"Science"],
    ["EMP Shielding",3,["Armorer 1"],"Repair"]
  ].map(([n,c,p,s]) => power("plating",n,c,p,s)),

  robotArmor("Factory Armor",2,[],"common"), robotArmor("Factory Storage Armor",3,["Armorer 1"]),
  robotArmor("Primal Plate",2,[],"common"), robotArmor("Serrated Plate",3,["Armorer 1"]), robotArmor("Noxious Plate",3,["Armorer 1"]),
  robotArmor("Toxic Plate",5,["Armorer 3"]), robotArmor("Actuated Frame",2,[],"common"), robotArmor("Voltaic Frame",4,["Armorer 2"]),
  robotArmor("Hydraulic Frame",5,["Armorer 3"]),
  robotMod("Hacking Module",5,[],"common"), robotMod("Lockpick Module",5,[],"common"), robotMod("Radiation Coils",5,["Robotics Expert 1"]),
  robotMod("Recon Sensors",5,["Robotics Expert 1"]), robotMod("Regeneration Field",4,["Robotics Expert 2","Science! 2"],"rare"),
  robotMod("Resistance Field",4,["Robotics Expert 1","Science! 1"]), robotMod("Sensor Array",4,["Robotics Expert 1"]),
  robotMod("Stealth Field",5,["Robotics Expert 1"],"rare"), robotMod("Tesla Coils",5,["Robotics Expert 2","Science! 1"],"rare")
];
