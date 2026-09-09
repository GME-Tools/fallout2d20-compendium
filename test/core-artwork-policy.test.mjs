import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { MODULE_ID, PACKS } from "../scripts/config.mjs";

async function documents(language, pack) {
  const root = path.join("generated", "source-packs",language,`${pack}.db`);
  return (await Promise.all((await readdir(root)).filter((file) => file.endsWith(".json")).map(async (file) =>
    JSON.parse(await readFile(path.join(root,file),"utf8"))
  ))).filter((document) => !document._key?.split("!")[1]?.includes("."));
}

test("every canonical document has an explicit artwork decision shared by both languages", async () => {
  const counts = { dedicated:0, shared:0, placeholder:0 };
  for (const pack of PACKS) {
    const en = await documents("en",pack.name);
    const fr = new Map((await documents("fr",pack.name)).map((document) => [document._id,document]));
    for (const source of en) {
      const translated = fr.get(source._id);
      assert.ok(translated, `${pack.name}/${source.name}`);
      const decision = source.flags[MODULE_ID].source;
      assert.ok(["dedicated","shared","placeholder"].includes(decision.artworkStatus), `${pack.name}/${source.name}: missing artwork status`);
      assert.equal(translated.img,source.img,`${pack.name}/${source.name}: image differs by language`);
      assert.equal(translated.flags[MODULE_ID].source.artworkStatus,decision.artworkStatus,`${pack.name}/${source.name}: status differs by language`);
      assert.equal(decision.artworkReviewed,decision.artworkStatus !== "placeholder");
      if (decision.artworkStatus === "shared") assert.ok(decision.artworkSource,`${pack.name}/${source.name}: shared source missing`);
      if (decision.artworkStatus !== "placeholder") {
        assert.ok(source.img.startsWith(`modules/${MODULE_ID}/`));
        await access(decodeURIComponent(source.img.slice(`modules/${MODULE_ID}/`.length)));
      }
      counts[decision.artworkStatus]++;
    }
  }
  assert.deepEqual(counts,{dedicated:660,shared:612,placeholder:30});
});
