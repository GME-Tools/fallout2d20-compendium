import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  materializeLocalizedDocument,
  resolveCanonicalReferences
} from "./lib/canonical-pack-sources.mjs";

const catalogPath = path.resolve("catalog/core-rulebook-certification.json");
const defaultOutput = path.resolve("reports/core-rulebook-certification.html");
const languages = ["en", "fr"];

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const outputPath = path.resolve(argValue("--output") ?? defaultOutput);
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

async function walkJsonFiles(directory) {
  const files = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return files;
    throw error;
  }

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walkJsonFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(entryPath);
  }
  return files;
}

async function listPackNames() {
  const entries = await readdir(path.resolve("src/packs/canonical"), { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory() && entry.name.endsWith(".db"))
    .map(entry => entry.name.slice(0, -3))
    .sort();
}

const packNames = await listPackNames();
const canonicalByPack = new Map();
const canonicalIndex = new Map();
const overlaysByLanguage = Object.fromEntries(languages.map(language => [language, new Map()]));

for (const pack of packNames) {
  const documents = new Map();
  const canonicalRoot = path.resolve("src/packs/canonical", `${pack}.db`);

  for (const file of await walkJsonFiles(canonicalRoot)) {
    let document;
    try {
      document = JSON.parse(await readFile(file, "utf8"));
    } catch {
      continue;
    }

    if (!document?._id || !document?._key) continue;
    const repoPath = path.relative(process.cwd(), file).split(path.sep).join("/");
    documents.set(document._id, { document, path: repoPath });

    const key = `${pack}:${document._id}`;
    const existing = canonicalIndex.get(key) ?? [];
    existing.push(repoPath);
    canonicalIndex.set(key, existing);
  }

  canonicalByPack.set(pack, documents);

  for (const language of languages) {
    const localeRoot = path.resolve("src/packs/locales", language, `${pack}.db`);
    const overlays = new Map();

    for (const file of await walkJsonFiles(localeRoot)) {
      let overlay;
      try {
        overlay = JSON.parse(await readFile(file, "utf8"));
      } catch {
        continue;
      }

      if (!overlay?._key) continue;
      overlays.set(overlay._key, {
        overlay,
        path: path.relative(process.cwd(), file).split(path.sep).join("/")
      });
    }

    overlaysByLanguage[language].set(pack, overlays);
  }
}

const localizedDocuments = Object.fromEntries(languages.map(language => [
  language,
  new Map(packNames.map(pack => [pack, new Map()]))
]));

for (const language of languages) {
  for (const pack of packNames) {
    const overlays = overlaysByLanguage[language].get(pack) ?? new Map();
    for (const [documentId, canonicalRecord] of canonicalByPack.get(pack) ?? []) {
      const overlayRecord = overlays.get(canonicalRecord.document._key);
      if (!overlayRecord) continue;
      const materialized = materializeLocalizedDocument(
        canonicalRecord.document,
        overlayRecord.overlay,
        language
      );
      localizedDocuments[language].get(pack).set(documentId, materialized);
    }
  }
}

const pageReviewsBySource = new Map();
const unnumberedReviews = [];

for (const review of catalog.pageReviews) {
  if (review.sourcePage == null) {
    unnumberedReviews.push(review);
    continue;
  }

  const record = pageReviewsBySource.get(review.sourcePage) ?? {};
  record[review.language] = review;
  pageReviewsBySource.set(review.sourcePage, record);
}

const documentViews = {};
const entriesByPage = new Map();

for (const entry of catalog.entries) {
  const list = entriesByPage.get(entry.page) ?? [];
  const documentKey = entry.scope === "in_scope" && entry.pack && entry.documentId
    ? `${entry.pack}:${entry.documentId}`
    : null;
  const paths = documentKey ? canonicalIndex.get(documentKey) ?? [] : [];

  if (documentKey && !documentViews[documentKey]) {
    const canonicalRecord = canonicalByPack.get(entry.pack)?.get(entry.documentId);
    const view = {
      pack: entry.pack,
      documentId: entry.documentId,
      canonical: canonicalRecord
        ? { path: canonicalRecord.path, document: canonicalRecord.document }
        : null,
      en: null,
      fr: null
    };

    if (canonicalRecord) {
      for (const language of languages) {
        const overlayRecord = overlaysByLanguage[language]
          .get(entry.pack)
          ?.get(canonicalRecord.document._key);
        const materialized = localizedDocuments[language]
          .get(entry.pack)
          ?.get(entry.documentId);

        if (!overlayRecord || !materialized) continue;

        let resolved = materialized;
        let resolutionError = null;
        try {
          resolved = resolveCanonicalReferences(
            materialized,
            localizedDocuments[language],
            `${language}/${entry.pack}/${entry.documentId}`
          );
        } catch (error) {
          resolutionError = String(error?.message ?? error);
        }

        view[language] = {
          path: overlayRecord.path,
          overlay: overlayRecord.overlay,
          document: resolved,
          resolutionError
        };
      }
    }

    documentViews[documentKey] = view;
  }

  list.push({
    ...entry,
    documentKey,
    canonicalPaths: paths,
    canonicalFound: entry.scope !== "in_scope" || paths.length > 0
  });
  entriesByPage.set(entry.page, list);
}

const numberedPages = [...new Set([
  ...pageReviewsBySource.keys(),
  ...entriesByPage.keys()
])]
  .sort((a, b) => a - b)
  .map(sourcePage => {
    const reviews = pageReviewsBySource.get(sourcePage) ?? {};
    const entries = entriesByPage.get(sourcePage) ?? [];
    const sortPdf = reviews.en?.pdfPage ?? reviews.fr?.pdfPage ?? sourcePage + 1000;

    return {
      key: `source-${sourcePage}`,
      sourcePage,
      sortPdf,
      sections: {
        en: reviews.en?.section ?? "",
        fr: reviews.fr?.section ?? ""
      },
      reviews,
      entries
    };
  });

const unnumberedPages = unnumberedReviews.map(review => ({
  key: `unnumbered-${review.language}-${review.pdfPage}`,
  sourcePage: null,
  sortPdf: review.pdfPage + (review.language === "fr" ? 0.1 : 0),
  sections: { [review.language]: review.section },
  reviews: { [review.language]: review },
  entries: []
}));

const pages = [...numberedPages, ...unnumberedPages].sort((a, b) => {
  if (a.sortPdf !== b.sortPdf) return a.sortPdf - b.sortPdf;
  return String(a.key).localeCompare(String(b.key));
});

const summary = {
  numberedPages: numberedPages.length,
  pageReviews: catalog.pageReviews.length,
  entries: catalog.entries.length,
  inScope: catalog.entries.filter(entry => entry.scope === "in_scope").length,
  outOfScope: catalog.entries.filter(entry => entry.scope === "out_of_scope").length,
  missingCanonical: pages
    .flatMap(page => page.entries)
    .filter(entry => entry.scope === "in_scope" && !entry.canonicalFound).length,
  documentViews: Object.keys(documentViews).length
};

const payload = JSON.stringify({
  publication: catalog.publication,
  authorities: catalog.authorities,
  method: catalog.method,
  certifiedThrough: catalog.certifiedThrough,
  summary,
  pages,
  documentViews
}).replaceAll("<", "\\u003c");

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Core Rulebook — vue de certification</title>
<style>
:root{color-scheme:light dark;--bg:#f5f5f3;--panel:#fff;--text:#1f2328;--muted:#667085;--line:#d0d5dd;--good:#067647;--warn:#b54708;--bad:#b42318;--accent:#175cd3;--chip:#eef4ff;--overlay:rgba(15,23,42,.45)}
@media(prefers-color-scheme:dark){:root{--bg:#111315;--panel:#191c1f;--text:#f2f4f7;--muted:#98a2b3;--line:#344054;--good:#32d583;--warn:#fdb022;--bad:#f97066;--accent:#84adff;--chip:#1d2939;--overlay:rgba(0,0,0,.65)}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
body.panel-open{overflow:hidden}
header{position:sticky;top:0;z-index:10;background:var(--panel);border-bottom:1px solid var(--line)}
.wrap{max-width:1500px;margin:auto;padding:18px 24px}
.top{display:flex;gap:18px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
h1{font-size:22px;margin:0 0 5px}
.sub{color:var(--muted)}
.stats{display:flex;gap:8px;flex-wrap:wrap}
.stat{border:1px solid var(--line);border-radius:8px;padding:6px 9px;background:var(--panel)}
.controls{display:grid;grid-template-columns:minmax(220px,2fr) repeat(4,minmax(140px,1fr));gap:10px;margin-top:14px}
.controls input,.controls select,.panel-controls input,.panel-controls select{width:100%;padding:9px 10px;border:1px solid var(--line);border-radius:7px;background:var(--panel);color:var(--text)}
main.wrap{padding-top:20px}
.page{background:var(--panel);border:1px solid var(--line);border-radius:10px;margin-bottom:10px;overflow:hidden}
.page>summary{cursor:pointer;list-style:none;padding:13px 15px;display:grid;grid-template-columns:90px minmax(180px,1.8fr) 140px 115px 150px;gap:12px;align-items:center}
.page>summary::-webkit-details-marker{display:none}
.pageno{font-size:16px;font-weight:750}
.section{font-weight:600}
.review{color:var(--muted);font-size:12px}
.badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 8px;font-size:12px;font-weight:650;background:var(--chip);width:max-content}
.badge.good{color:var(--good)}
.badge.muted{color:var(--muted)}
.badge.bad{color:var(--bad)}
.counts{font-variant-numeric:tabular-nums}
.body{border-top:1px solid var(--line);padding:14px 15px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.box{border:1px solid var(--line);border-radius:8px;padding:12px}
.box h3{font-size:13px;text-transform:uppercase;letter-spacing:.04em;margin:0 0 9px;color:var(--muted)}
.entry{padding:10px 0;border-top:1px solid var(--line)}
.entry:first-of-type{border-top:0;padding-top:0}
.name{font-weight:700}
.fr{color:var(--muted);margin-top:2px}
.meta{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:6px;font-size:12px;color:var(--muted)}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.path{margin-top:5px;overflow-wrap:anywhere}
.errata{margin-top:8px;padding:8px 9px;border-left:3px solid var(--warn);background:rgba(181,71,8,.08);font-size:12px}
.why{margin-top:5px;color:var(--muted)}
.empty{color:var(--muted);font-style:italic}
.missing{color:var(--bad);font-weight:700}
.ok{color:var(--good);font-weight:650}
.canonical-button{appearance:none;border:0;padding:0;background:none;color:var(--accent);font:inherit;font-weight:750;cursor:pointer;text-align:left}
.canonical-button:hover{text-decoration:underline}
footer{color:var(--muted);padding:20px 0 40px;font-size:12px}

.panel-backdrop{position:fixed;inset:0;background:var(--overlay);z-index:50;display:none}
.panel-backdrop.open{display:block}
.side-panel{position:fixed;z-index:60;top:0;right:0;height:100vh;width:min(1180px,92vw);background:var(--panel);border-left:1px solid var(--line);box-shadow:-10px 0 30px rgba(0,0,0,.18);transform:translateX(100%);transition:transform .18s ease;display:flex;flex-direction:column}
.side-panel.open{transform:translateX(0)}
.panel-header{padding:16px 18px;border-bottom:1px solid var(--line);display:flex;gap:12px;justify-content:space-between;align-items:flex-start}
.panel-title{font-size:19px;font-weight:800}
.panel-subtitle{color:var(--muted);font-size:12px;margin-top:3px}
.panel-close{appearance:none;border:1px solid var(--line);border-radius:7px;background:var(--panel);color:var(--text);font-size:20px;line-height:1;padding:7px 10px;cursor:pointer}
.panel-tabs{display:flex;gap:6px;padding:10px 18px 0;border-bottom:1px solid var(--line)}
.panel-tab{appearance:none;border:1px solid var(--line);border-bottom:0;border-radius:7px 7px 0 0;background:var(--bg);color:var(--muted);padding:8px 12px;cursor:pointer;font-weight:700}
.panel-tab.active{background:var(--panel);color:var(--text)}
.panel-controls{padding:12px 18px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:180px 1fr 160px;gap:10px}
.panel-content{padding:14px 18px 28px;overflow:auto;flex:1}
.human-card{display:grid;gap:14px}
.summary-card,.text-card,.table-card{border:1px solid var(--line);border-radius:9px;padding:12px}
.summary-card h3,.text-card h3,.table-card h3{margin:0 0 10px;font-size:14px}
.kv-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 14px}
.kv{display:grid;grid-template-columns:minmax(120px,.8fr) 1.2fr;gap:8px;border-bottom:1px solid var(--line);padding:5px 0}
.kv .k{color:var(--muted);font-weight:650}
.richtext{line-height:1.55}
.richtext p:first-child{margin-top:0}
.richtext p:last-child{margin-bottom:0}
.richtext table{width:100%;border-collapse:collapse}
.richtext td,.richtext th{border:1px solid var(--line);padding:5px 7px}
.compare-table{width:100%;border-collapse:collapse;font-size:12px}
.compare-table th,.compare-table td{border:1px solid var(--line);padding:6px 8px;vertical-align:top;text-align:left;overflow-wrap:anywhere}
.compare-table th{background:var(--bg);position:sticky;top:0;z-index:1}
.compare-diff{background:rgba(181,71,8,.08)}
.compare-missing{color:var(--bad);font-style:italic}
.mini-table{width:100%;border-collapse:collapse}
.mini-table th,.mini-table td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
.mini-table th{background:var(--bg)}
.panel-note{color:var(--muted);font-size:12px;margin-bottom:10px}
.doc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.doc-grid.single{grid-template-columns:1fr}
.doc-pane{border:1px solid var(--line);border-radius:9px;min-width:0;overflow:hidden}
.doc-pane h3{position:sticky;top:0;margin:0;padding:10px 12px;background:var(--panel);border-bottom:1px solid var(--line);z-index:2}
.doc-source{padding:8px 12px;color:var(--muted);font-size:11px;border-bottom:1px solid var(--line);overflow-wrap:anywhere}
.field-table{width:100%;border-collapse:collapse;font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace}
.field-table th,.field-table td{padding:6px 8px;vertical-align:top;border-bottom:1px solid var(--line);text-align:left;overflow-wrap:anywhere}
.field-table th{width:45%;color:var(--muted);font-weight:600}
.raw-json{margin:0;padding:12px;white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}
.panel-error{padding:10px 12px;color:var(--bad);border-bottom:1px solid var(--line)}
@media(max-width:1050px){.doc-grid{grid-template-columns:1fr}.controls{grid-template-columns:1fr 1fr 1fr}.panel-controls{grid-template-columns:1fr 1fr}.kv-grid{grid-template-columns:1fr}}
@media(max-width:900px){.page>summary{grid-template-columns:70px 1fr 100px}.page>summary>:nth-child(4),.page>summary>:nth-child(5){display:none}.grid{grid-template-columns:1fr}}
@media(max-width:620px){.wrap{padding-left:12px;padding-right:12px}.controls,.panel-controls{grid-template-columns:1fr}.page>summary{grid-template-columns:65px 1fr}.page>summary>:nth-child(3){display:none}.side-panel{width:100vw}}
</style>
</head>
<body>
<header><div class="wrap">
<div class="top">
  <div>
    <h1>Core Rulebook — vue de certification</h1>
    <div class="sub">Vue dérivée du catalogue et des sources canonical/EN/FR. Aucun état éditorial n'est stocké ici.</div>
  </div>
  <div class="stats" id="stats"></div>
</div>
<div class="controls">
  <input id="search" type="search" placeholder="Rechercher page, nom, ID, pack…">
  <select id="language">
    <option value="both">EN + FR</option>
    <option value="en">EN seulement</option>
    <option value="fr">FR seulement</option>
  </select>
  <select id="content">
    <option value="all">Toutes les pages</option>
    <option value="in">Avec canonical</option>
    <option value="none">Sans canonical</option>
    <option value="excluded">Avec exclusions</option>
  </select>
  <select id="status">
    <option value="all">Tous les statuts</option>
    <option value="verified">Pages vérifiées</option>
    <option value="missing">Canonical manquant</option>
  </select>
  <select id="section"><option value="all">Toutes les sections</option></select>
</div>
</div></header>

<main class="wrap" id="pages"></main>
<div class="wrap"><footer id="footer"></footer></div>

<div class="panel-backdrop" id="panelBackdrop"></div>
<aside class="side-panel" id="sidePanel" aria-hidden="true">
  <div class="panel-header">
    <div>
      <div class="panel-title" id="panelTitle">Canonical</div>
      <div class="panel-subtitle" id="panelSubtitle"></div>
    </div>
    <button class="panel-close" id="panelClose" type="button" aria-label="Fermer">×</button>
  </div>
  <div class="panel-tabs" role="tablist">
    <button type="button" class="panel-tab active" data-panel-tab="card">Fiche</button>
    <button type="button" class="panel-tab" data-panel-tab="compare">Comparaison</button>
    <button type="button" class="panel-tab" data-panel-tab="technical">Technique</button>
  </div>
  <div class="panel-controls">
    <select id="panelView">
      <option value="all">Canonical + EN + FR</option>
      <option value="canonical">Canonical</option>
      <option value="en">EN</option>
      <option value="fr">FR</option>
    </select>
    <input id="panelSearch" type="search" placeholder="Filtrer les champs, chemins ou valeurs…">
    <select id="panelMode">
      <option value="fields">Vue champs</option>
      <option value="raw">JSON brut</option>
    </select>
  </div>
  <div class="panel-content" id="panelContent"></div>
</aside>

<script>
const DATA = ${payload};
let activeDocumentKey = null;
let activePanelTab = "card";

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (ch) {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    if (ch === String.fromCharCode(34)) return "&quot;";
    return "&#39;";
  });
}

function flatten(value, prefix, rows) {
  rows = rows ?? [];
  prefix = prefix ?? "";

  if (Array.isArray(value)) {
    if (value.length === 0) rows.push([prefix || "/", "[]"]);
    value.forEach(function (child, index) {
      flatten(child, prefix + "/" + index, rows);
    });
    return rows;
  }

  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) rows.push([prefix || "/", "{}"]);
    keys.forEach(function (key) {
      flatten(value[key], prefix + "/" + key, rows);
    });
    return rows;
  }

  rows.push([prefix || "/", value]);
  return rows;
}

function fieldTable(document, query) {
  const q = query.trim().toLowerCase();
  const rows = flatten(document).filter(function (row) {
    if (!q) return true;
    return (String(row[0]) + " " + String(row[1])).toLowerCase().includes(q);
  });

  if (!rows.length) return '<div class="empty" style="padding:12px">Aucun champ correspondant.</div>';

  return '<table class="field-table"><tbody>'
    + rows.map(function (row) {
      const display = typeof row[1] === "string" ? row[1] : JSON.stringify(row[1]);
      return '<tr><th>' + esc(row[0]) + '</th><td>' + esc(display) + '</td></tr>';
    }).join("")
    + '</tbody></table>';
}

function pageSection(page, language) {
  if (language === "en") return page.sections.en || page.sections.fr || "";
  if (language === "fr") return page.sections.fr || page.sections.en || "";
  if (page.sections.en && page.sections.fr && page.sections.en !== page.sections.fr) {
    return page.sections.en + " / " + page.sections.fr;
  }
  return page.sections.en || page.sections.fr || "";
}

const pagesEl = document.querySelector("#pages");
const statsEl = document.querySelector("#stats");
const sections = [...new Set(DATA.pages.flatMap(function (page) {
  return [page.sections.en, page.sections.fr];
}).filter(Boolean))].sort();

document.querySelector("#section").insertAdjacentHTML(
  "beforeend",
  sections.map(function (section) {
    return '<option value="' + esc(section) + '">' + esc(section) + '</option>';
  }).join("")
);

statsEl.innerHTML = [
  [DATA.summary.numberedPages, "pages source"],
  [DATA.summary.inScope, "canonical retenus"],
  [DATA.summary.outOfScope, "exclusions"],
  [DATA.summary.missingCanonical, "références canonical manquantes"]
].map(function (item) {
  return '<span class="stat"><strong>' + item[0] + '</strong> ' + item[1] + '</span>';
}).join("");

function reviewHtml(review, label) {
  if (!review) return '<div class="review">' + label + ': —</div>';
  return '<div class="review">' + label + ': PDF p.' + review.pdfPage + ' · <strong>' + esc(review.status) + '</strong></div>';
}

function reviewBlock(page, language) {
  if (language === "en") return reviewHtml(page.reviews.en, "EN");
  if (language === "fr") return reviewHtml(page.reviews.fr, "FR");
  return reviewHtml(page.reviews.en, "EN") + reviewHtml(page.reviews.fr, "FR");
}

function errataHtml(entry) {
  if (!entry.errata?.length) return "";
  return entry.errata.map(function (item) {
    return '<div class="errata"><strong>Errata ' + esc(item.id ?? "") + '</strong><br>' + esc(item.note ?? "") + '</div>';
  }).join("");
}

function localizedNameHtml(entry, language) {
  if (language === "en") return "";
  if (!entry.localizedNames?.fr) return "";
  return '<div class="fr">FR : ' + esc(entry.localizedNames.fr) + '</div>';
}

function canonicalEntry(entry, language) {
  const paths = entry.canonicalPaths ?? [];
  const pathHtml = paths.length
    ? paths.map(function (canonicalPath) {
        return '<div class="path"><span class="ok">✓ canonical</span> <code>' + esc(canonicalPath) + '</code></div>';
      }).join("")
    : '<div class="path missing">✗ canonical introuvable pour <code>' + esc(entry.pack) + ' / ' + esc(entry.documentId) + '</code></div>';

  const name = entry.documentKey
    ? '<button type="button" class="canonical-button" data-document-key="' + esc(entry.documentKey) + '" data-source-name="' + esc(entry.sourceName) + '">' + esc(entry.sourceName) + '</button>'
    : '<span class="name">' + esc(entry.sourceName) + '</span>';

  return '<div class="entry">'
    + '<div class="name">' + name + '</div>'
    + localizedNameHtml(entry, language)
    + '<div class="meta"><span>' + esc(entry.type) + '</span><span>pack: <code>' + esc(entry.pack) + '</code></span><span>id: <code>' + esc(entry.documentId) + '</code></span><span>status: ' + esc(entry.status) + '</span></div>'
    + pathHtml
    + errataHtml(entry)
    + '</div>';
}

function excludedEntry(entry, language) {
  return '<div class="entry">'
    + '<div class="name">' + esc(entry.sourceName) + '</div>'
    + localizedNameHtml(entry, language)
    + '<div class="meta"><span>' + esc(entry.type) + '</span><span>status: ' + esc(entry.status) + '</span></div>'
    + (entry.justification ? '<div class="why">' + esc(entry.justification) + '</div>' : "")
    + errataHtml(entry)
    + '</div>';
}

function render() {
  const q = document.querySelector("#search").value.trim().toLowerCase();
  const language = document.querySelector("#language").value;
  const content = document.querySelector("#content").value;
  const status = document.querySelector("#status").value;
  const section = document.querySelector("#section").value;
  let visible = 0;

  pagesEl.innerHTML = DATA.pages.map(function (page) {
    if (language !== "both" && !page.reviews[language]) return "";

    const inside = page.entries.filter(function (entry) { return entry.scope === "in_scope"; });
    const excluded = page.entries.filter(function (entry) { return entry.scope === "out_of_scope"; });
    const missing = inside.some(function (entry) { return !entry.canonicalFound; });
    const relevantReviews = language === "both"
      ? Object.values(page.reviews)
      : [page.reviews[language]].filter(Boolean);
    const verified = relevantReviews.some(function (review) { return review?.status === "verified"; });
    const haystack = JSON.stringify(page).toLowerCase();

    const matchesQ = !q || haystack.includes(q);
    const matchesContent = content === "all"
      || (content === "in" && inside.length > 0)
      || (content === "none" && inside.length === 0)
      || (content === "excluded" && excluded.length > 0);
    const matchesStatus = status === "all"
      || (status === "verified" && verified)
      || (status === "missing" && missing);
    const selectedSection = pageSection(page, language);
    const matchesSection = section === "all"
      || page.sections.en === section
      || page.sections.fr === section;

    if (!(matchesQ && matchesContent && matchesStatus && matchesSection)) return "";
    visible += 1;

    const selectedReview = language === "fr"
      ? page.reviews.fr
      : page.reviews.en ?? page.reviews.fr;
    const selectedLanguage = language === "fr" ? "FR" : "EN";
    const label = page.sourcePage == null
      ? selectedLanguage + " PDF " + selectedReview?.pdfPage
      : "p." + page.sourcePage;
    const disposition = inside.length ? inside.length + " canonical" : "aucun canonical";

    return '<details class="page"' + (missing ? " open" : "") + '>'
      + '<summary>'
      + '<div class="pageno">' + esc(label) + '</div>'
      + '<div><div class="section">' + esc(selectedSection) + '</div>' + reviewBlock(page, language) + '</div>'
      + '<div><span class="badge ' + (inside.length ? "good" : "muted") + '">' + disposition + '</span></div>'
      + '<div class="counts">' + excluded.length + ' exclusion' + (excluded.length > 1 ? "s" : "") + '</div>'
      + '<div>' + (missing ? '<span class="badge bad">canonical manquant</span>' : "") + '</div>'
      + '</summary>'
      + '<div class="body"><div class="grid">'
      + '<section class="box"><h3>Canonical retenu (' + inside.length + ')</h3>'
      + (inside.length ? inside.map(function (entry) { return canonicalEntry(entry, language); }).join("") : '<div class="empty">Aucun contenu canonical retenu pour cette page.</div>')
      + '</section>'
      + '<section class="box"><h3>Éléments explicitement exclus (' + excluded.length + ')</h3>'
      + (excluded.length ? excluded.map(function (entry) { return excludedEntry(entry, language); }).join("") : '<div class="empty">Aucune exclusion cataloguée pour cette page.</div>')
      + '</section>'
      + '</div></div>'
      + '</details>';
  }).join("");

  document.querySelector("#footer").textContent = visible + " page(s) affichée(s) · méthode: " + DATA.method;
}


function getValue(document, path) {
  if (!document) return undefined;
  return path.split(".").reduce(function (current, key) {
    return current == null ? undefined : current[key];
  }, document);
}

function firstDefined(document, paths) {
  for (const path of paths) {
    const value = getValue(document, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function pretty(value) {
  if (value === undefined) return "—";
  if (value === null) return "null";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return String(value);
}

function sanitizeHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html ?? "");
  template.content.querySelectorAll("script,style,iframe,object,embed,link,meta").forEach(function (node) { node.remove(); });
  template.content.querySelectorAll("*").forEach(function (node) {
    [...node.attributes].forEach(function (attribute) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on")) node.removeAttribute(attribute.name);
      if ((name === "href" || name === "src") && value.startsWith("javascript:")) node.removeAttribute(attribute.name);
    });
  });
  return template.innerHTML;
}

function humanSummary(document) {
  if (!document) return "";
  const fields = [
    ["Nom", document.name],
    ["Type", document.type],
    ["Formule", document.formula],
    ["Poids", firstDefined(document, ["system.weight", "system.weight.value", "weight"])],
    ["Coût", firstDefined(document, ["system.cost", "system.cost.value", "system.value", "cost"])],
    ["Rareté", firstDefined(document, ["system.rarity", "system.rarity.value", "rarity"])],
    ["Portée", firstDefined(document, ["system.range", "system.range.value", "range"])],
    ["Cadence", firstDefined(document, ["system.fireRate", "system.fire_rate", "system.fireRate.value"])],
    ["Dégâts", firstDefined(document, ["system.damage", "system.damage.rating", "system.damage.value"])],
    ["Type de dégâts", firstDefined(document, ["system.damageType", "system.damage.type", "system.damage_type"])],
    ["Rangs", firstDefined(document, ["system.ranks", "system.rank", "system.maxRank"])],
    ["Attribut", firstDefined(document, ["system.defaultAttribute", "system.attribute", "system.attribute.value"])]
  ].filter(function (entry) { return entry[1] !== undefined && entry[1] !== null && entry[1] !== ""; });

  if (!fields.length) return "";
  return '<section class="summary-card"><h3>Résumé</h3><div class="kv-grid">'
    + fields.map(function (entry) {
      return '<div class="kv"><div class="k">' + esc(entry[0]) + '</div><div>' + esc(pretty(entry[1])) + '</div></div>';
    }).join("")
    + '</div></section>';
}

function rollTableView(document) {
  if (!document?.results || !Array.isArray(document.results)) return "";
  const rows = document.results.map(function (result) {
    const range = Array.isArray(result.range) ? result.range.join("–") : pretty(result.range);
    return '<tr><td>' + esc(range) + '</td><td>' + esc(result.name ?? "") + '</td><td>' + esc(result.description ?? "") + '</td></tr>';
  }).join("");
  return '<section class="table-card"><h3>Résultats</h3><table class="mini-table"><thead><tr><th>Jet</th><th>Nom</th><th>Description</th></tr></thead><tbody>' + rows + '</tbody></table></section>';
}

function actorView(document) {
  if (!document || document.type === undefined) return "";
  const special = firstDefined(document, ["system.special", "system.attributes"]);
  if (!special || typeof special !== "object" || Array.isArray(special)) return "";
  const rows = Object.entries(special).map(function (entry) {
    return '<tr><th>' + esc(entry[0]) + '</th><td>' + esc(pretty(entry[1])) + '</td></tr>';
  }).join("");
  return '<section class="table-card"><h3>Caractéristiques</h3><table class="mini-table"><tbody>' + rows + '</tbody></table></section>';
}

function descriptionView(document, label) {
  const description = firstDefined(document, ["description", "system.description", "system.description.value"]);
  if (!description || typeof description !== "string") return "";
  const looksHtml = description.includes("<") && description.includes(">");
  return '<section class="text-card"><h3>' + esc(label) + '</h3><div class="richtext">'
    + (looksHtml ? sanitizeHtml(description) : '<p>' + esc(description) + '</p>')
    + '</div></section>';
}

function humanDocument(label, record) {
  if (!record) {
    return '<section class="doc-pane"><h3>' + esc(label) + '</h3><div class="empty" style="padding:12px">Vue indisponible.</div></section>';
  }
  const document = record.document ?? record;
  const pathHtml = record.path ? '<div class="doc-source"><code>' + esc(record.path) + '</code></div>' : "";
  const errorHtml = record.resolutionError ? '<div class="panel-error">Résolution partielle : ' + esc(record.resolutionError) + '</div>' : "";
  const isRollTable = Array.isArray(document.results);
  return '<section class="doc-pane"><h3>' + esc(label) + '</h3>' + pathHtml + errorHtml
    + '<div style="padding:12px" class="human-card">'
    + humanSummary(document)
    + (isRollTable ? rollTableView(document) : "")
    + actorView(document)
    + descriptionView(document, "Description")
    + '</div></section>';
}

function flattenedMap(record) {
  if (!record) return new Map();
  const document = record.document ?? record;
  return new Map(flatten(document).map(function (row) { return [row[0], row[1]]; }));
}

function compareView(view, query) {
  const selected = document.querySelector("#panelView").value;
  const labels = [];
  if (selected === "all" || selected === "canonical") labels.push(["canonical","Canonical"]);
  if (selected === "all" || selected === "en") labels.push(["en","EN"]);
  if (selected === "all" || selected === "fr") labels.push(["fr","FR"]);

  const maps = Object.fromEntries(labels.map(function (entry) { return [entry[0], flattenedMap(view[entry[0]])]; }));
  const paths = [...new Set(labels.flatMap(function (entry) { return [...maps[entry[0]].keys()]; }))].sort();
  const q = query.trim().toLowerCase();
  const filtered = paths.filter(function (path) {
    if (!q) return true;
    const values = labels.map(function (entry) { return maps[entry[0]].get(path); });
    return (path + " " + values.map(pretty).join(" ")).toLowerCase().includes(q);
  });

  const header = '<tr><th>Champ</th>' + labels.map(function (entry) { return '<th>' + esc(entry[1]) + '</th>'; }).join("") + '</tr>';
  const body = filtered.map(function (path) {
    const values = labels.map(function (entry) { return maps[entry[0]].has(path) ? maps[entry[0]].get(path) : undefined; });
    const normalized = values.map(function (value) { return JSON.stringify(value); });
    const differs = new Set(normalized).size > 1;
    return '<tr' + (differs ? ' class="compare-diff"' : '') + '><th>' + esc(path) + '</th>'
      + values.map(function (value) {
          return '<td>' + (value === undefined ? '<span class="compare-missing">—</span>' : esc(pretty(value))) + '</td>';
        }).join("")
      + '</tr>';
  }).join("");

  return '<div class="panel-note">Les lignes surlignées diffèrent entre les vues sélectionnées.</div><table class="compare-table"><thead>' + header + '</thead><tbody>' + body + '</tbody></table>';
}

function documentPane(label, record, query, mode) {
  if (!record) {
    return '<section class="doc-pane"><h3>' + esc(label) + '</h3><div class="empty" style="padding:12px">Vue indisponible.</div></section>';
  }

  const pathHtml = record.path
    ? '<div class="doc-source"><code>' + esc(record.path) + '</code></div>'
    : "";
  const errorHtml = record.resolutionError
    ? '<div class="panel-error">Résolution partielle : ' + esc(record.resolutionError) + '</div>'
    : "";
  const document = record.document ?? record;
  const body = mode === "raw"
    ? '<pre class="raw-json">' + esc(JSON.stringify(document, null, 2)) + '</pre>'
    : fieldTable(document, query);

  return '<section class="doc-pane"><h3>' + esc(label) + '</h3>' + pathHtml + errorHtml + body + '</section>';
}

function renderPanel() {
  if (!activeDocumentKey) return;
  const view = DATA.documentViews[activeDocumentKey];
  if (!view) return;

  const selected = document.querySelector("#panelView").value;
  const query = document.querySelector("#panelSearch").value;
  const mode = document.querySelector("#panelMode").value;
  const content = document.querySelector("#panelContent");

  document.querySelector("#panelMode").style.display = activePanelTab === "technical" ? "" : "none";
  document.querySelector("#panelSearch").placeholder = activePanelTab === "card"
    ? "Filtrer les vues techniques si besoin…"
    : "Filtrer les champs, chemins ou valeurs…";

  if (activePanelTab === "compare") {
    content.innerHTML = compareView(view, query);
    return;
  }

  const panes = [];
  if (activePanelTab === "card") {
    if (selected === "all" || selected === "canonical") panes.push(humanDocument("Canonical", view.canonical));
    if (selected === "all" || selected === "en") panes.push(humanDocument("EN", view.en));
    if (selected === "all" || selected === "fr") panes.push(humanDocument("FR", view.fr));
  } else {
    if (selected === "all" || selected === "canonical") panes.push(documentPane("Canonical brut", view.canonical, query, mode));
    if (selected === "all" || selected === "en") panes.push(documentPane("EN reconstruit", view.en, query, mode));
    if (selected === "all" || selected === "fr") panes.push(documentPane("FR reconstruit", view.fr, query, mode));
  }

  content.innerHTML = '<div class="doc-grid' + (panes.length === 1 ? " single" : "") + '">' + panes.join("") + '</div>';
}

function openPanel(documentKey, sourceName) {
  const view = DATA.documentViews[documentKey];
  if (!view) return;
  activeDocumentKey = documentKey;
  activePanelTab = "card";
  document.querySelectorAll("[data-panel-tab]").forEach(function (tab) {
    tab.classList.toggle("active", tab.dataset.panelTab === "card");
  });
  document.querySelector("#panelTitle").textContent = sourceName || documentKey;
  document.querySelector("#panelSubtitle").textContent = view.pack + " / " + view.documentId;
  const globalLanguage = document.querySelector("#language").value;
  document.querySelector("#panelView").value = globalLanguage === "both" ? "all" : globalLanguage;
  document.querySelector("#panelSearch").value = "";
  document.querySelector("#sidePanel").classList.add("open");
  document.querySelector("#panelBackdrop").classList.add("open");
  document.querySelector("#sidePanel").setAttribute("aria-hidden", "false");
  document.body.classList.add("panel-open");
  renderPanel();
}

function closePanel() {
  document.querySelector("#sidePanel").classList.remove("open");
  document.querySelector("#panelBackdrop").classList.remove("open");
  document.querySelector("#sidePanel").setAttribute("aria-hidden", "true");
  document.body.classList.remove("panel-open");
  activeDocumentKey = null;
}

["search", "language", "content", "status", "section"].forEach(function (id) {
  document.querySelector("#" + id).addEventListener("input", render);
});

["panelView", "panelSearch", "panelMode"].forEach(function (id) {
  document.querySelector("#" + id).addEventListener("input", renderPanel);
});

document.querySelectorAll("[data-panel-tab]").forEach(function (button) {
  button.addEventListener("click", function () {
    activePanelTab = button.dataset.panelTab;
    document.querySelectorAll("[data-panel-tab]").forEach(function (tab) {
      tab.classList.toggle("active", tab === button);
    });
    renderPanel();
  });
});

pagesEl.addEventListener("click", function (event) {
  const button = event.target.closest("[data-document-key]");
  if (!button) return;
  event.preventDefault();
  openPanel(button.dataset.documentKey, button.dataset.sourceName);
});

document.querySelector("#panelClose").addEventListener("click", closePanel);
document.querySelector("#panelBackdrop").addEventListener("click", closePanel);
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && activeDocumentKey) closePanel();
});

render();
</script>
</body>
</html>`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, html, "utf8");

console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
console.log(`${summary.numberedPages} numbered source pages, ${summary.inScope} in-scope entries, ${summary.outOfScope} exclusions, ${summary.missingCanonical} missing canonical references, ${summary.documentViews} inspectable canonical documents.`);
