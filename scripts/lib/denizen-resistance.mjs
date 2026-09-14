const BODY_PARTS = ["head", "torso", "armL", "armR", "legL", "legR"];
const RESISTANCE_TYPES = ["physical", "energy", "radiation", "poison"];

function selectedBodyParts(label) {
  const normalized = label.toLowerCase();
  if (normalized.includes("all")) return BODY_PARTS;

  const selected = [];
  if (normalized.includes("head") || normalized.includes("face")) selected.push("head");
  if (normalized.includes("torso")) selected.push("torso");
  if (normalized.includes("arm")) selected.push("armL", "armR");
  if (normalized.includes("leg")) selected.push("legL", "legR");
  return selected;
}

export function parseDenizenResistanceLocations(locations) {
  const values = Object.fromEntries(BODY_PARTS.map(part => [part, 0]));
  if (locations === "Immune") return values;

  const groups = [...String(locations).matchAll(/(\d+)\s*\(([^)]+)\)/g)];
  if (groups.length === 0) {
    const value = Number.parseInt(locations, 10);
    if (Number.isInteger(value)) for (const part of BODY_PARTS) values[part] = value;
    return values;
  }

  for (const [, rawValue, label] of groups) {
    for (const part of selectedBodyParts(label)) values[part] = Number.parseInt(rawValue, 10);
  }
  return values;
}

export function denizenBodyParts(resistance, existing = {}) {
  const parsed = Object.fromEntries(RESISTANCE_TYPES.map(type => [
    type,
    parseDenizenResistanceLocations(resistance?.[type]?.locations ?? "0"),
  ]));

  return Object.fromEntries(BODY_PARTS.map(part => [part, {
    ...(existing[part] ?? {}),
    resistance: Object.fromEntries(RESISTANCE_TYPES.map(type => [type, parsed[type][part]])),
  }]));
}
