const LOCALIZED_LEAVES = new Set([
  "name", "description", "summary", "effect", "text", "biography", "origin",
  "skill", "ammo", "publication"
]);

export function classifyFrenchOverlayPointer(pointer) {
  if (pointer.startsWith("/flags/fallout2d20-compendium/source/")) return "provenance";
  if (pointer.startsWith("/flags/fallout2d20-compendium/appearances/")) return "provenance";
  if (/^\/flags\/fallout2d20-compendium\/(?:recipe|weaponModRecipes\/\d+)\/perks\/\d+$/.test(pointer)) return "localized-reference";
  if (/^\/system\/(?:perks|skills)$/.test(pointer)) return "localized-reference";
  if (pointer.endsWith("/documentCollection")) return "localized-reference";
  if (/(?:^|\/)(?:weight|carry|base)$/.test(pointer)) return "deterministic-metric";
  if (/\/\$overrides\/(?:~1name|~1system~1description|~1system~1weight)$/.test(pointer)) {
    return pointer.endsWith("weight") ? "deterministic-metric" : "localization";
  }
  const leaf = pointer.split("/").at(-1);
  if (LOCALIZED_LEAVES.has(leaf)) return "localization";
  return null;
}

export function auditFrenchOverlay(overlay, context = overlay?._key ?? "overlay") {
  const issues = [];
  for (const pointer of Object.keys(overlay?.values ?? {})) {
    if (!classifyFrenchOverlayPointer(pointer)) issues.push(`${context}: unauthorized French overlay pointer ${pointer}`);
  }
  return issues;
}
