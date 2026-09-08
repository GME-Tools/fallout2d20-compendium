import { PACKS } from "./config.mjs";
import { auditFrenchWeightComparisons, collectFrenchWeightComparisons } from "./lib/french-weights.mjs";

const comparisons = await collectFrenchWeightComparisons(PACKS.map(pack => pack.name));
const issues = auditFrenchWeightComparisons(comparisons);
for (const issue of issues) console.error(`ERROR ${issue.message}`);
const root = comparisons.filter(entry => entry.scope === "root").length;
const embedded = comparisons.filter(entry => entry.scope === "actor-embedded").length;
const carry = comparisons.filter(entry => entry.scope === "root-carry").length;
const actorCapacity = comparisons.filter(entry => entry.scope === "actor-capacity").length;
console.log(`Audited ${comparisons.length} French weight/capacity fields (${root} root/nested, ${embedded} Actor-embedded, ${carry} carry modifiers, ${actorCapacity} Actor capacity): ${issues.length} error(s).`);
if (issues.length) process.exitCode = 1;
