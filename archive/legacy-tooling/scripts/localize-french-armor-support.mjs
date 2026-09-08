import { readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID } from "./config.mjs";
import { slugify } from "./lib/files.mjs";

const exact = {
  Aerodynamic: "Aérodynamique", "Alloyed Metal": "Métal allié", "Asbestos Lining": "Doublure en amiante",
  "Ballistic Weave": "Tissage balistique", BioCommMesh: "Maille BioComm", "Blood Cleanser": "Purificateur sanguin",
  "Boiled Leather": "Cuir bouilli", Braced: "Renfort", Brawling: "Bagarre", Buttressed: "Contrefort",
  "Calibrated Shocks": "Amortisseurs calibrés", "Core Assembly": "Assemblage du réacteur", Cushioned: "Rembourrage",
  "Deep Pocketed": "Poches profondes", Dense: "Dense", "Emergency Protocols": "Protocoles d’urgence",
  "EMP Shielding": "Blindage IEM", "Enameled Metal": "Métal émaillé", "Explosive Shielding": "Blindage explosif",
  "Explosive Vent": "Évent explosif", Fiberglass: "Fibre de verre", "Girded Leather": "Cuir ceinturé",
  Hardened: "Durci", "Hydraulic Bracers": "Brassards hydrauliques", "Insulated Lining": "Doublure isolante",
  "Internal Database": "Base de données interne", Jetpack: "Jetpack", "Kinetic Dynamo": "Dynamo cinétique",
  Laminated: "Laminé", "Lead Lined": "Doublé de plomb", "Lead Plating": "Plaquage de plomb",
  "Lighter Build": "Structure allégée", "Medic Pump": "Pompe médicale", Microcarbon: "Microcarbone",
  "Motion-Assist Servos": "Servomoteurs d’assistance au mouvement", Muffled: "Insonorisé", Nanofilament: "Nanofilament",
  "Optimized Bracers": "Brassards optimisés", "Overdrive Servos": "Servomoteurs suralimentés", Padded: "Matelassé",
  "Painted Metal": "Métal peint", "Photovoltaic Plating": "Plaquage photovoltaïque", Pneumatic: "Pneumatique",
  Pocketed: "À poches", "Polished Metal": "Métal poli", Polymer: "Polymère", "Prism Shielding": "Blindage prismatique",
  "Protective Lining": "Doublure protectrice", "Rad Scrubber": "Épurateur de radiations", "Reactive Plates": "Plaques réactives",
  Reinforced: "Renforcé", Resin: "Résine", "Resistant Lining": "Doublure résistante", "Rusty Knuckles": "Jointures rouillées",
  "Sensor Array": "Réseau de capteurs", Shadowed: "Ombré", "Shadowed Leather": "Cuir ombré", "Shadowed Metal": "Métal ombré",
  "Shielded Lining": "Doublure blindée", Stabilized: "Stabilisé", "Stealth Boy": "Stealth Boy", "Studded Leather": "Cuir clouté",
  "Targeting HUD": "ATH de ciblage", Tempered: "Trempé", "Tesla Bracers": "Brassards Tesla", "Tesla Coils": "Bobines Tesla",
  "Titanium Plating": "Plaquage de titane", "Treated Leather": "Cuir traité", "Treated Lining": "Doublure traitée",
  "Ultra Light Build": "Structure ultralégère", Weighted: "Lesté", Welded: "Soudé", "Welded Rebar": "Barres soudées",
  "Winterized Coating": "Revêtement hivernal",
  "Actuated Frame": "Châssis actionné", "Factory Armor": "Blindage d’usine", "Factory Storage Armor": "Blindage de stockage d’usine",
  "Hydraulic Frame": "Châssis hydraulique", "Mister Gutsy Plating": "Blindage de Mister Gutsy", "Noxious Plate": "Plaque néfaste",
  "Primal Plate": "Plaque primitive", "Serrated Plate": "Plaque dentelée", "Standard Plating": "Blindage standard",
  "Toxic Plate": "Plaque toxique", "Voltaic Frame": "Châssis voltaïque",
  "Behavioral Analysis Mod": "Module d’analyse comportementale", "Diagnosis Mod": "Module de diagnostic",
  "Hacking Mod": "Module de piratage", "Hazard Detection Mod": "Module de détection des dangers",
  "Integral Boiler Mod": "Module de chaudière intégrée", "Lockpick Module": "Module de crochetage",
  "Radiation Coils": "Bobines de radiation", "Recon Sensors": "Capteurs de reconnaissance",
  "Regeneration Field": "Champ de régénération", "Resistance Field": "Champ de résistance", "Stealth Field": "Champ de furtivité"
};

function splitSuffix(name) {
  const suffixes = [[/ \(Torso\)$/, " (Torse)"], [/ \(Arm 1\)$/, " (Bras 1)"], [/ \(Arm 2\)$/, " (Bras 2)"], [/ \(Arm 3\)$/, " (Bras 3)"], [/ \(Main Body\)$/, " (Corps principal)"], [/ \(Optics\)$/, " (Optiques)"], [/ \(Thruster\)$/, " (Propulseur)"], [/ Arm$/, " - Bras"], [/ Chest ?Piece$/, " - Plastron"], [/ Helm$/, " - Casque"], [/ Leg$/, " - Jambe"]];
  for (const [pattern, suffix] of suffixes) if (pattern.test(name)) return [name.replace(pattern, ""), suffix];
  return [name, ""];
}

function localize(name) {
  const [base, suffix] = splitSuffix(name);
  if (exact[base]) return exact[base] + suffix;
  if (/^(?:Ballistic Weave )?Mk [IVX]+$/.test(base)) return base.replace("Ballistic Weave", "Tissage balistique") + suffix;
  if (/^(?:Raider II|T-(?:45|51|60)[b-f]|Mk [IVX]+)$/.test(base)) return base + suffix;
  throw new Error(`Untranslated armor support name: ${name}`);
}

for (const pack of ["apparel-mods", "robot-armor", "robot-modules"]) {
  const root = `src/packs/fr/${pack}.db`;
  const english = new Map();
  for (const file of (await readdir(`src/packs/en/${pack}.db`)).filter(file => file.endsWith(".json"))) {
    const document = JSON.parse(await readFile(path.join(`src/packs/en/${pack}.db`, file), "utf8"));
    english.set(document._id, document);
  }
  for (const file of (await readdir(root)).filter(file => file.endsWith(".json"))) {
    const oldPath = path.join(root, file);
    const document = JSON.parse(await readFile(oldPath, "utf8"));
    document.name = localize(english.get(document._id).name);
    const provenance = document.flags[MODULE_ID].source;
    provenance.structuralBaseline = false;
    provenance.nameTranslationReviewed = false;
    provenance.translationReviewed = false;
    await writeFile(oldPath, `${JSON.stringify(document, null, 2)}\n`);
    const newPath = path.join(root, `${slugify(document.name)}__${document._id}.json`);
    if (newPath !== oldPath) await rename(oldPath, newPath);
  }
  console.log(`Localized names in ${pack}.`);
}
