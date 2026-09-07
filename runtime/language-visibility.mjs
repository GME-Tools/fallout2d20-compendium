export const MODULE_ID = "fallout2d20-compendium";
export const LANGUAGE_VISIBILITY_SETTING = "languageVisibility";
export const LANGUAGE_VISIBILITY = Object.freeze({
  BOTH: "both",
  ENGLISH: "en",
  FRENCH: "fr"
});

const VALID_VISIBILITY = new Set(Object.values(LANGUAGE_VISIBILITY));

export function normalizeLanguageVisibility(value) {
  return VALID_VISIBILITY.has(value) ? value : LANGUAGE_VISIBILITY.BOTH;
}

export function hiddenLanguageFor(value) {
  const visibility = normalizeLanguageVisibility(value);
  if (visibility === LANGUAGE_VISIBILITY.ENGLISH) return LANGUAGE_VISIBILITY.FRENCH;
  if (visibility === LANGUAGE_VISIBILITY.FRENCH) return LANGUAGE_VISIBILITY.ENGLISH;
  return null;
}

export function isModulePackForLanguage(collection, language) {
  if (typeof collection !== "string") return false;
  if (collection.startsWith(`${MODULE_ID}.${language}-`)) return true;
  if (!collection.startsWith(`${language}-`)) return false;
  const qualified = `${MODULE_ID}.${collection}`;
  if (game?.packs?.get?.(qualified)) return true;
  return [...(game?.packs ?? [])].some(pack => pack.collection === qualified);
}

export function applyLanguageVisibility(root, value) {
  const hiddenLanguage = hiddenLanguageFor(value);
  const element = root?.querySelectorAll ? root : root?.[0];
  if (!hiddenLanguage || !element?.querySelectorAll) return 0;

  const entries = [...element.querySelectorAll("[data-entry-id], [data-pack]")]
    .filter(entry => {
      const packId = entry.dataset?.entryId ?? entry.dataset?.pack
        ?? entry.getAttribute?.("data-entry-id") ?? entry.getAttribute?.("data-pack");
      return isModulePackForLanguage(packId, hiddenLanguage);
    });
  const affectedFolders = new Set(entries.map(entry => entry.closest?.(".folder")).filter(Boolean));
  for (const entry of entries) entry.remove();
  for (const folder of affectedFolders) {
    if (!folder.querySelector?.("[data-entry-id], [data-pack]")) folder.remove();
  }
  return entries.length;
}

export function renderCompendiumDirectory(_app, html) {
  const visibility = game.settings.get(MODULE_ID, LANGUAGE_VISIBILITY_SETTING);
  return applyLanguageVisibility(html, visibility);
}

export function refreshCompendiumDirectory() {
  return globalThis.ui?.compendium?.render?.({ force: true });
}

export function registerLanguageVisibilitySetting() {
  game.settings.register(MODULE_ID, LANGUAGE_VISIBILITY_SETTING, {
    name: `${MODULE_ID}.settings.languageVisibility.name`,
    hint: `${MODULE_ID}.settings.languageVisibility.hint`,
    scope: "client",
    config: true,
    type: String,
    choices: {
      [LANGUAGE_VISIBILITY.BOTH]: `${MODULE_ID}.settings.languageVisibility.choices.both`,
      [LANGUAGE_VISIBILITY.ENGLISH]: `${MODULE_ID}.settings.languageVisibility.choices.en`,
      [LANGUAGE_VISIBILITY.FRENCH]: `${MODULE_ID}.settings.languageVisibility.choices.fr`
    },
    default: LANGUAGE_VISIBILITY.BOTH,
    onChange: refreshCompendiumDirectory
  });
}

Hooks.once("init", registerLanguageVisibilitySetting);
Hooks.on("renderCompendiumDirectory", renderCompendiumDirectory);
