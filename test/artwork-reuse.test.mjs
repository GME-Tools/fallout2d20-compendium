import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { MODULE_ID } from "../scripts/config.mjs";
import { ARTWORK_REUSE_DECISIONS } from "../scripts/data/artwork-reuse-decisions.mjs";
import { imageDimensions } from "../scripts/lib/image-dimensions.mjs";

test("reviewed artwork reuse decisions are paired, traceable, square WebP assets", async () => {
  assert.deepEqual(Object.keys(ARTWORK_REUSE_DECISIONS), ["creature-abilities:UgP0nf5LWNi0gRjm"]);
  for (const [identity, decision] of Object.entries(ARTWORK_REUSE_DECISIONS)) {
    const [pack, id] = identity.split(":");
    assert.equal(pack, "creature-abilities");
    assert.match(decision.image, /\.webp$/i);
    assert.ok(decision.sourceFile && decision.sourceLocator && decision.retrievalDate);
    assert.ok(decision.sharingGroup && decision.sharingJustification);
    const asset = decodeURIComponent(decision.image.slice(`modules/${MODULE_ID}/`.length));
    const dimensions = imageDimensions(await readFile(asset));
    assert.equal(dimensions.width, dimensions.height);
    assert.equal(dimensions.width, 512);
    assert.ok((await stat(asset)).size <= 150 * 1024);
    const paired = [];
    for (const language of ["en", "fr"]) {
      const directory = path.join("generated", "source-packs", language, `${pack}.db`);
      for (const file of (await readdir(directory)).filter(file => file.endsWith(".json"))) {
        const document = JSON.parse(await readFile(path.join(directory, file), "utf8"));
        if (document._id === id) paired.push(document);
      }
    }
    assert.equal(paired.length, 2);
    for (const document of paired) {
      const source = document.flags[MODULE_ID].source;
      assert.equal(document._key, `!items!${id}`);
      assert.equal(document.img, decision.image);
      assert.equal(source.artworkStatus, "shared");
      assert.equal(source.artworkReviewed, true);
      assert.equal(source.artworkSource, decision.artworkSource);
      assert.equal(source.artworkSharingGroup, decision.sharingGroup);
      assert.equal(source.artworkSharingJustification, decision.sharingJustification);
    }
  }
});

test("all priority Actor and ability artwork is resolved", async () => {
  const rows = (await readFile("artwork/inventory/artwork-inventory.jsonl", "utf8")).trim().split("\n").map(JSON.parse);
  const p1 = rows.filter(row => row.priority === "P1");
  assert.equal(p1.length, 65);
  assert.equal(p1.filter(row => row.current_status === "placeholder").length, 0);
  assert.equal(p1.filter(row => row.current_status === "dedicated").length, 29);
  assert.equal(p1.filter(row => row.current_status === "shared").length, 36);
});
