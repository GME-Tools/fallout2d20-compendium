import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { imageDimensions } from "../scripts/lib/image-dimensions.mjs";

test("owner-supplied priority equipment artwork is paired, bounded and traceable",async()=>{
  const rows=(await readFile("artwork/inventory/artwork-inventory.jsonl","utf8")).trim().split("\n").map(JSON.parse);
  const packs=new Set(["addictions","books-and-magazines","consumables","perks"]);
  const selected=rows.filter(row=>packs.has(row.pack)&&row.current_artwork_source?.startsWith("Owner-supplied repository asset"));
  assert.equal(selected.length,47);
  assert.deepEqual([...new Set(selected.map(row=>row.pack))].sort(),["addictions","books-and-magazines","consumables","perks"]);
  for(const row of selected){
    assert.notEqual(row.current_status,"placeholder");
    assert.ok(row.current_artwork_source);
    const file=decodeURIComponent(row.current_image.replace("modules/fallout2d20-compendium/",""));
    const dimensions=imageDimensions(await readFile(file));
    assert.ok(dimensions.width>0); assert.ok(dimensions.height>0);
    assert.ok((await stat(file)).size<=300*1024,`${row.identity}: oversized`);
  }
});
