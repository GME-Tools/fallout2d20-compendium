import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { CONTACT_SHEET_PATH, INVENTORY_PATH, SUMMARY_PATH, US_202_CONTACT_SHEET_PATH, US_203_CONTACT_SHEET_PATH, WANTED_LIST_PATH, counts, deriveInventory, mergeEditorial, parseInventory, serializeInventory, validateInventory } from "./lib/artwork-inventory.mjs";
import { US_202_ARTWORK_DECISIONS } from "./data/us-202-artwork-decisions.mjs";
import { US_201_SECTION_ANNOTATIONS } from "./data/us-201-owner-annotations.mjs";

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
  const decision = US_202_ARTWORK_DECISIONS[row.identity];
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
    owner_decision_required: "None; exact mechanical equipment reuse applied in US-202."
  });
}
const errors = validateInventory(rows, derived);
if (errors.length) throw new Error(errors.join("\n"));

const inventory = serializeInventory(rows);
const cards = rows.map(row => `<article data-priority="${row.priority}" data-pack="${escape(row.pack)}">${row.current_status === "placeholder" ? `<div class="placeholder">${escape(row.name_en.slice(0, 2).toUpperCase())}</div>` : `<img src="../../${escape(row.current_image.replace(/^modules\/fallout2d20-compendium\//, ""))}" alt="">`}<div><h2>${escape(row.name_en)}</h2><p lang="fr">${escape(row.name_fr)}</p><dl><dt>Identity</dt><dd>${escape(row.identity)}</dd><dt>Pack / type</dt><dd>${escape(row.pack)} / ${escape(row.system_type || row.document_type)}</dd><dt>Priority</dt><dd>${row.priority}</dd><dt>Provenance</dt><dd>${escape(row.candidate_locator || row.blocker)}</dd><dt>Status</dt><dd>${escape(row.current_status)}</dd><dt>Sharing</dt><dd>${escape(row.sharing_group || "none")}</dd><dt>Review</dt><dd>${escape(row.review_state)}</dd></dl></div></article>`).join("\n");
const contact = `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Inventaire d’illustrations US-201/US-202</title><style>body{font:14px system-ui;margin:24px;background:#171b18;color:#eef4eb}header{max-width:900px;margin:auto auto 24px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:12px}article{display:grid;grid-template-columns:96px 1fr;gap:12px;padding:12px;background:#242b26;border:1px solid #59665c;border-radius:8px}.placeholder,img{width:96px;height:96px;object-fit:cover}.placeholder{display:grid;place-items:center;background:#39443c;color:#b9c7bc;font-size:28px;font-weight:700}h2{font-size:16px;margin:0}p{margin:3px 0 8px;color:#bec9c0}dl{display:grid;grid-template-columns:80px 1fr;margin:0;font-size:12px}dt{color:#91a296}dd{margin:0;overflow-wrap:anywhere}article[data-priority=P1]{border-color:#e35d4f}article[data-priority=P2]{border-color:#e7a93d}article[data-priority=P3]{border-color:#78a9d1}</style></head><body><header><h1>Inventaire d’illustrations US-201/US-202</h1><p>${rows.length} paires EN/FR, triées par priorité, pack et nom. Les assets intégrés sont affichés; les vignettes typographiques signalent les placeholders. Rouge=P1, orange=P2, bleu=P3, gris=P4.</p></header><main>${cards}</main></body></html>\n`;
const p1Rows = rows.filter(row => row.priority === "P1");
const integratedP1 = p1Rows.filter(row => row.current_status !== "placeholder");
const p1Cards = integratedP1.map(row => `<article><img src="../../${escape(row.current_image.replace(/^modules\/fallout2d20-compendium\//, ""))}" alt=""><h2>${escape(row.name_en)} / <span lang="fr">${escape(row.name_fr)}</span></h2><dl><dt>Identity</dt><dd>${escape(row.identity)}</dd><dt>Provenance</dt><dd>${escape(row.candidate_source)} (${escape(row.candidate_locator)})</dd><dt>Status</dt><dd>${escape(row.current_status)}</dd><dt>Groupe</dt><dd>${escape(row.sharing_group)}</dd></dl></article>`).join("\n");
const p1Contact = `<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>US-202 — Illustrations P1 intégrées</title><style>body{font:14px system-ui;margin:24px;background:#171b18;color:#eef4eb}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}article{padding:16px;background:#242b26;border:1px solid #e35d4f;border-radius:8px}img{width:192px;height:192px;object-fit:cover}h2{font-size:17px}dl{display:grid;grid-template-columns:85px 1fr}dd{margin:0;overflow-wrap:anywhere}</style></head><body><h1>US-202 — Illustrations P1 intégrées</h1><p>${integratedP1.length} image intégrée sur ${p1Rows.length} identités examinées; ${p1Rows.length - integratedP1.length} placeholders restent à fournir.</p><main>${p1Cards}</main></body></html>\n`;
const us203Packs=new Set(["ammunition","consumables","addictions","books-and-magazines","perks"]);
const us203Rows=rows.filter(row=>us203Packs.has(row.pack)&&row.current_status!=="placeholder"&&(row.current_artwork_source?.includes("US-203")||row.current_artwork_source?.includes("Owner-approved URL")));
const us203Cards=us203Rows.map(row=>`<article><img src="../../${escape(row.current_image.replace(/^modules\/fallout2d20-compendium\//,""))}" alt=""><h2>${escape(row.name_en)} / <span lang="fr">${escape(row.name_fr)}</span></h2><p>${escape(row.identity)} · ${escape(row.current_status)}</p><p>${escape(row.current_artwork_source)}</p></article>`).join("\n");
const us203Contact=`<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><title>US-203 — Équipement prioritaire</title><style>body{font:14px system-ui;margin:24px;background:#171b18;color:#eef4eb}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}article{padding:12px;background:#242b26}img{width:160px;height:160px;object-fit:contain}p{overflow-wrap:anywhere}</style></head><body><h1>US-203 — Équipement prioritaire</h1><p>${us203Rows.length} identités intégrées.</p><main>${us203Cards}</main></body></html>\n`;
const table = object => Object.entries(object).map(([key, value]) => `| ${key} | ${value} |`).join("\n");
const summary = `# US-201 — Synthèse de l’inventaire d’illustrations\n\n> Généré par \`npm run artwork:inventory\`. Ne pas éditer ce rapport; éditer uniquement les champs éditoriaux de \`${INVENTORY_PATH}\`.\n\nTotal : ${rows.length} identités canoniques uniques, chacune représentant une paire EN/FR.\n\n## Par pack\n\n| Pack | Total |\n| --- | ---: |\n${table(counts(rows,"pack"))}\n\n## Par type système\n\n| Type | Total |\n| --- | ---: |\n${table(counts(rows,"system_type"))}\n\n## Par priorité\n\n| Priorité | Total |\n| --- | ---: |\n${table(counts(rows,"priority"))}\n\n## Par source candidate\n\n| Source | Total |\n| --- | ---: |\n${table(counts(rows,"candidate_source_kind"))}\n\n## Par blocage\n\n| Blocage | Total |\n| --- | ---: |\n${table(counts(rows,"blocker"))}\n\n## Groupes de partage proposés\n\n${[...new Set(rows.map(row=>row.sharing_group).filter(Boolean))].sort().map(group=>`- \`${group}\``).join("\n") || "Aucun."}\n`;
const previousWanted = await exists(WANTED_LIST_PATH);
const manualAnnotations = new Map();
for (const line of (previousWanted ?? "").split("\n")) {
  const match = line.match(/^- \[[ xX]\] `([^`]+)`(.*)$/);
  if (match) manualAnnotations.set(match[1], match[2]);
}
const wantedRows = [], grouped = new Map();
for (const row of rows) {
  if (row.current_status !== "placeholder") continue;
  if (row.sharing_status !== "approved" || !row.sharing_group) wantedRows.push({ priority:row.priority, pack:row.pack, rows:[row] });
  else {
    const group = grouped.get(row.sharing_group) ?? { priority:row.priority, pack:"images partagées approuvées", rows:[] };
    group.rows.push(row);
    if (row.priority.localeCompare(group.priority) < 0) group.priority = row.priority;
    grouped.set(row.sharing_group, group);
  }
}
wantedRows.push(...grouped.values());
wantedRows.sort((a,b)=>a.priority.localeCompare(b.priority)||a.pack.localeCompare(b.pack)||a.rows[0].name_en.localeCompare(b.rows[0].name_en,"en"));
const placeholderCount = rows.filter(row => row.current_status === "placeholder").length;
let wanted = `# Images à trouver\n\nCette checklist contient ${wantedRows.length} images à trouver pour couvrir les ${placeholderCount} fiches encore munies d'un placeholder. Une ligne groupée couvre plusieurs fiches avec la même image approuvée. Pour proposer une image, ajouter après la ligne concernée un lien officiel autorisé ou un chemin local; le générateur conserve ces annotations manuelles mot pour mot.\n`;
for (const priority of ["P1", "P2", "P3", "P4"]) {
  wanted += `\n## ${priority}\n`;
  for (const pack of [...new Set(wantedRows.filter(entry => entry.priority === priority).map(entry => entry.pack))]) {
    const selected = wantedRows.filter(entry => entry.priority === priority && entry.pack === pack);
    wanted += `\n### ${pack} (${selected.length})\n\n`;
    const sectionAnnotation = US_201_SECTION_ANNOTATIONS[`${priority}/${pack}`];
    if (sectionAnnotation) wanted += `${sectionAnnotation}\n\n`;
    wanted += selected.map(entry => {
      const row = entry.rows[0], reference = entry.rows.length > 1 ? row.sharing_group : row.identity;
      const coverage = entry.rows.length > 1 ? ` — couvre : ${entry.rows.map(item=>`\`${item.identity}\``).join(", ")}` : "";
      const base = ` — **${row.name_en}** / ${row.name_fr}${coverage}${row.candidate_locator ? ` — piste PDF : \`${row.candidate_locator}\`` : ""}`;
      const prior = manualAnnotations.get(reference);
      const prefix = ` — **${row.name_en}** / ${row.name_fr}`;
      return `- [ ] \`${reference}\`${prior?.startsWith(prefix) ? prior : base}`;
    }).join("\n") + "\n";
  }
}

const outputs = [[INVENTORY_PATH, inventory], [CONTACT_SHEET_PATH, contact], [US_202_CONTACT_SHEET_PATH, p1Contact], [US_203_CONTACT_SHEET_PATH, us203Contact], [SUMMARY_PATH, summary], [WANTED_LIST_PATH, wanted]];
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
