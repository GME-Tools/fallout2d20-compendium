import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PACKS } from "../scripts/config.mjs";

async function packDocuments(language, pack) {
  const root = path.join("src/packs", language, `${pack}.db`);
  return Promise.all((await readdir(root)).filter((file) => file.endsWith(".json")).map(async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"))));
}

test("every rendered Core recipe links its station and skill", async () => {
  for (const language of ["en", "fr"]) {
    for (const pack of PACKS.filter(({ type }) => type === "Item")) {
      for (const item of await packDocuments(language, pack.name)) {
        const sections = item.system?.description?.match(/<section data-f2d20-(?:weapon-)?recipes?="core">[\s\S]*?<\/section>/g) ?? [];
        for (const section of sections) {
          assert.match(section, new RegExp(`Compendium\\.fallout2d20-compendium\\.${language}-crafting-stations\\.Item\\.`), `${language}/${pack.name}/${item.name} has no station link`);
          assert.match(section, new RegExp(`Compendium\\.fallout2d20-compendium\\.${language}-skills\\.Item\\.`), `${language}/${pack.name}/${item.name} has no skill link`);
        }
      }
    }
  }
});
