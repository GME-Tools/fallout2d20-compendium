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

test("ammunition restoration preserves third-party entries and is idempotent", async () => {
  installFoundryMocks({ ready: false });
  try {
    CONFIG.FALLOUT.AMMO_BY_UUID = { "Compendium.third-party.ammo.custom": "Custom Ammo" };
    CONFIG.FALLOUT.AMMO_TYPES = ["Custom Ammo"];
    const runtime = await import(`${runtimeUrl.href}?ammo-merge`);
    await runtime.restoreAmmunitionConfiguration();
    await runtime.restoreAmmunitionConfiguration();
    assert.equal(CONFIG.FALLOUT.AMMO_BY_UUID["Compendium.third-party.ammo.custom"], "Custom Ammo");
    assert.deepEqual(CONFIG.FALLOUT.AMMO_TYPES, ["10mm Round", "Custom Ammo", "Munition de 10 mm"]);
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

test("French module Actors use exact kilogram capacity and inventory calculations", async () => {
  installFoundryMocks({ ready: false });
  class FalloutActorMock {
    get useKgs() { return false; }
    _getItemsTotalWeight() { return 999; }
    _calculateEncumbrance() { this.englishCalculation = true; }
    _prepareRobotData() { this.robotPrepared = true; }
  }
  CONFIG.Actor = { documentClass: FalloutActorMock };
  game.settings = { get: (_system, key) => key === "carryBaseRobot" ? 150 : 150 };
  try {
    const runtime = await import(`${runtimeUrl.href}?weights`);
    assert.equal(runtime.installFrenchWeightRuntime(), true);
    const actor = new FalloutActorMock();
    actor.type = "npc";
    actor.flags = { "fallout2d20-compendium": { source: { book: "core_rulebook", language: "fr" } } };
    actor.system = {
      attributes: { str: { value: 6 } },
      carryWeight: { base: 105, value: 0, mod: 2.5 },
      materials: { junk: 2, common: 3, uncommon: 0, rare: 0 }
    };
    actor.items = [
      { type: "weapon", system: { weight: 4.5, quantity: 2, stashed: false, isJunk: false } },
      { type: "miscellany", system: { weight: 1, quantity: 3, stashed: false, isJunk: true } }
    ];
    actor.perkLevel = () => 0;
    actor._calculateEncumbrance();
    assert.equal(actor.useKgs, true);
    assert.deepEqual(actor.system.carryWeight, { base: 105, value: 107.5, mod: 2.5, total: 15.5 });
    assert.equal(actor.system.encumbranceLevel, 0);
  } finally {
    clearFoundryMocks();
  }
});

test("French Starter Actors use exact kilograms while external and English Actors in pound worlds delegate", async () => {
  installFoundryMocks({ ready: false });
  class FalloutActorMock {
    get useKgs() { return false; }
    _getItemsTotalWeight() { return 12; }
    _calculateEncumbrance() { this.delegated = true; }
    _prepareRobotData() {}
  }
  CONFIG.Actor = { documentClass: FalloutActorMock };
  game.system = { version: "11.17.1" };
  game.settings = { get: (_system, key) => ({ carryUnit: "lbs", carryBase: 150, carryBaseRobot: 150 })[key] };
  try {
    const runtime = await import(`${runtimeUrl.href}?starter-weights`);
    assert.equal(runtime.installFrenchWeightRuntime(), true);
    const actor = source => Object.assign(new FalloutActorMock(), {
      type: "npc",
      flags: source ? { "fallout2d20-compendium": { source } } : {},
      system: { attributes: { str: { value: 5 } }, carryWeight: { base: 0, value: 0, mod: 0 }, materials: {} },
      items: [], perkLevel: () => 0
    });
    const starterFr = actor({ book: "starter_set", language: "fr" });
    starterFr._calculateEncumbrance();
    assert.equal(starterFr.useKgs, true);
    assert.equal(starterFr.system.carryWeight.base, 100);
    for (const delegated of [actor({ book: "starter_set", language: "en" }), actor(null)]) {
      delegated._calculateEncumbrance();
      assert.equal(delegated.delegated, true);
      assert.equal(delegated.useKgs, false);
    }
  } finally {
    clearFoundryMocks();
  }
});

test("runtime compatibility fails explicitly for unsupported Fallout versions and missing Actor APIs", async () => {
  installFoundryMocks({ ready: false });
  const messages = [];
  const originalError = console.error;
  console.error = message => messages.push(message);
  try {
    class UnsupportedActor {}
    CONFIG.Actor = { documentClass: UnsupportedActor };
    game.system = { version: "12.0.0" };
    const runtime = await import(`${runtimeUrl.href}?unsupported-system`);
    assert.equal(runtime.installFrenchWeightRuntime(), false);
    assert.match(messages.at(-1), /outside the supported runtime compatibility fence/);
    game.system.version = "11.17.1";
    assert.equal(runtime.installFrenchWeightRuntime(), false);
    assert.match(messages.at(-1), /does not expose the Actor APIs required/);
  } finally {
    console.error = originalError;
    clearFoundryMocks();
  }
});

test("French robot capacity preserves fractional carry modifiers while English Actors delegate", async () => {
  installFoundryMocks({ ready: false });
  class FalloutActorMock {
    get useKgs() { return false; }
    _getItemsTotalWeight() { return 12; }
    _calculateEncumbrance() { this.englishCalculation = true; }
    _prepareRobotData() { this.robotPrepared = true; this.system.carryWeight.base += 999; }
  }
  CONFIG.Actor = { documentClass: FalloutActorMock };
  game.settings = { get: () => 150 };
  try {
    const runtime = await import(`${runtimeUrl.href}?robot-weights`);
    runtime.installFrenchWeightRuntime();
    const robot = new FalloutActorMock();
    robot.type = "robot";
    robot.flags = { "fallout2d20-compendium": { source: { book: "core_rulebook", language: "fr" } } };
    robot.system = { carryWeight: { base: 0, value: 0, mod: 0 }, materials: {} };
    robot.items = [{ type: "robot_armor", system: { carry: 2.5, equipped: true, stashed: false, weight: 0, quantity: 1 } }];
    robot.perkLevel = () => 0;
    robot._prepareRobotData();
    assert.equal(robot.system.carryWeight.base, 77.5);
    assert.equal(robot.system.carryWeight.value, 77.5);

    const english = new FalloutActorMock();
    english.flags = { "fallout2d20-compendium": { source: { book: "core_rulebook", language: "en" } } };
    english._calculateEncumbrance();
    assert.equal(english.englishCalculation, true);
    assert.equal(english.useKgs, false);
  } finally {
    clearFoundryMocks();
  }
});

test("a newly created Actor uses the configured 75 kg base without converting it again", async () => {
  installFoundryMocks({ ready: false });
  class FalloutActorMock {
    get useKgs() { return game.settings.get("fallout", "carryUnit") === "kgs"; }
    _getItemsTotalWeight() { return 999; }
    _calculateEncumbrance() { this.system.carryWeight.base = 98; }
    _prepareRobotData() {}
  }
  CONFIG.Actor = { documentClass: FalloutActorMock };
  game.settings = { get: (_system, key) => ({ carryUnit: "kgs", carryBase: 75, carryBaseRobot: 75 })[key] };
  try {
    const runtime = await import(`${runtimeUrl.href}?new-actor-kgs`);
    runtime.installFrenchWeightRuntime();
    const actor = new FalloutActorMock();
    actor.type = "character";
    actor.flags = {};
    actor.system = {
      attributes: { str: { value: 5 } },
      carryWeight: { base: 0, value: 0, mod: 0 },
      materials: { junk: 0, common: 0, uncommon: 0, rare: 0 }
    };
    actor.items = [];
    actor.perkLevel = () => 0;
    actor._calculateEncumbrance();
    assert.equal(actor.system.carryWeight.base, 100);
    assert.equal(actor.system.carryWeight.value, 100);
    assert.equal(actor.system.carryWeight.total, 0);
    assert.equal(actor.useKgs, true);
  } finally {
    clearFoundryMocks();
  }
});
