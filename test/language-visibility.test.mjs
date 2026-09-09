import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const runtimeUrl = pathToFileURL(path.resolve("runtime/language-visibility.mjs"));

function installFoundryMocks() {
  const callbacks = new Map();
  const registrations = [];
  globalThis.game = {
    packs: Array.from({ length: 40 }, (_, index) => ({ collection: `pack-${index}` })),
    settings: {
      register: (namespace, key, config) => registrations.push({ namespace, key, config }),
      get: () => "both"
    }
  };
  globalThis.Hooks = {
    once: (name, callback) => callbacks.set(name, callback),
    on: (name, callback) => callbacks.set(name, callback)
  };
  return { callbacks, registrations };
}

function clearFoundryMocks() {
  delete globalThis.game;
  delete globalThis.Hooks;
  delete globalThis.ui;
}

function mockDirectory(collections) {
  const folders = new Map();
  const entries = collections.map(({ collection, folder = collection.split(".")[1]?.slice(0, 2) }) => {
    if (!folders.has(folder)) folders.set(folder, { removed: false, entries: [] });
    const parent = folders.get(folder);
    const entry = {
      dataset: { entryId: collection },
      removed: false,
      closest: () => parent,
      remove() { this.removed = true; }
    };
    parent.entries.push(entry);
    return entry;
  });
  for (const folder of folders.values()) {
    folder.querySelector = () => folder.entries.find(entry => !entry.removed);
    folder.remove = () => { folder.removed = true; };
  }
  return {
    entries,
    folders,
    querySelectorAll: selector => selector === "[data-entry-id], [data-pack]" ? entries.filter(entry => !entry.removed) : []
  };
}

test("the Foundry setting has the exact client-scoped contract for every role", async () => {
  const { callbacks, registrations } = installFoundryMocks();
  try {
    await import(`${runtimeUrl.href}?setting-contract`);
    callbacks.get("init")();
    assert.equal(registrations.length, 1);
    const [{ namespace, key, config }] = registrations;
    assert.equal(namespace, "fallout2d20-compendium");
    assert.equal(key, "languageVisibility");
    assert.equal(config.scope, "client");
    assert.equal(config.config, true);
    assert.equal(config.type, String);
    assert.equal(config.default, "both");
    assert.deepEqual(Object.keys(config.choices), ["both", "en", "fr"]);
    assert.equal("restricted" in config, false);
  } finally {
    clearFoundryMocks();
  }
});

test("both and unknown values preserve all navigation entries", async () => {
  installFoundryMocks();
  try {
    const runtime = await import(`${runtimeUrl.href}?fallbacks`);
    for (const value of ["both", "obsolete", undefined]) {
      const directory = mockDirectory([
        { collection: "fallout2d20-compendium.en-skills" },
        { collection: "fallout2d20-compendium.fr-skills" },
        { collection: "another-module.fr-content", folder: "other" }
      ]);
      assert.equal(runtime.applyLanguageVisibility(directory, value), 0);
      assert.equal(directory.entries.every(entry => !entry.removed), true);
    }
  } finally {
    clearFoundryMocks();
  }
});

test("English and French choices hide only the opposite module navigation entries", async () => {
  installFoundryMocks();
  try {
    const runtime = await import(`${runtimeUrl.href}?filtering`);
    for (const [choice, hidden] of [["en", "fr"], ["fr", "en"]]) {
      const directory = mockDirectory([
        { collection: "fallout2d20-compendium.en-skills" },
        { collection: "fallout2d20-compendium.en-denizens" },
        { collection: "fallout2d20-compendium.fr-skills" },
        { collection: "fallout2d20-compendium.fr-denizens" },
        { collection: "another-module.fr-content", folder: "other" }
      ]);
      assert.equal(runtime.applyLanguageVisibility(directory, choice), 2);
      for (const entry of directory.entries) {
        const expected = entry.dataset.entryId.startsWith(`fallout2d20-compendium.${hidden}-`);
        assert.equal(entry.removed, expected);
      }
      assert.equal(directory.folders.get(hidden).removed, true);
      assert.equal(directory.folders.get(choice).removed, false);
      assert.equal(directory.folders.get("other").removed, false);
    }
  } finally {
    clearFoundryMocks();
  }
});

test("Foundry directory variants support bare entry IDs, data-pack, and legacy hook wrappers", async () => {
  installFoundryMocks();
  try {
    const runtime = await import(`${runtimeUrl.href}?foundry-dom-variants`);
    game.packs = [
      { collection: "fallout2d20-compendium.fr-skills" },
      { collection: "fallout2d20-compendium.fr-denizens" }
    ];
    const folder = { querySelector: () => null, remove() {} };
    const entries = [
      { dataset: { entryId: "fr-skills" }, closest: () => folder, remove() { this.removed = true; } },
      { dataset: { pack: "fallout2d20-compendium.fr-denizens" }, closest: () => folder, remove() { this.removed = true; } },
      { dataset: { pack: "another-module.fr-content" }, closest: () => null, remove() { this.removed = true; } }
    ];
    const element = { querySelectorAll: () => entries };
    assert.equal(runtime.applyLanguageVisibility([element], "en"), 2);
    assert.equal(entries[0].removed, true);
    assert.equal(entries[1].removed, true);
    assert.equal(entries[2].removed, undefined);
  } finally {
    clearFoundryMocks();
  }
});

test("initial render and a setting change need only a compendium-directory rerender", async () => {
  const { callbacks, registrations } = installFoundryMocks();
  let renderedWith;
  globalThis.ui = { compendium: { render: options => { renderedWith = options; } } };
  try {
    await import(`${runtimeUrl.href}?lifecycle`);
    callbacks.get("init")();
    const directory = mockDirectory([{ collection: "fallout2d20-compendium.fr-skills" }]);
    game.settings.get = () => "en";
    callbacks.get("renderCompendiumDirectory")({}, directory);
    assert.equal(directory.entries[0].removed, true);
    registrations[0].config.onChange("fr");
    assert.deepEqual(renderedWith, { force: true });
  } finally {
    clearFoundryMocks();
  }
});

test("GM and player clients remain independent while hidden packs and UUIDs remain available", async () => {
  installFoundryMocks();
  try {
    const runtime = await import(`${runtimeUrl.href}?clients-and-uuids`);
    const packs = Array.from({ length: 40 }, (_, index) => ({ collection: `fallout2d20-compendium.${index < 20 ? "en" : "fr"}-pack-${index}` }));
    game.packs = packs;
    const hiddenDocument = { uuid: "Compendium.fallout2d20-compendium.fr-pack-20.Item.stable-id" };
    const fromUuid = async uuid => uuid === hiddenDocument.uuid ? hiddenDocument : null;
    const gmDirectory = mockDirectory(packs);
    const playerDirectory = mockDirectory(packs);

    runtime.applyLanguageVisibility(gmDirectory, "en");
    runtime.applyLanguageVisibility(playerDirectory, "fr");
    assert.equal(gmDirectory.entries.filter(entry => !entry.removed).length, 20);
    assert.equal(playerDirectory.entries.filter(entry => !entry.removed).length, 20);
    assert.equal(game.packs.length, 40);
    assert.equal(game.packs[20], packs[20]);
    assert.equal(await fromUuid(hiddenDocument.uuid), hiddenDocument);
  } finally {
    clearFoundryMocks();
  }
});
