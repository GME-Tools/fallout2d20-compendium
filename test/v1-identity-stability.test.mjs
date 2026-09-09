import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

test("document IDs and keys remain stable through the denizens pack migration", async () => {
  const identities = [];
  for (const language of ["en", "fr"]) {
    for (const directory of await readdir(`generated/source-packs/${language}`, { withFileTypes: true })) {
      if (!directory.isDirectory() || !directory.name.endsWith(".db")) continue;
      const pack = directory.name.slice(0, -3);
      for (const file of await readdir(`generated/source-packs/${language}/${directory.name}`)) {
        if (!file.endsWith(".json")) continue;
        const document = JSON.parse(await readFile(`generated/source-packs/${language}/${directory.name}/${file}`));
        if (/^!(items|actors|tables)![^.!]+$/.test(document._key ?? "")) identities.push(`${language}/${pack}/${document._id}/${document._key}`);
      }
    }
  }
  identities.sort();
  assert.equal(identities.length, 2760);
  assert.equal(digest(identities), "befa2871865711dc9690e8d923a534e3ce6fccbc3c9b0a438e086a88a75fee32");
});

test("pack declarations include the accepted denizens migration", async () => {
  const manifest = JSON.parse(await readFile("module.json", "utf8"));
  const packs = manifest.packs.map(({ name, path, type }) => ({ name, path, type }));
  assert.equal(packs.length, 38);
  assert.equal(digest(packs), "d5619a220af0ecb19426841bf9abf33e4ad9a17b3058cd5fe764ef9d423d55fb");
});
