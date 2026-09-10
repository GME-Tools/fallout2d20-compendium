import { COMPATIBILITY } from "./compatibility.mjs";

const MODULE_ID = "fallout2d20-compendium";
const PATCHED = Symbol.for(`${MODULE_ID}.frenchWeightRuntimePatched`);
const SUPPORTED_FALLOUT_MAJORS = new Set([COMPATIBILITY.fallout.major]);

export function isFrenchModuleDocument(document) {
  const source = document?.flags?.[MODULE_ID]?.source;
  return source?.language === "fr";
}

export function usesExactKilograms(document) {
  return isFrenchModuleDocument(document) || game.settings.get("fallout", "carryUnit") === "kgs";
}

export function configuredKilogramBase(value) {
  return game.settings.get("fallout", "carryUnit") === "kgs" ? number(value) : number(value) / 2;
}

function number(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function frenchItemsTotalWeight(actor) {
  let physicalItems = [...(actor.items ?? [])].filter(item => !item.system?.stashed && item.system?.weight != null);
  if (actor.type === "character") {
    physicalItems = physicalItems.filter(item => item.system?.apparelType !== "powerArmor" || !item.system?.powerArmor?.powered);
  } else if (actor.isCreature) {
    physicalItems = physicalItems.filter(item => item.type !== "consumable" || !item.system?.butchery);
  }
  let junkWeight = number(actor.system?.materials?.junk);
  let materialWeight = 0;
  for (const material of ["common", "uncommon", "rare"]) materialWeight += number(actor.system?.materials?.[material]) / 2;
  let itemsWeight = 0;
  for (const item of physicalItems) {
    const itemWeight = number(item.system?.weight);
    const quantity = number(item.system?.quantity);
    if (item.system?.isJunk) junkWeight += itemWeight * quantity;
    else itemsWeight += itemWeight * quantity;
  }
  if (actor.perkLevel?.("Pack Rat") > 0) junkWeight /= 2;
  return Number.parseFloat((itemsWeight + junkWeight + materialWeight).toFixed(2));
}

export function prepareFrenchEncumbrance(actor, carryBaseKilograms) {
  const strength = number(actor.system?.attributes?.str?.value);
  actor.system.carryWeight.base = strength * 5 + number(carryBaseKilograms);
  actor.system.carryWeight.value = actor.system.carryWeight.base + number(actor.system.carryWeight.mod);
  actor.system.carryWeight.total = frenchItemsTotalWeight(actor);
  const excess = actor.system.carryWeight.total - actor.system.carryWeight.value;
  actor.system.encumbranceLevel = excess > 0 ? Math.ceil(excess / 25) : 0;
}

export function prepareFrenchRobotEncumbrance(actor, sourceBase, carryBaseKilograms) {
  const carryModifier = [...(actor.items ?? [])]
    .filter(item => item.type === "robot_armor" && item.system?.equipped && !item.system?.stashed)
    .reduce((total, item) => total + number(item.system.carry), 0);
  actor.system.carryWeight.base = number(sourceBase) + number(carryBaseKilograms) + carryModifier;
  actor.system.carryWeight.value = actor.system.carryWeight.base + number(actor.system.carryWeight.mod);
  actor.system.carryWeight.total = frenchItemsTotalWeight(actor);
  const excess = actor.system.carryWeight.total - actor.system.carryWeight.value;
  actor.system.encumbranceLevel = excess > 0 ? Math.ceil(excess / 25) : 0;
}

export function installFrenchWeightRuntime() {
  const ActorClass = globalThis.CONFIG?.Actor?.documentClass;
  const prototype = ActorClass?.prototype;
  if (!prototype || prototype[PATCHED]) return false;
  const systemVersion = globalThis.game?.system?.version;
  const systemMajor = Number.parseInt(systemVersion, 10);
  if (systemVersion && !SUPPORTED_FALLOUT_MAJORS.has(systemMajor)) {
    console.error(`${MODULE_ID} | Fallout ${systemVersion} is outside the supported runtime compatibility fence (${[...SUPPORTED_FALLOUT_MAJORS].join(", ")}.x). Exact French kilogram patches were not installed.`);
    return false;
  }
  const useKgs = Object.getOwnPropertyDescriptor(prototype, "useKgs");
  const calculateEncumbrance = prototype._calculateEncumbrance;
  const prepareRobotData = prototype._prepareRobotData;
  const itemsTotalWeight = prototype._getItemsTotalWeight;
  if (!useKgs?.get || typeof calculateEncumbrance !== "function" || typeof prepareRobotData !== "function" || typeof itemsTotalWeight !== "function") {
    console.error(`${MODULE_ID} | Fallout ${systemVersion ?? "unknown"} does not expose the Actor APIs required for exact French kilogram support.`);
    return false;
  }

  Object.defineProperty(prototype, "useKgs", {
    configurable: true,
    get() {
      if (usesExactKilograms(this)) return true;
      return useKgs.get.call(this);
    }
  });
  prototype._getItemsTotalWeight = function (...args) {
    return usesExactKilograms(this) ? frenchItemsTotalWeight(this) : itemsTotalWeight.apply(this, args);
  };
  prototype._calculateEncumbrance = function (...args) {
    if (!usesExactKilograms(this)) return calculateEncumbrance.apply(this, args);
    return prepareFrenchEncumbrance(this, configuredKilogramBase(game.settings.get("fallout", "carryBase")));
  };
  prototype._prepareRobotData = function (...args) {
    if (!usesExactKilograms(this) || this.type !== "robot") return prepareRobotData.apply(this, args);
    const sourceBase = this.system.carryWeight.base;
    const result = prepareRobotData.apply(this, args);
    prepareFrenchRobotEncumbrance(this, sourceBase, configuredKilogramBase(game.settings.get("fallout", "carryBaseRobot")));
    return result;
  };
  Object.defineProperty(prototype, PATCHED, { value: true });
  console.info(`${MODULE_ID} | Installed exact French kilogram and carrying-capacity compatibility.`);
  return true;
}

export async function restoreAmmunitionConfiguration() {
  try {
    const ammunitionPacks = [...game.packs].filter(pack =>
      pack.collection.startsWith(`${MODULE_ID}.`)
      && pack.metadata.type === "Item"
      && pack.metadata.name.includes("ammunition")
    );
    const ammunitionIndexes = await Promise.all(
      ammunitionPacks.map(pack => pack.getIndex({ fields: ["system"] }))
    );
    const ammunition = ammunitionIndexes.flatMap(index => [...index]).filter(entry => entry.type === "ammo");
    const byUuid = { ...(CONFIG.FALLOUT.AMMO_BY_UUID ?? {}) };
    const names = [...(CONFIG.FALLOUT.AMMO_TYPES ?? [])];
    for (const entry of ammunition) {
      byUuid[entry.uuid] = entry.name;
      names.push(entry.name);
    }
    CONFIG.FALLOUT.AMMO_BY_UUID = byUuid;
    CONFIG.FALLOUT.AMMO_TYPES = [...new Set(names)].sort((left, right) => left.localeCompare(right));
    console.info(`${MODULE_ID} | Restored Fallout ammunition configuration for Foundry v14.`);
  } catch (error) {
    console.error(`${MODULE_ID} | Unable to restore Fallout ammunition configuration.`, error);
  }
}

export async function preserveAmmunitionSelection(app, html) {
  const item = app.item ?? app.document;
  const ammunition = item?.type === "weapon_mod" ? item.system?.modEffects?.ammo : item?.system?.ammo;
  if (!ammunition) return;
  if (!CONFIG.FALLOUT.AMMO_TYPES?.includes(ammunition)) await restoreAmmunitionConfiguration();

  const root = html instanceof HTMLElement ? html : html?.[0];
  const fieldName = item.type === "weapon_mod" ? "system.modEffects.ammo" : "system.ammo";
  const select = root?.querySelector?.(`select[name="${fieldName}"]`);
  if (!select) return;
  if (![...select.options].some((option) => option.value === ammunition)) select.add(new Option(ammunition, ammunition));
  select.value = ammunition;
}

async function stabilizeAmmunitionConfiguration() {
  installFrenchWeightRuntime();
  await restoreAmmunitionConfiguration();
}

Hooks.on("renderItemSheet", preserveAmmunitionSelection);
Hooks.once("init", installFrenchWeightRuntime);
if (globalThis.game?.ready) stabilizeAmmunitionConfiguration();
else Hooks.once("ready", stabilizeAmmunitionConfiguration);
