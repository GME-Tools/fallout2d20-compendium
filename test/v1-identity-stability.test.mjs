import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

test("V1 document identities and UUID inputs remain unchanged", async () => {
  const identities = [];
  for (const language of ["en", "fr"]) {
    for (const directory of await readdir(`src/packs/${language}`, { withFileTypes: true })) {
      if (!directory.isDirectory() || !directory.name.endsWith(".db")) continue;
      const pack = directory.name.slice(0, -3);
      for (const file of await readdir(`src/packs/${language}/${directory.name}`)) {
        if (!file.endsWith(".json")) continue;
        const document = JSON.parse(await readFile(`src/packs/${language}/${directory.name}/${file}`));
        if (/^!(items|actors|tables)![^.!]+$/.test(document._key ?? "")) identities.push(`${language}/${pack}/${document._id}/${document._key}`);
      }
    }
  }
  identities.sort();
  assert.equal(identities.length, 2760);
  assert.equal(digest(identities), "e7aaa54ca2e569c29562e240bbf5fc1d49b5be1cda2872ecc9d72a7176d76075");
});

test("V1 pack declarations remain unchanged", async () => {
  const manifest = JSON.parse(await readFile("module.json", "utf8"));
  const packs = manifest.packs.map(({ name, path, type }) => ({ name, path, type }));
  assert.equal(packs.length, 40);
  assert.equal(digest(packs), "b0a9ec3d008887c479c30ec96bdbdc38c0a48d99ac3c50088315450241452f3e");
});
