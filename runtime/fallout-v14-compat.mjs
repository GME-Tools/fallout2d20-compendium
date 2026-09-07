const MODULE_ID = "fallout2d20-compendium";

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
    const byUuid = {};
    const names = [];
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
  await restoreAmmunitionConfiguration();
}

Hooks.on("renderItemSheet", preserveAmmunitionSelection);
if (globalThis.game?.ready) stabilizeAmmunitionConfiguration();
else Hooks.once("ready", stabilizeAmmunitionConfiguration);
