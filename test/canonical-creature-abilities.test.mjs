import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { loadCanonicalCreatureAbilities } from "../scripts/lib/canonical-creature-abilities.mjs";

const MODULE_ID = "fallout2d20-compendium";

async function actors(language) {
  const output = [];
  for (const pack of ["denizens"]) {
    const root = `generated/source-packs/${language}/${pack}.db`;
    for (const file of await readdir(root)) {
      if (file.endsWith(".json")) output.push(JSON.parse(await readFile(path.join(root, file), "utf8")));
    }
  }
  return output;
}

for (const language of ["en", "fr"]) {
  test(`${language} embedded creature abilities resolve through the canonical pack`, async () => {
    const canonical = await loadCanonicalCreatureAbilities(language);
    let linked = 0;
    for (const actor of await actors(language)) {
      for (const item of actor.items) {
        const canonicalId = item.flags?.[MODULE_ID]?.canonicalCreatureAbilityId;
        if (!canonicalId) continue;
        assert.ok(canonical.has(canonicalId), `${actor.name}/${item.name}`);
        assert.equal(item.name, canonical.get(canonicalId).name, `${actor.name}/${item.name}`);
        linked += 1;
      }
    }
    assert.equal(linked, 377);
    assert.equal(canonical.has("ypLFMHwSBdCcrrAf"), false);
    assert.equal(canonical.has("ug5NrfBuRrJ21f6w"), false);
  });
}

test("the Institute Scientist embeds the canonical apparel Lab Coat", async () => {
  for (const [language, actorFile] of [["en", "institue_scientist__vmToJt8w8NC99QzD.json"], ["fr", "scientifique_de_l_institut__vmToJt8w8NC99QzD.json"]]) {
    const actor = JSON.parse(await readFile(`generated/source-packs/${language}/denizens.db/${actorFile}`, "utf8"));
    const labCoat = actor.items.find((item) => item._id === "dKl7LDRKWs55Nh69");
    assert.equal(labCoat.type, "apparel");
    assert.equal(labCoat.flags?.[MODULE_ID]?.canonicalPack, "apparel");
    assert.equal(labCoat.flags?.[MODULE_ID]?.canonicalItemId, "cdwX7EVolnIWRaZi");
  }
});

test("AI artwork for single-user abilities is replaced by that actor's portrait", async () => {
  const canonical = await loadCanonicalCreatureAbilities("en");
  const actorDocuments = await actors("en");
  const reassigned = [...canonical.values()].filter((ability) =>
    ability.flags?.[MODULE_ID]?.source?.artworkSource?.startsWith("shared from sole user actor "));
  assert.equal(reassigned.length, 32);
  for (const ability of reassigned) {
    const users = actorDocuments.filter((actor) =>
      actor.items.some((item) => item.name === ability.name && item.type === ability.type));
    assert.equal(users.length, 1, ability.name);
    assert.equal(ability.img, users[0].img, ability.name);
  }
});
