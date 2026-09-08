import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("content audit counts only root documents and editorial debt cannot regress", async () => {
  const audit = JSON.parse(await readFile("reports/content-audit.json", "utf8"));
  assert.deepEqual(audit.totals, { en: 1380, fr: 1380 });
  assert.equal(audit.schemaVersion, 2);
  assert.equal(audit.publications.core_rulebook.firstAppearances, 2760);
  assert.equal(audit.publications.core_rulebook.secondaryAppearances, 0);
  assert.deepEqual(audit.publications.core_rulebook.languages, ["en", "fr"]);
  assert.deepEqual(audit.publications.core_rulebook.editions.en[0], { id: "en-digital-2023-02", translation: "original", errata: ["errata-v6-2026"] });
  assert.equal(audit.packs.find(pack => pack.pack === "perks").en, 189);
  assert.equal(audit.issues.length, 0, `editorial audit has ${audit.issues.length} actionable issue(s)`);
  assert.equal(audit.issues.filter(issue => issue.kind === "pdf-extraction-bleed").length, 0);
});
