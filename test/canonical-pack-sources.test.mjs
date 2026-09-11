import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { LANGUAGES, PACKS } from "../scripts/config.mjs";
import { listFiles } from "../scripts/lib/files.mjs";
import { loadCanonicalPack, materializeLocalizedDocument, splitLocalizedDocument } from "../scripts/lib/canonical-pack-sources.mjs";
import { PACK_FOLDER_DEFINITIONS } from "../scripts/data/pack-folders.mjs";

test("localized source packs are generated rather than maintained", async () => {
  for (const language of LANGUAGES) await assert.rejects(access(path.resolve("src/packs", language)));
  let records = 0;
  for (const pack of PACKS) {
    const keys = {};
    for (const language of LANGUAGES) {
      const entries = await loadCanonicalPack(language, pack.name);
      keys[language] = entries.map(entry => entry.document._key).sort();
      records += entries.length;
      for (const { document } of entries.filter(entry => /^!(?:items|actors|tables)![^.!]+$/.test(entry.document._key ?? ""))) {
        assert.equal(document.folder, null, `${language}/${pack.name}/${document.name}: canonical folder IDs must be generated`);
        const definitions = PACK_FOLDER_DEFINITIONS[pack.name];
        if (!definitions) assert.equal(document.$folder, undefined, `${language}/${pack.name}/${document.name}`);
        else if (pack.name === "perks" && document.$folder === undefined) continue;
        else assert.ok(definitions.some(definition => definition.key === document.$folder), `${language}/${pack.name}/${document.name}: invalid $folder ${document.$folder}`);
      }
    }
    assert.deepEqual(keys.en, keys.fr, pack.name);
  }
  assert.equal(records, 2782);
});

test("each RollTable and all of its results share one source file", async () => {
  for (const language of LANGUAGES) {
    const entries = await loadCanonicalPack(language, "roll-tables");
    assert.equal(entries.length, 45);
    for (const { document } of entries) {
      assert.match(document._key, /^!tables![^.!]+$/);
      assert.ok(document.results.length > 0, `${language}/${document._id}`);
      assert.ok(document.results.every(result => result._key === `!tables.results!${document._id}.${result._id}`), `${language}/${document._id}`);
    }
  }
});

test("canonical sources contain only language-neutral pack references", async () => {
  const files = await listFiles(path.resolve("src/packs"), file => file.endsWith(".json"));
  let references = 0;
  for (const file of files) {
    const text = await readFile(file, "utf8");
    assert.doesNotMatch(text, /Compendium\.fallout2d20-compendium\.(?:en|fr)-/, file);
    references += (text.match(/"\$ref"/g) ?? []).length;
  }
  assert.equal(references, 447);
});

test("embedded document overlays target stable identities instead of array positions", () => {
  const english = { items: [{ _id: "first", name: "First" }, { _id: "second", name: "Second" }] };
  const french = { items: [{ _id: "second", name: "Deuxième" }, { _id: "first", name: "Premier" }] };
  const { canonical, overlays } = splitLocalizedDocument(english, french);
  assert.equal(overlays.fr["/items/@first/name"], "Premier");
  assert.equal(overlays.fr["/items/@second/name"], "Deuxième");
  assert.deepEqual(materializeLocalizedDocument(canonical, { values: overlays.fr }, "fr").items.map(item => item.name), ["Premier", "Deuxième"]);
  assert.throws(
    () => materializeLocalizedDocument({ items: [{ _id: "replacement", name: "Wrong" }] }, { values: { "/items/@first/name": "Premier" } }, "fr"),
    /embedded document identity first was not found/
  );
});
