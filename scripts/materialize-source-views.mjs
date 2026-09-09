import { rm } from "node:fs/promises";
import path from "node:path";
import { LANGUAGES, PACKS } from "./config.mjs";
import { materializeSourceViews } from "./lib/canonical-pack-sources.mjs";

const output = path.resolve(process.argv[2] ?? "generated/source-packs");
await rm(output, { recursive: true, force: true });
await materializeSourceViews(output, LANGUAGES, PACKS);
console.log(`Materialized ${LANGUAGES.length * PACKS.length} language-specific source views in ${path.relative(process.cwd(), output)}.`);
