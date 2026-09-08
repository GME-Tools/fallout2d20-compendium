import assert from "node:assert/strict";
import test from "node:test";
import { PACKS } from "../scripts/config.mjs";
import { auditFrenchWeightComparisons, collectFrenchWeightComparisons, compareFrenchWeight } from "../scripts/lib/french-weights.mjs";
import { readFile } from "node:fs/promises";

const base = { pack: "weapons", document: "Test Weapon", id: "TestWeight000001", path: "$root.system.weight" };

test("French weight comparison uses exact division by two without rounding", () => {
  assert.equal(compareFrenchWeight({ ...base, english: 0.025, french: 0.0125 }).ok, true);
  assert.equal(compareFrenchWeight({ ...base, english: -5, french: -2.5 }).ok, true);
  assert.equal(compareFrenchWeight({ ...base, english: 0, french: 0 }).ok, true);
});

test("numeric English Actor baselines are accepted but French weights must be JSON numbers", () => {
  assert.equal(compareFrenchWeight({ ...base, english: "9", french: 4.5 }).ok, true);
  assert.match(compareFrenchWeight({ ...base, english: 9, french: "4.5" }).message, /finite JSON number/);
});

test("missing and non-numeric values fail with identity and field diagnostics", () => {
  const missing = auditFrenchWeightComparisons([{ ...base, english: 2, french: undefined, target: null }]);
  assert.equal(missing.length, 1);
  assert.match(missing[0].message, /weapons\/Test Weapon \(TestWeight000001\) \$root\.system\.weight: missing paired weight field/);
  assert.match(compareFrenchWeight({ ...base, english: null, french: 0 }).message, /English canonical weight must be numeric/);
});

test("all root, nested-mod, and Actor-embedded French weights match the English Core canon", async () => {
  const comparisons = await collectFrenchWeightComparisons(PACKS.map(pack => pack.name));
  assert.ok(comparisons.some(entry => entry.scope === "root" && entry.path === "$root.system.weight"));
  assert.ok(comparisons.some(entry => entry.scope === "root" && entry.path.includes(".system.mods.")));
  assert.ok(comparisons.some(entry => entry.scope === "actor-embedded"));
  assert.deepEqual(auditFrenchWeightComparisons(comparisons).map(issue => issue.message), []);
});

test("the checked-in exhaustive inventory records no exception or audit error", async () => {
  const report = JSON.parse(await readFile("reports/us103-french-weight-inventory.json", "utf8"));
  assert.equal(report.rule, "kg = lb / 2");
  assert.equal(report.rounding, "none");
  assert.deepEqual(report.exceptions, []);
  assert.deepEqual(report.totals, { fields: 3570, rootAndNested: 3177, actorEmbedded: 237, carryModifiers: 51, actorCapacity: 105, errors: 0 });
  assert.equal(report.records.filter(record => record.status !== "correct").length, 0);
});
