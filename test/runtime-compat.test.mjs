import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

const runtimeUrl = pathToFileURL(path.resolve("runtime/fallout-v14-compat.mjs"));

function installFoundryMocks({ ready }) {
  const callbacks = new Map();
  globalThis.CONFIG = { FALLOUT: {} };
  globalThis.game = {
    ready,
    packs: [
      {
        collection: "fallout2d20-compendium.en-ammunition",
        metadata: { type: "Item", name: "en-ammunition" },
        async getIndex() {
          return [
            { type: "ammo", uuid: "Compendium.en.ammo.10mm", name: "10mm Round" },
            { type: "weapon", uuid: "Compendium.en.weapon.pistol", name: "10mm Pistol" }
          ];
        }
      },
      {
        collection: "fallout2d20-compendium.fr-ammunition",
        metadata: { type: "Item", name: "fr-ammunition" },
        async getIndex() {
          return [{ type: "ammo", uuid: "Compendium.fr.ammo.10mm", name: "Munition de 10 mm" }];
        }
      },
      {
        collection: "fallout2d20-compendium.en-weapons",
        metadata: { type: "Item", name: "en-weapons" },
        async getIndex() {
          throw new Error("Unrelated packs must not be indexed");
        }
      }
    ]
  };
  globalThis.Hooks = {
    once: (name, callback) => callbacks.set(name, callback),
    on: (name, callback) => callbacks.set(name, callback)
  };
  return callbacks;
}

function clearFoundryMocks() {
  delete globalThis.CONFIG;
  delete globalThis.game;
  delete globalThis.Hooks;
}

test("runtime restores ammunition configuration immediately in an already-ready world", async () => {
  installFoundryMocks({ ready: true });
  try {
    await import(`${runtimeUrl.href}?ready`);
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(CONFIG.FALLOUT.AMMO_BY_UUID, {
      "Compendium.en.ammo.10mm": "10mm Round",
      "Compendium.fr.ammo.10mm": "Munition de 10 mm"
    });
    assert.deepEqual(CONFIG.FALLOUT.AMMO_TYPES, ["10mm Round", "Munition de 10 mm"]);
  } finally {
    clearFoundryMocks();
  }
});

test("runtime waits for Foundry ready when loaded during initialization", async () => {
  const callbacks = installFoundryMocks({ ready: false });
  try {
    await import(`${runtimeUrl.href}?initializing`);
    assert.equal(typeof callbacks.get("ready"), "function");
    assert.equal(CONFIG.FALLOUT.AMMO_BY_UUID, undefined);
    await callbacks.get("ready")();
    assert.equal(CONFIG.FALLOUT.AMMO_BY_UUID["Compendium.en.ammo.10mm"], "10mm Round");
  } finally {
    clearFoundryMocks();
  }
});

test("rendering a weapon sheet restores and preserves a localized ammunition selection", async () => {
  const callbacks = installFoundryMocks({ ready: false });
  class MockElement {}
  globalThis.HTMLElement = MockElement;
  globalThis.Option = class { constructor(label, value) { this.label = label; this.value = value; } };
  try {
    await import(`${runtimeUrl.href}?render`);
    CONFIG.FALLOUT.AMMO_BY_UUID = { "Compendium.en.ammo.10mm": "10mm Round" };
    CONFIG.FALLOUT.AMMO_TYPES = ["10mm Round"];
    const select = { options: [], value: "", add(option) { this.options.push(option); } };
    const html = new MockElement();
    html.querySelector = () => select;
    await callbacks.get("renderItemSheet")({ item: { type: "weapon", system: { ammo: "Munition de 10 mm" } } }, html);
    assert.ok(CONFIG.FALLOUT.AMMO_TYPES.includes("Munition de 10 mm"));
    assert.equal(select.value, "Munition de 10 mm");
    assert.equal(select.options[0].value, "Munition de 10 mm");
  } finally {
    delete globalThis.HTMLElement;
    delete globalThis.Option;
    clearFoundryMocks();
  }
});
