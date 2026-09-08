import { access, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MODULE_ID } from "./config.mjs";
import { US_202_ARTWORK_DECISIONS } from "./data/us-202-artwork-decisions.mjs";

const check = process.argv.includes("--check");
const allowedPack = "creature-abilities";
let changed = 0;

for (const [identity, decision] of Object.entries(US_202_ARTWORK_DECISIONS)) {
  const [pack, id] = identity.split(":");
  if (pack !== allowedPack) throw new Error(`${identity}: US-202 decision is outside P1 scope`);
  await access(decodeURIComponent(decision.image.slice(`modules/${MODULE_ID}/`.length)));
  for (const language of ["en", "fr"]) {
    const directory = path.join("src", "packs", language, `${pack}.db`);
    let target = null;
    for (const name of (await readdir(directory)).filter(name => name.endsWith(".json"))) {
      const candidate = path.join(directory, name);
      const document = JSON.parse(await readFile(candidate, "utf8"));
      if (document._id === id && /^!items![^.!]+$/.test(document._key ?? "")) { target = { candidate, document }; break; }
    }
    if (!target) throw new Error(`${language}/${identity}: document not found`);
    const source = target.document.flags?.[MODULE_ID]?.source;
    if (!source) throw new Error(`${language}/${identity}: provenance block missing`);
    const expectedSource = {
      ...source,
      artworkReviewed: decision.artworkReviewed,
      artworkStatus: decision.artworkStatus,
      artworkSource: decision.artworkSource,
      artworkSharingGroup: decision.sharingGroup,
      artworkSharingJustification: decision.sharingJustification
    };
    const stale = target.document.img !== decision.image || JSON.stringify(source) !== JSON.stringify(expectedSource);
    if (stale) {
      changed++;
      if (!check) {
        target.document.img = decision.image;
        target.document.flags[MODULE_ID].source = expectedSource;
        await writeFile(target.candidate, `${JSON.stringify(target.document, null, 2)}\n`);
      }
    }
  }
}

console.log(`${check ? "Found" : "Applied"} ${changed} stale US-202 document(s).`);
if (check && changed) process.exitCode = 1;
