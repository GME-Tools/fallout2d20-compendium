import { readFile, writeFile } from "node:fs/promises";
import { LANGUAGES, PACKS, packId } from "./config.mjs";

const check = process.argv.includes("--check");
const base = JSON.parse(await readFile("module.base.json", "utf8"));

base.packs = LANGUAGES.flatMap(language => PACKS.map(pack => ({
  name: packId(language, pack.name),
  label: `${language.toUpperCase()} - ${pack.label[language]}`,
  path: `packs/${packId(language, pack.name)}`,
  type: pack.type,
  system: "fallout",
  ownership: { PLAYER: "OBSERVER", ASSISTANT: "OWNER" }
})));

base.packFolders = LANGUAGES.map(language => ({
  name: language === "en" ? "Fallout 2d20 - English" : "Fallout 2d20 - Français",
  sorting: "a",
  color: language === "en" ? "#293f5f" : "#c9a227",
  packs: PACKS.map(pack => packId(language, pack.name))
}));

const expected = `${JSON.stringify(base, null, 2)}\n`;
if (check) {
  const actual = await readFile("module.json", "utf8").catch(() => "");
  if (actual !== expected) {
    console.error("module.json is not synchronized with module.base.json and scripts/config.mjs.");
    process.exitCode = 1;
  }
} else {
  await writeFile("module.json", expected);
  console.log("Generated module.json.");
}
