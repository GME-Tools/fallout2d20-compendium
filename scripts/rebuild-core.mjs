import { spawn } from "node:child_process";

// Only deterministic, non-destructive enrichments belong here. Import and seed
// commands intentionally stay outside the rebuild: they are migration tools and
// could replace editorially reviewed source documents.
const steps=[
  "clean-core-adventure-actors.mjs",
  "create-core-crafting-stations.mjs",
  "create-core-syringer-ammunition.mjs",
  "review-core-character-creation.mjs",
  "localize-french-core-actors.mjs",
  "localize-french-core-creature-abilities.mjs",
  "localize-french-armor-support.mjs",
  "localize-french-core-support-descriptions.mjs",
  "localize-french-core-miscellany-descriptions.mjs",
  "localize-french-core-apparel-descriptions.mjs",
  "localize-french-core-consumable-descriptions.mjs",
  "assign-core-artwork.mjs",
  "apply-core-object-recipes.mjs",
  "apply-core-equipment-recipes.mjs",
  "apply-core-weapon-mod-recipes.mjs",
  "apply-core-actor-errata.mjs",
  "apply-core-embedded-actor-errata.mjs",
  "localize-french-core-actor-biographies.mjs",
  "localize-french-core-special-ability-texts.mjs",
  "localize-french-core-embedded-weapon-texts.mjs",
  "localize-french-core-embedded-miscellany-texts.mjs",
  "localize-french-core-embedded-names.mjs",
  "localize-french-ammo-references.mjs",
  "create-core-adventure-actors.mjs",
  "create-core-adventure-actors-extended.mjs",
  "localize-french-core-embedded-weapon-texts.mjs",
  "clean-french-pdf-extraction-bleed.mjs",
  "link-core-recipe-metadata.mjs",
  "link-core-content.mjs",
  "create-core-roll-tables.mjs",
  "fix-french-weights.mjs",
  "enrich-core-artwork.mjs",
  "report-missing-core-artwork.mjs"
];

for(const step of steps){
  console.log(`\n[rebuild:core] ${step}`);
  await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[`scripts/${step}`],{stdio:"inherit"});
    child.once("error",reject);
    child.once("exit",code=>code===0?resolve():reject(new Error(`${step} exited with status ${code}`)));
  });
}
console.log(`\nCore rebuild completed (${steps.length} deterministic steps).`);
