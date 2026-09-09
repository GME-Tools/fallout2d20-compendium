import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const MODULE_ID = "fallout2d20-compendium";

async function actors(language) {
  const root = `generated/source-packs/${language}/denizens.db`;
  return Promise.all((await readdir(root)).filter(file => file.endsWith(".json"))
    .map(file => readFile(path.join(root, file), "utf8").then(JSON.parse)));
}

test("denizen abilities are autonomous bilingual embedded documents", async () => {
  const canonicalRoot = "src/packs/canonical/denizens.db";
  for (const file of (await readdir(canonicalRoot)).filter(file => file.endsWith(".json"))) {
    const document = JSON.parse(await readFile(path.join(canonicalRoot, file), "utf8"));
    assert.doesNotMatch(JSON.stringify(document), /creature-abilities|canonicalCreatureAbilityId/, file);
  }

  const english = await actors("en");
  const french = new Map((await actors("fr")).map(actor => [actor._id, actor]));
  assert.equal(english.filter(actor => actor.flags?.[MODULE_ID]?.source?.book === "core_rulebook").length, 75);
  for (const actor of english) {
    const translated = french.get(actor._id);
    assert.ok(translated, actor.name);
    assert.deepEqual(
      translated.items.map(item => [item._id, item.type]),
      actor.items.map(item => [item._id, item.type]),
      actor.name
    );
    for (const item of [...actor.items, ...translated.items]) {
      assert.equal(item.flags?.[MODULE_ID]?.canonicalCreatureAbilityId, undefined, `${actor.name}/${item.name}`);
    }
  }
});

test("embedded denizen artwork resolves after removing the standalone pack", async () => {
  let dedicatedAbilityImages = 0;
  for (const actor of await actors("en")) {
    for (const item of actor.items) {
      if (item.img?.includes("/artwork/Creature Abilities/")) dedicatedAbilityImages += 1;
      if (item.img?.startsWith(`modules/${MODULE_ID}/`)) {
        const asset = decodeURIComponent(item.img.slice(`modules/${MODULE_ID}/`.length));
        await access(asset);
      }
    }
  }
  assert.ok(dedicatedAbilityImages > 0);
});

test("the Institute Scientist still embeds the canonical apparel Lab Coat", async () => {
  for (const [language, actorFile] of [["en", "institue_scientist__vmToJt8w8NC99QzD.json"], ["fr", "scientifique_de_l_institut__vmToJt8w8NC99QzD.json"]]) {
    const actor = JSON.parse(await readFile(`generated/source-packs/${language}/denizens.db/${actorFile}`, "utf8"));
    const labCoat = actor.items.find(item => item._id === "dKl7LDRKWs55Nh69");
    assert.equal(labCoat.type, "apparel");
    assert.equal(labCoat.flags?.[MODULE_ID]?.canonicalPack, "apparel");
    assert.equal(labCoat.flags?.[MODULE_ID]?.canonicalItemId, "cdwX7EVolnIWRaZi");
  }
});

test("denizens use the current Fallout actor and creature-attack schema", async () => {
  const validBodyTypes = new Set(["humanoid", "robot", "quadruped", "flyingInsect"]);
  for (const language of ["en", "fr"]) for (const actor of await actors(language)) {
    assert.ok(validBodyTypes.has(actor.system.bodyType), `${language}/${actor.name}: bodyType`);
    assert.doesNotMatch(actor.system.origin, /, (?:(?:Normal|Notable|Major) (?:Creature|Character)|Créature [Nn]ormale|Personnage (?:[Nn]ormal|[Nn]otable|[Mm]ajeur))$/, `${language}/${actor.name}: redundant origin category`);
    for (const item of actor.items.filter(item => item.type === "weapon" && item.system.weaponType === "creatureAttack")) {
      assert.ok(item.system.creatureAttribute, `${language}/${actor.name}/${item.name}: creatureAttribute`);
      assert.ok(item.system.creatureSkill, `${language}/${actor.name}/${item.name}: creatureSkill`);
    }
  }
});

test("native denizen immunities, matching abilities, and structured loot stay aligned", async () => {
  for (const language of ["en", "fr"]) for (const actor of await actors(language)) {
    assert.equal(typeof actor.system.immunities.poison, "boolean", `${language}/${actor.name}: poison immunity`);
    assert.equal(typeof actor.system.immunities.radiation, "boolean", `${language}/${actor.name}: radiation immunity`);
    assert.equal(actor.items.some(item => /^(?:Butchery|Salvage|Dépeçage|Récupération)$/i.test(item.name)), false, `${language}/${actor.name}: loot pseudo-item`);
    const radiationAbilities = actor.items.filter(item => /^(?:Immune to Radiation|Immunisé contre les radiations)$/i.test(item.name));
    const poisonAbilities = actor.items.filter(item => /^(?:Immune to Poison|Immunisé contre le poison)$/i.test(item.name));
    assert.equal(radiationAbilities.length, actor.system.immunities.radiation ? 1 : 0, `${language}/${actor.name}: radiation ability`);
    assert.equal(poisonAbilities.length, actor.system.immunities.poison ? 1 : 0, `${language}/${actor.name}: poison ability`);
    for (const item of actor.items.filter(item => item.flags?.[MODULE_ID]?.embeddedYield)) {
      assert.match(item.system.quantityRoll, /^(?:\d+|\d+d20|\d+dc)$/i, `${language}/${actor.name}/${item.name}: rollable yield`);
      assert.ok(item.system.description, `${language}/${actor.name}/${item.name}: yield rule`);
    }
  }

  const bloodbug = (await actors("en")).find(actor => actor.name === "Bloodbug");
  assert.equal(bloodbug.system.bodyType, "flyingInsect");
  assert.deepEqual(bloodbug.system.immunities, { poison: true, radiation: true });
  assert.ok(bloodbug.items.some(item => item.name === "Immune to Radiation"));
  assert.ok(bloodbug.items.some(item => item.name === "Immune to Poison"));
  assert.equal(bloodbug.system.butchery.tn, 0);
  assert.deepEqual(bloodbug.items.filter(item => item.system.butchery).map(item => item.name).sort(), ["Blood Sac", "Bloodbug Meat"]);
});
