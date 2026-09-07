import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("content audit counts only root documents and editorial debt cannot regress", async () => {
  const audit = JSON.parse(await readFile("reports/content-audit.json", "utf8"));
  assert.deepEqual(audit.totals, { en: 1382, fr: 1382 });
  assert.equal(audit.packs.find(pack => pack.pack === "perks").en, 189);
  assert.equal(audit.issues.length, 0, `editorial audit has ${audit.issues.length} actionable issue(s)`);
  assert.equal(audit.issues.filter(issue => issue.kind === "pdf-extraction-bleed").length, 0);
});
