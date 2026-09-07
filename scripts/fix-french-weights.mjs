import { writeFile } from "node:fs/promises";
import { PACKS } from "./config.mjs";
import { canonicalWeight, collectFrenchWeightComparisons } from "./lib/french-weights.mjs";

const comparisons = await collectFrenchWeightComparisons(PACKS.map(pack => pack.name));
const changed = new Map();
for (const comparison of comparisons) {
  const expected = canonicalWeight(comparison.english);
  if (comparison.missingDocument || expected === null || !comparison.target) continue;
  const converted = expected / 2;
  if (comparison.target[comparison.targetKey] === converted && typeof comparison.target[comparison.targetKey] === "number") continue;
  comparison.target[comparison.targetKey] = converted;
  changed.set(comparison.frenchFile, comparison.frenchDocument);
}
for (const [file, document] of changed) await writeFile(file, `${JSON.stringify(document, null, 2)}\n`);
console.log(`Converted French weights in ${changed.size} source documents.`);
