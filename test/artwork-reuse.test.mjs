import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ARTWORK_REUSE_DECISIONS } from "../scripts/data/artwork-reuse-decisions.mjs";

test("no standalone creature-ability artwork reuse decision remains", () => {
  assert.deepEqual(ARTWORK_REUSE_DECISIONS, {});
});

test("the standalone artwork inventory no longer tracks creature abilities", async () => {
  const rows = (await readFile("artwork/inventory/artwork-inventory.jsonl", "utf8")).trim().split("\n").map(JSON.parse);
  assert.equal(rows.some(row => row.pack === "creature-abilities"), false);
});
