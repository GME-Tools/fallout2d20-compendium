const LOCALIZED_LEAVES = new Set([
  "name", "description", "summary", "effect", "text", "biography", "origin",
  "skill", "ammo", "publication"
]);

const DETERMINISTIC_METRIC_POINTERS = [
  /^\/system\/(?:weight|carry)$/,
  /^\/system\/carryWeight\/(?:base|value|mod|total)$/,
  /^\/system\/mods\/[^/]+\/system\/weight$/,
  /^\/system\/mods\/[^/]+\/\$overrides\/~1system~1weight$/,
  /^\/items\/@[^/]+\/system\/(?:weight|carry)$/,
  /^\/items\/@[^/]+\/system\/mods\/[^/]+\/system\/weight$/,
  /^\/items\/@[^/]+\/system\/mods\/[^/]+\/\$overrides\/~1system~1weight$/,
  /^\/items\/@[^/]+\/\$overrides\/~1system~1weight$/
];

export function isDeterministicMetricPointer(pointer) {
  return DETERMINISTIC_METRIC_POINTERS.some(pattern => pattern.test(pointer));
}

export function classifyFrenchOverlayPointer(pointer) {
  if (pointer.startsWith("/flags/fallout2d20-compendium/source/")) return "provenance";
  if (pointer.startsWith("/flags/fallout2d20-compendium/appearances/")) return "provenance";
  if (/^\/flags\/fallout2d20-compendium\/(?:recipe|weaponModRecipes\/\d+)\/perks\/\d+$/.test(pointer)) return "localized-reference";
  if (/^\/system\/(?:perks|skills)$/.test(pointer)) return "localized-reference";
  if (pointer.endsWith("/documentCollection")) return "localized-reference";
  if (isDeterministicMetricPointer(pointer)) return "deterministic-metric";
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
