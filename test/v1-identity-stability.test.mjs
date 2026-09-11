import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

test("published root identities include the accepted standalone ability removal", async () => {
  const identities = [];
  for (const language of ["en", "fr"]) {
    for (const directory of await readdir(`generated/source-packs/${language}`, { withFileTypes: true })) {
      if (!directory.isDirectory() || !directory.name.endsWith(".db")) continue;
      const pack = directory.name.slice(0, -3);
      for (const file of await readdir(`generated/source-packs/${language}/${directory.name}`)) {
        if (!file.endsWith(".json")) continue;
        const document = JSON.parse(await readFile(`generated/source-packs/${language}/${directory.name}/${file}`));
        if (/^!(items|actors|tables)![^.!]+$/.test(document._key ?? "") && document.flags?.["fallout2d20-compendium"]?.source?.book === "core_rulebook") identities.push(`${language}/${pack}/${document._id}/${document._key}`);
      }
    }
  }
  identities.sort();
  assert.equal(identities.length, 2612);
  assert.equal(digest(identities), "4938a11a1016cc023ae91c4f452886f032da65a24dd7069a4bbaef2664b219d2");
});

test("pack declarations omit standalone creature abilities", async () => {
  const manifest = JSON.parse(await readFile("module.json", "utf8"));
  const packs = manifest.packs.map(({ name, path, type }) => ({ name, path, type }));
  assert.equal(packs.length, 36);
  assert.equal(digest(packs), "6810e46dd39c09bbbef495240232752a5d82174512e1a0a033c9099588e1a809");
});
