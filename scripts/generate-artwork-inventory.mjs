import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { CONTACT_SHEET_PATH, INVENTORY_PATH, deriveInventory, mergeEditorial, parseInventory, serializeInventory, validateInventory } from "./lib/artwork-inventory.mjs";
import { ARTWORK_REUSE_DECISIONS } from "./data/artwork-reuse-decisions.mjs";

const check = process.argv.includes("--check");
const exists = async file => { try { return await readFile(file, "utf8"); } catch (error) { if (error.code === "ENOENT") return null; throw error; } };
const escape = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const previousText = await exists(INVENTORY_PATH);
const previousRows = previousText ? parseInventory(previousText) : [];
const derived = await deriveInventory(new Set(previousRows.map(row => row.identity)));
const rows = mergeEditorial(derived, previousRows);
for (const row of rows) if (row.current_status !== "placeholder" && row.current_artwork_source) {
  const url=row.current_artwork_source.match(/Owner-approved URL: (https?:\/\/\S+?);/)?.[1];
  Object.assign(row,{
    candidate_source_kind:url?"owner-approved-web":row.current_artwork_source.startsWith("AI-generated")?"generated-private":row.current_artwork_source.startsWith("US-202 reuse")||row.current_artwork_source.startsWith("shared from sole user actor")?"repository-reviewed-asset":row.current_artwork_source.startsWith("Owner-supplied repository asset")?"owner-supplied-game-asset":row.candidate_source_kind,
    candidate_source:row.current_artwork_source,
    candidate_locator:url ?? row.current_image,
    provenance_or_permission_expected:"Integrated artwork provenance recorded on the paired documents.",
    blocker:null,
    review_state:"approved",
    owner_decision_required:"None; integrated under the active artwork story."
  });
}
for (const row of rows) {
  const decision = ARTWORK_REUSE_DECISIONS[row.identity];
  if (!decision) continue;
  Object.assign(row, {
    sharing_group: decision.sharingGroup,
    sharing_status: "approved",
    candidate_source_kind: "owner-supplied-game-asset",
    candidate_source: decision.artworkSource,
    candidate_locator: decision.sourceLocator,
    provenance_or_permission_expected: `Existing reviewed repository asset; source file: ${decision.sourceFile}; reuse recorded ${decision.retrievalDate}.`,
    blocker: null,
    review_state: "approved",
    owner_decision_required: "None; exact mechanical equipment reuse is approved."
  });
}
const errors = validateInventory(rows, derived);
if (errors.length) throw new Error(errors.join("\n"));

const inventory = serializeInventory(rows);
const cards = rows.map(row => `<article data-priority="${row.priority}" data-pack="${escape(row.pack)}">${row.current_status === "placeholder" ? `<div class="placeholder">${escape(row.name_en.slice(0, 2).toUpperCase())}</div>` : `<img src="../../${escape(row.current_image.replace(/^modules\/fallout2d20-compendium\//, ""))}" alt="">`}<div><h2>${escape(row.name_en)}</h2><p lang="fr">${escape(row.name_fr)}</p><dl><dt>Identity</dt><dd>${escape(row.identity)}</dd><dt>Pack / type</dt><dd>${escape(row.pack)} / ${escape(row.system_type || row.document_type)}</dd><dt>Priority</dt><dd>${row.priority}</dd><dt>Provenance</dt><dd>${escape(row.candidate_locator || row.blocker)}</dd><dt>Status</dt><dd>${escape(row.current_status)}</dd><dt>Sharing</dt><dd>${escape(row.sharing_group || "none")}</dd><dt>Review</dt><dd>${escape(row.review_state)}</dd></dl></div></article>`).join("\n");
const contact = `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Inventaire d’illustrations</title><style>body{font:14px system-ui;margin:24px;background:#171b18;color:#eef4eb}header{max-width:900px;margin:auto auto 24px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:12px}article{display:grid;grid-template-columns:96px 1fr;gap:12px;padding:12px;background:#242b26;border:1px solid #59665c;border-radius:8px}.placeholder,img{width:96px;height:96px;object-fit:cover}.placeholder{display:grid;place-items:center;background:#39443c;color:#b9c7bc;font-size:28px;font-weight:700}h2{font-size:16px;margin:0}p{margin:3px 0 8px;color:#bec9c0}dl{display:grid;grid-template-columns:80px 1fr;margin:0;font-size:12px}dt{color:#91a296}dd{margin:0;overflow-wrap:anywhere}article[data-priority=P1]{border-color:#e35d4f}article[data-priority=P2]{border-color:#e7a93d}article[data-priority=P3]{border-color:#78a9d1}</style></head><body><header><h1>Inventaire d’illustrations</h1><p>${rows.length} paires EN/FR. Les vignettes typographiques signalent les placeholders encore à remplacer.</p></header><main>${cards}</main></body></html>\n`;

const outputs = [[INVENTORY_PATH, inventory], [CONTACT_SHEET_PATH, contact]];
if (check) {
  for (const [file, expected] of outputs) {
    const actual = await exists(file);
    if (actual !== expected) throw new Error(`${file}: generated output is missing or stale`);
  }
  console.log(`Artwork inventory verified (${rows.length} unique canonical pairs; deterministic outputs current).`);
} else {
  for (const [file, content] of outputs) { await mkdir(dirname(file), { recursive:true }); await writeFile(file, content); }
  console.log(`Generated artwork inventory and contact sheets (${rows.length} unique canonical pairs).`);
}
