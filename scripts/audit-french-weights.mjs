import { PACKS } from "./config.mjs";
import { auditFrenchWeightComparisons, collectFrenchWeightComparisons } from "./lib/french-weights.mjs";
import { writeFile } from "node:fs/promises";

const comparisons = await collectFrenchWeightComparisons(PACKS.map(pack => pack.name));
const issues = auditFrenchWeightComparisons(comparisons);
for (const issue of issues) console.error(`ERROR ${issue.message}`);
const root = comparisons.filter(entry => entry.scope === "root").length;
const embedded = comparisons.filter(entry => entry.scope === "actor-embedded").length;
const carry = comparisons.filter(entry => entry.scope === "root-carry").length;
const actorCapacity = comparisons.filter(entry => entry.scope === "actor-capacity").length;
const records = comparisons.map(entry => ({
  pack: entry.pack,
  document: entry.document,
  id: entry.id,
  scope: entry.scope,
  embeddedDocument: entry.embeddedDocument,
  embeddedId: entry.embeddedId,
  nestedId: entry.nestedId,
  path: entry.path,
  frenchFile: entry.frenchFile?.replace(`${process.cwd()}/`, ""),
  english: entry.english,
  french: entry.french,
  expected: typeof entry.english === "number" || typeof entry.english === "string" ? Number(entry.english) / 2 : null,
  status: issues.some(issue => issue.pack === entry.pack && issue.id === entry.id && issue.path === entry.path) ? "error" : "correct"
}));
await writeFile("reports/us103-french-weight-inventory.json", `${JSON.stringify({ rule: "kg = lb / 2", rounding: "none", exceptions: [], totals: { fields: comparisons.length, rootAndNested: root, actorEmbedded: embedded, carryModifiers: carry, actorCapacity, errors: issues.length }, records }, null, 2)}\n`);
console.log(`Audited ${comparisons.length} French weight/capacity fields (${root} root/nested, ${embedded} Actor-embedded, ${carry} carry modifiers, ${actorCapacity} Actor capacity): ${issues.length} error(s).`);
if (issues.length) process.exitCode = 1;
