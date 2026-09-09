import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  FRENCH_CORE_SUPPORT_DESCRIPTIONS as texts,
  FRENCH_CORE_SUPPORT_EFFECTS as effects,
  FRENCH_APPAREL_MOD_DESCRIPTION_GROUPS
} from "../scripts/data/french-core-support-descriptions.mjs";

const baseName = name => name.replace(/ \((?:Arm [123]|Main Body|Optics|Thruster|Torso)\)$/, "");
const editorialText = value => value.replace(/\s*<section data-f2d20-recipe=["']core["']>[\s\S]*$/i, "");
texts["apparel-mods"] = Object.fromEntries(
  FRENCH_APPAREL_MOD_DESCRIPTION_GROUPS.flatMap(group => group.names.map(name => [name, group.text]))
);

for (const [pack, entries] of Object.entries(texts)) {
  test(`French ${pack} targeted descriptions are translated`, async () => {
    const english = new Map();
    const french = new Map();
    for (const file of await readdir(`generated/source-packs/en/${pack}.db`)) {
      if (!file.endsWith(".json")) continue;
      const document = JSON.parse(await readFile(path.join(`generated/source-packs/en/${pack}.db`, file), "utf8"));
      english.set(document._id, document);
    }
    for (const file of await readdir(`generated/source-packs/fr/${pack}.db`)) {
      if (!file.endsWith(".json")) continue;
      const document = JSON.parse(await readFile(path.join(`generated/source-packs/fr/${pack}.db`, file), "utf8"));
      french.set(document._id, document);
    }
    const matched = new Set();
    for (const [id, source] of english) {
      const key = entries[source.name] ? source.name : baseName(source.name);
      if (!entries[key]) continue;
      matched.add(key);
      const target = french.get(id);
      assert.equal(editorialText(target.system.description), entries[key], source.name);
      assert.notEqual(editorialText(target.system.description), editorialText(source.system.description), source.name);
    }
    assert.deepEqual(matched, new Set(Object.keys(entries)));
  });
}

for (const [pack, entries] of Object.entries(effects)) {
  test(`French ${pack} targeted effects are translated`, async () => {
    const english = new Map();
    const french = new Map();
    for (const file of await readdir(`generated/source-packs/en/${pack}.db`)) {
      if (!file.endsWith(".json")) continue;
      const document = JSON.parse(await readFile(path.join(`generated/source-packs/en/${pack}.db`, file), "utf8"));
      english.set(document.name, document);
    }
    for (const file of await readdir(`generated/source-packs/fr/${pack}.db`)) {
      if (!file.endsWith(".json")) continue;
      const document = JSON.parse(await readFile(path.join(`generated/source-packs/fr/${pack}.db`, file), "utf8"));
      french.set(document._id, document);
    }
    for (const [name, translation] of Object.entries(entries)) {
      const source = english.get(name);
      const target = french.get(source._id);
      assert.equal(target.system.effect, translation, name);
      assert.notEqual(target.system.effect, source.system.effect, name);
    }
  });
}
