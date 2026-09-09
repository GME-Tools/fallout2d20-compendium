import { readFile } from "node:fs/promises";
import path from "node:path";
import { listFiles } from "./files.mjs";

export async function loadCanonicalCreatureAbilities(language) {
  const root = path.resolve("generated/source-packs", language, "creature-abilities.db");
  const files = await listFiles(root, (file) => file.endsWith(".json"));
  const entries = await Promise.all(files.map(async (file) => JSON.parse(await readFile(file, "utf8"))));
  return new Map(entries.map((entry) => [entry._id, entry]));
}
