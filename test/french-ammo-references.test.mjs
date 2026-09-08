import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function packDocuments(language, pack) {
  const root = path.join("src/packs", language, `${pack}.db`);
  return Promise.all((await readdir(root)).filter((file) => file.endsWith(".json")).map(async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"))));
}

test("French weapons and receiver mods only refer to localized ammunition names", async () => {
  const ammunition = new Set([...(await packDocuments("fr", "ammunition")).map((item) => item.name),"Seringue"]);
  for (const pack of ["weapons", "weapon-mods"]) {
    for (const item of await packDocuments("fr", pack)) {
      const references = [item.system?.ammo, item.system?.modEffects?.ammo];
      for (const embedded of Object.values(item.system?.mods ?? {})) references.push(embedded.system?.modEffects?.ammo);
      for (const reference of references.filter(Boolean)) {
        assert.ok(ammunition.has(reference), `${pack}/${item.name} refers to missing French ammunition ${reference}`);
      }
    }
  }
});
