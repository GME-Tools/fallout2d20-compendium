import assert from "node:assert/strict";
import test from "node:test";
import { flattenDocument } from "../scripts/lib/foundry-pack.mjs";

test("Foundry v14 actor packs store embedded items and effects in sublevels", () => {
  const actor = {
    _id: "Actor00000000001",
    _key: "!actors!Actor00000000001",
    name: "Test Actor",
    items: [{
      _id: "Item000000000001",
      name: "Test Item",
      effects: [{ _id: "Effect0000000001", name: "Test Effect" }]
    }],
    effects: [{ _id: "Effect0000000002", name: "Actor Effect" }]
  };

  const records = new Map(flattenDocument(actor));
  assert.deepEqual(records.get("!actors!Actor00000000001").items, ["Item000000000001"]);
  assert.deepEqual(records.get("!actors!Actor00000000001").effects, ["Effect0000000002"]);
  assert.deepEqual(records.get("!actors.items!Actor00000000001.Item000000000001").effects, ["Effect0000000001"]);
  assert.equal(records.get("!actors.items.effects!Actor00000000001.Item000000000001.Effect0000000001").name, "Test Effect");
  assert.equal(records.get("!actors.effects!Actor00000000001.Effect0000000002").name, "Actor Effect");
});

test("already flattened embedded ID arrays remain unchanged", () => {
  const table = {
    _id: "Table00000000001",
    _key: "!tables!Table00000000001",
    results: ["Result0000000001"]
  };
  assert.deepEqual(new Map(flattenDocument(table)).get("!tables!Table00000000001").results, ["Result0000000001"]);
});
