import path from "node:path";
import { readFile, readdir } from "node:fs/promises";

export const PHYSICAL_WEIGHT_TYPES = new Set([
  "ammo", "apparel", "apparel_mod", "books_and_magz", "consumable", "miscellany",
  "robot_armor", "robot_mod", "weapon", "weapon_mod"
]);

export function canonicalWeight(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function compareFrenchWeight({ pack, document, id, path: fieldPath, english, french }) {
  const label = `${pack}/${document} (${id}) ${fieldPath}`;
  const source = canonicalWeight(english);
  if (source === null) return { ok: false, expected: null, message: `${label}: English canonical weight must be numeric, got ${JSON.stringify(english)}` };
  const expected = source / 2;
  if (typeof french !== "number" || !Number.isFinite(french)) {
    return { ok: false, expected, message: `${label}: French weight must be a finite JSON number, got ${JSON.stringify(french)}; expected ${expected} kg from ${source} lb` };
  }
  if (french !== expected) return { ok: false, expected, message: `${label}: French weight is ${french} kg; expected ${expected} kg from ${source} lb` };
  return { ok: true, expected, message: null };
}

export function nonPhysicalWeightIssue(item, label) {
  if (PHYSICAL_WEIGHT_TYPES.has(item?.type) || !Object.hasOwn(item?.system ?? {}, "weight")) return null;
  const weight = item.system.weight;
  if (weight === "" || weight === null || weight === undefined || Number(weight) === 0) return null;
  return `${label}: non-physical Item type ${JSON.stringify(item.type)} must not carry weight ${JSON.stringify(weight)}`;
}

async function documents(language, pack) {
  const root = path.resolve("generated/source-packs", language, `${pack}.db`);
  const result = new Map();
  for (const file of await readdir(root)) {
    if (!file.endsWith(".json")) continue;
    const fullPath = path.join(root, file);
    const document = JSON.parse(await readFile(fullPath, "utf8"));
    if (/^!(?:items|actors)![^.!]+$/.test(document._key ?? "")) result.set(document._id, { document, file: fullPath });
  }
  return result;
}

function own(object, key) {
  return object != null && Object.hasOwn(object, key);
}

function modDocuments(item) {
  return new Map(Object.entries(item?.system?.mods ?? {}).filter(([, value]) => value?._id && value?.system));
}

function addComparison(comparisons, context, fieldPath, english, french, target, targetKey = "weight") {
  comparisons.push({ ...context, path: fieldPath, english, french, target, targetKey });
}

function collectItemWeights(comparisons, context, english, french, basePath) {
  const englishHasWeight = own(english?.system, "weight");
  const frenchHasWeight = own(french?.system, "weight");
  if (englishHasWeight || frenchHasWeight) {
    addComparison(comparisons, context, `${basePath}.system.weight`, englishHasWeight ? english.system.weight : undefined, frenchHasWeight ? french.system.weight : undefined, frenchHasWeight ? french.system : null);
  }
  const englishMods = modDocuments(english);
  const frenchMods = modDocuments(french);
  for (const modId of new Set([...englishMods.keys(), ...frenchMods.keys()])) {
    const englishMod = englishMods.get(modId);
    const frenchMod = frenchMods.get(modId);
    const modContext = { ...context, nestedId: modId };
    addComparison(comparisons, modContext, `${basePath}.system.mods.${modId}.system.weight`, own(englishMod?.system, "weight") ? englishMod.system.weight : undefined, own(frenchMod?.system, "weight") ? frenchMod.system.weight : undefined, own(frenchMod?.system, "weight") ? frenchMod.system : null);
  }
}

export async function collectFrenchWeightComparisons(packNames) {
  const comparisons = [];
  for (const pack of packNames) {
    const englishDocuments = await documents("en", pack);
    const frenchDocuments = await documents("fr", pack);
    for (const id of new Set([...englishDocuments.keys(), ...frenchDocuments.keys()])) {
      const englishEntry = englishDocuments.get(id);
      const frenchEntry = frenchDocuments.get(id);
      const english = englishEntry?.document;
      const french = frenchEntry?.document;
      const context = {
        pack,
        document: english?.name ?? french?.name ?? "<missing document>",
        id,
        englishFile: englishEntry?.file,
        frenchFile: frenchEntry?.file,
        frenchDocument: french
      };
      if (!english || !french) {
        comparisons.push({ ...context, path: "$root", english: english ? "present" : undefined, french: french ? "present" : undefined, target: null, missingDocument: true });
        continue;
      }
      const rootPhysicalIssue = nonPhysicalWeightIssue(english, `${pack}/${english.name} (${id}) $root.system.weight`);
      if (rootPhysicalIssue) comparisons.push({ ...context, path: "$root.system.weight", invalidPhysicalType: true, message: rootPhysicalIssue });
      if (english._key.startsWith("!items!") && PHYSICAL_WEIGHT_TYPES.has(english.type)) {
        collectItemWeights(comparisons, { ...context, scope: "root" }, english, french, "$root");
      }
      if (own(english.system, "carry") || own(french.system, "carry")) {
        addComparison(comparisons, { ...context, scope: "root-carry" }, "$root.system.carry", english.system.carry, french.system.carry, french.system, "carry");
      }
      const englishItems = new Map((english.items ?? []).map(item => [item._id, item]));
      const frenchItems = new Map((french.items ?? []).map(item => [item._id, item]));
      for (const embeddedId of new Set([...englishItems.keys(), ...frenchItems.keys()])) {
        const englishItem = englishItems.get(embeddedId);
        const frenchItem = frenchItems.get(embeddedId);
        const embeddedContext = { ...context, scope: "actor-embedded", embeddedId, embeddedDocument: englishItem?.name ?? frenchItem?.name ?? "<missing embedded Item>" };
        if (!englishItem || !frenchItem) {
          comparisons.push({ ...embeddedContext, path: `items.${embeddedId}`, english: englishItem ? "present" : undefined, french: frenchItem ? "present" : undefined, target: null, missingDocument: true });
        } else if (PHYSICAL_WEIGHT_TYPES.has(englishItem.type)) {
          collectItemWeights(comparisons, embeddedContext, englishItem, frenchItem, `items.${embeddedId}`);
        } else {
          const physicalIssue = nonPhysicalWeightIssue(englishItem, `${pack}/${english.name} (${id}) items.${embeddedId}.system.weight`);
          if (physicalIssue) comparisons.push({ ...embeddedContext, path: `items.${embeddedId}.system.weight`, invalidPhysicalType: true, message: physicalIssue });
        }
      }
      for (const key of new Set([...Object.keys(english.system?.carryWeight ?? {}), ...Object.keys(french.system?.carryWeight ?? {})])) {
        if (typeof english.system?.carryWeight?.[key] === "object" || typeof french.system?.carryWeight?.[key] === "object") continue;
        addComparison(comparisons, { ...context, scope: "actor-capacity" }, `$root.system.carryWeight.${key}`, english.system?.carryWeight?.[key], french.system?.carryWeight?.[key], french.system?.carryWeight, key);
      }
    }
  }
  return comparisons;
}

export function auditFrenchWeightComparisons(comparisons) {
  const issues = [];
  for (const comparison of comparisons) {
    if (comparison.invalidPhysicalType) {
      issues.push(comparison);
      continue;
    }
    const label = `${comparison.pack}/${comparison.document} (${comparison.id}) ${comparison.path}`;
    if (comparison.missingDocument) {
      issues.push({ ...comparison, expected: null, message: `${label}: missing EN/FR paired document (EN ${comparison.english ?? "absent"}, FR ${comparison.french ?? "absent"})` });
      continue;
    }
    if (!comparison.target || comparison.english === undefined || comparison.french === undefined) {
      issues.push({ ...comparison, expected: canonicalWeight(comparison.english) === null ? null : canonicalWeight(comparison.english) / 2, message: `${label}: missing paired weight field (EN ${JSON.stringify(comparison.english)}, FR ${JSON.stringify(comparison.french)})` });
      continue;
    }
    const result = compareFrenchWeight({ ...comparison, path: comparison.path });
    if (!result.ok) issues.push({ ...comparison, expected: result.expected, message: result.message });
  }
  return issues;
}
