import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LANGUAGES } from "../scripts/config.mjs";
import { listFiles } from "../scripts/lib/files.mjs";
import { APPROVED_CORE_DUPLICATE_NAME_GROUPS, approvedDuplicateNameGroups, duplicateGroupSignature } from "../scripts/data/approved-core-duplicate-names.mjs";

test("approved duplicate names describe every and only complete duplicate group", async () => {
  for (const language of LANGUAGES) {
    for (const pack of Object.keys(APPROVED_CORE_DUPLICATE_NAME_GROUPS)) {
      const documents = [];
      for (const file of await listFiles(path.resolve(`generated/source-packs/${language}/${pack}.db`), candidate => candidate.endsWith(".json"))) {
        const document = JSON.parse(await readFile(file, "utf8"));
        documents.push(document);
      }
      const byName = new Map();
      for (const document of documents) {
        const name = document.name.trim().toLocaleLowerCase(language);
        byName.set(name, [...(byName.get(name) ?? []), document._id]);
      }
      const observed = new Set([...byName.values()].filter(ids => ids.length > 1).map(duplicateGroupSignature));
      const approved = new Set(approvedDuplicateNameGroups(language, pack).map(duplicateGroupSignature));
      assert.deepEqual(observed, approved, `${language}/${pack}`);
    }
  }
});

test("approved duplicate groups do not reuse a document ID", () => {
  for (const [pack, groups] of Object.entries(APPROVED_CORE_DUPLICATE_NAME_GROUPS)) {
    const ids = groups.flat();
    assert.equal(new Set(ids).size, ids.length, pack);
  }
});
