import test from "node:test";
import assert from "node:assert/strict";
import { LANGUAGES, PACKS, documentKey, packId } from "../scripts/config.mjs";
import { readFile } from "node:fs/promises";

test("pack identifiers are unique and Foundry-safe", () => {
  const ids = LANGUAGES.flatMap(language => PACKS.map(pack => packId(language, pack.name)));
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9-]+$/);
});

test("document keys use Foundry collections", () => {
  assert.equal(documentKey("Item", "1234567890ABCDEF"), "!items!1234567890ABCDEF");
  assert.equal(documentKey("Actor", "1234567890ABCDEF"), "!actors!1234567890ABCDEF");
  assert.equal(documentKey("RollTable", "1234567890ABCDEF"), "!tables!1234567890ABCDEF");
});

test("all configured document types are supported by the pack compiler", () => {
  for (const pack of PACKS) assert.doesNotThrow(() => documentKey(pack.type, "1234567890ABCDEF"));
});

test("the manifest exposes only the two publication-neutral language folders", async () => {
  const manifest = JSON.parse(await readFile("module.json", "utf8"));
  assert.ok(manifest.packs.every(pack => pack.path.startsWith("packs/")));
  assert.deepEqual(manifest.packFolders.map(({ name }) => name), ["Fallout 2d20 - English", "Fallout 2d20 - Français"]);
  assert.deepEqual(new Set(manifest.packFolders.flatMap(({ packs }) => packs)), new Set(manifest.packs.map(({ name }) => name)));
});

test("the manifest loads the English and French setting localizations", async () => {
  const manifest = JSON.parse(await readFile("module.json", "utf8"));
  assert.deepEqual(manifest.languages, [
    { lang: "en", name: "English", path: "lang/en.json" },
    { lang: "fr", name: "Français", path: "lang/fr.json" }
  ]);
  for (const { path } of manifest.languages) {
    const translations = JSON.parse(await readFile(path, "utf8"));
    assert.ok(translations["fallout2d20-compendium"]?.settings?.languageVisibility);
  }
});

test("release versions stay synchronized", async () => {
  const [manifest, base, pkg, lock] = await Promise.all([
    "module.json", "module.base.json", "package.json", "package-lock.json"
  ].map(file => readFile(file, "utf8").then(JSON.parse)));
  assert.equal(manifest.version, pkg.version);
  assert.equal(base.version, pkg.version);
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[""].version, pkg.version);
});
