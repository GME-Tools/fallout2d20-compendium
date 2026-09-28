import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const catalogPath = path.resolve("catalog/core-rulebook-certification.json");
const defaultOutput = path.resolve("reports/core-rulebook-certification.html");

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

const canonicalIndex = new Map();
const referencedPacks = [...new Set(
  catalog.entries
    .filter(entry => entry.scope === "in_scope" && entry.pack)
    .map(entry => entry.pack)
)];

for (const pack of referencedPacks) {
  const directory = path.resolve("src/packs/canonical", `${pack}.db`);
  for (const file of await walkJsonFiles(directory)) {
    let document;
    try {
      document = JSON.parse(await readFile(file, "utf8"));
    } catch {
      continue;
    }
    if (!document?._id) continue;
    const key = `${pack}:${document._id}`;
    const repoPath = path.relative(process.cwd(), file).split(path.sep).join("/");
    const existing = canonicalIndex.get(key) ?? [];
    existing.push(repoPath);
    canonicalIndex.set(key, existing);
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

const entriesByPage = new Map();
for (const entry of catalog.entries) {
  const list = entriesByPage.get(entry.page) ?? [];
  const paths = entry.scope === "in_scope" && entry.pack && entry.documentId
    ? canonicalIndex.get(`${entry.pack}:${entry.documentId}`) ?? []
    : [];
  list.push({
    ...entry,
    canonicalPaths: paths,
    canonicalFound: entry.scope !== "in_scope" || paths.length > 0
  });
  entriesByPage.set(entry.page, list);
}

const numberedPages = [...new Set([
  ...pageReviewsBySource.keys(),
  ...entriesByPage.keys()
])].sort((a, b) => a - b).map(sourcePage => {
  const reviews = pageReviewsBySource.get(sourcePage) ?? {};
  const entries = entriesByPage.get(sourcePage) ?? [];
  const sortPdf = reviews.en?.pdfPage ?? reviews.fr?.pdfPage ?? sourcePage + 1000;
  return {
    key: `source-${sourcePage}`,
    sourcePage,
    sortPdf,
    section: reviews.en?.section ?? reviews.fr?.section ?? "",
    reviews,
    entries
  };
});

const unnumberedPages = unnumberedReviews.map(review => ({
  key: `unnumbered-${review.language}-${review.pdfPage}`,
  sourcePage: null,
  sortPdf: review.pdfPage + (review.language === "fr" ? 0.1 : 0),
  section: review.section,
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
  missingCanonical: pages.flatMap(page => page.entries)
    .filter(entry => entry.scope === "in_scope" && !entry.canonicalFound).length
};

const payload = JSON.stringify({
  publication: catalog.publication,
  authorities: catalog.authorities,
  method: catalog.method,
  certifiedThrough: catalog.certifiedThrough,
  summary,
  pages
}).replaceAll("<", "\\u003c");

const html=`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Core Rulebook — vue de certification</title>
<style>
:root{color-scheme:light dark;--bg:#f5f5f3;--panel:#fff;--text:#1f2328;--muted:#667085;--line:#d0d5dd;--good:#067647;--warn:#b54708;--bad:#b42318;--accent:#175cd3;--chip:#eef4ff}
@media(prefers-color-scheme:dark){:root{--bg:#111315;--panel:#191c1f;--text:#f2f4f7;--muted:#98a2b3;--line:#344054;--good:#32d583;--warn:#fdb022;--bad:#f97066;--accent:#84adff;--chip:#1d2939}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
header{position:sticky;top:0;z-index:10;background:color-mix(in srgb,var(--panel) 94%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.wrap{max-width:1500px;margin:auto;padding:18px 24px}.top{display:flex;gap:18px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap}
h1{font-size:22px;margin:0 0 5px}.sub{color:var(--muted)}.stats{display:flex;gap:8px;flex-wrap:wrap}.stat{border:1px solid var(--line);border-radius:8px;padding:6px 9px;background:var(--panel)}
.controls{display:grid;grid-template-columns:minmax(220px,2fr) repeat(3,minmax(150px,1fr));gap:10px;margin-top:14px}.controls input,.controls select{width:100%;padding:9px 10px;border:1px solid var(--line);border-radius:7px;background:var(--panel);color:var(--text)}
main.wrap{padding-top:20px}.page{background:var(--panel);border:1px solid var(--line);border-radius:10px;margin-bottom:10px;overflow:hidden}
.page>summary{cursor:pointer;list-style:none;padding:13px 15px;display:grid;grid-template-columns:90px minmax(180px,1.8fr) 140px 115px 115px;gap:12px;align-items:center}
.page>summary::-webkit-details-marker{display:none}.pageno{font-size:16px;font-weight:750}.section{font-weight:600}.review{color:var(--muted);font-size:12px}
.badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 8px;font-size:12px;font-weight:650;background:var(--chip);width:max-content}
.badge.good{color:var(--good)}.badge.muted{color:var(--muted)}.badge.bad{color:var(--bad)}.counts{font-variant-numeric:tabular-nums}
.body{border-top:1px solid var(--line);padding:14px 15px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.box{border:1px solid var(--line);border-radius:8px;padding:12px}
.box h3{font-size:13px;text-transform:uppercase;letter-spacing:.04em;margin:0 0 9px;color:var(--muted)}.entry{padding:10px 0;border-top:1px solid var(--line)}.entry:first-of-type{border-top:0;padding-top:0}.name{font-weight:700}.fr{color:var(--muted);margin-top:2px}
.meta{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:6px;font-size:12px;color:var(--muted)}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.path{margin-top:5px;overflow-wrap:anywhere}.errata{margin-top:8px;padding:8px 9px;border-left:3px solid var(--warn);background:color-mix(in srgb,var(--warn) 8%,transparent);font-size:12px}.why{margin-top:5px;color:var(--muted)}
.empty{color:var(--muted);font-style:italic}.missing{color:var(--bad);font-weight:700}.ok{color:var(--good);font-weight:650}
footer{color:var(--muted);padding:20px 0 40px;font-size:12px}
.hidden{display:none!important}
@media(max-width:900px){.controls{grid-template-columns:1fr 1fr}.page>summary{grid-template-columns:70px 1fr 100px}.page>summary>:nth-child(4),.page>summary>:nth-child(5){display:none}.grid{grid-template-columns:1fr}}
@media(max-width:560px){.wrap{padding-left:12px;padding-right:12px}.controls{grid-template-columns:1fr}.page>summary{grid-template-columns:65px 1fr}.page>summary>:nth-child(3){display:none}}
</style>
</head>
<body>
<header><div class="wrap">
<div class="top"><div><h1>Core Rulebook — vue de certification</h1><div class="sub">Vue dérivée de <code>catalog/core-rulebook-certification.json</code>. Aucun état éditorial n'est stocké ici.</div></div><div class="stats" id="stats"></div></div>
<div class="controls">
<input id="search" type="search" placeholder="Rechercher page, nom, ID, pack…">
<select id="content"><option value="all">Toutes les pages</option><option value="in">Avec canonical</option><option value="none">Sans canonical</option><option value="excluded">Avec exclusions</option></select>
<select id="status"><option value="all">Tous les statuts</option><option value="verified">Pages vérifiées</option><option value="missing">Canonical manquant</option></select>
<select id="section"><option value="all">Toutes les sections</option></select>
</div>
</div></header>
<main class="wrap" id="pages"></main>
<div class="wrap"><footer id="footer"></footer></div>
<script>
const DATA=${payload};
const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\\"":"&quot;","'":"&#39;"}[ch]));
const pagesEl=document.querySelector("#pages");
const statsEl=document.querySelector("#stats");
const sections=[...new Set(DATA.pages.map(p=>p.section).filter(Boolean))].sort();
document.querySelector("#section").insertAdjacentHTML("beforeend",sections.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join(""));
statsEl.innerHTML=[
  [DATA.summary.numberedPages,"pages source"],
  [DATA.summary.inScope,"canonical retenus"],
  [DATA.summary.outOfScope,"exclusions"],
  [DATA.summary.missingCanonical,"références canonical manquantes"]
].map(([n,l])=>`<span class="stat"><strong>${n}</strong> ${l}</span>`).join("");

function reviewHtml(review,label){
  if(!review)return `<div class="review">${label}: —</div>`;
  return `<div class="review">${label}: PDF p.${review.pdfPage} · <strong>${esc(review.status)}</strong></div>`;
}
function errataHtml(entry){
  if(!entry.errata?.length)return "";
  return entry.errata.map(item=>`<div class="errata"><strong>Errata ${esc(item.id??"")}</strong><br>${esc(item.note??"")}</div>`).join("");
}
function canonicalEntry(entry){
  const paths=entry.canonicalPaths??[];
  const pathHtml=paths.length
    ? paths.map(p=>`<div class="path"><span class="ok">✓ canonical</span> <code>${esc(p)}</code></div>`).join("")
    : `<div class="path missing">✗ canonical introuvable pour <code>${esc(entry.pack)} / ${esc(entry.documentId)}</code></div>`;
  return `<div class="entry">
    <div class="name">${esc(entry.sourceName)}</div>
    ${entry.localizedNames?.fr?`<div class="fr">FR : ${esc(entry.localizedNames.fr)}</div>`:""}
    <div class="meta"><span>${esc(entry.type)}</span><span>pack: <code>${esc(entry.pack)}</code></span><span>id: <code>${esc(entry.documentId)}</code></span><span>status: ${esc(entry.status)}</span></div>
    ${pathHtml}${errataHtml(entry)}
  </div>`;
}
function excludedEntry(entry){
  return `<div class="entry"><div class="name">${esc(entry.sourceName)}</div>
  ${entry.localizedNames?.fr?`<div class="fr">FR : ${esc(entry.localizedNames.fr)}</div>`:""}
  <div class="meta"><span>${esc(entry.type)}</span><span>status: ${esc(entry.status)}</span></div>
  ${entry.justification?`<div class="why">${esc(entry.justification)}</div>`:""}${errataHtml(entry)}</div>`;
}
function render(){
  const q=document.querySelector("#search").value.trim().toLowerCase();
  const content=document.querySelector("#content").value;
  const status=document.querySelector("#status").value;
  const section=document.querySelector("#section").value;
  let visible=0;
  pagesEl.innerHTML=DATA.pages.map(page=>{
    const inside=page.entries.filter(e=>e.scope==="in_scope");
    const excluded=page.entries.filter(e=>e.scope==="out_of_scope");
    const missing=inside.some(e=>!e.canonicalFound);
    const verified=Object.values(page.reviews).some(r=>r?.status==="verified");
    const haystack=JSON.stringify(page).toLowerCase();
    const matchesQ=!q||haystack.includes(q);
    const matchesContent=content==="all"||(content==="in"&&inside.length)||(content==="none"&&!inside.length)||(content==="excluded"&&excluded.length);
    const matchesStatus=status==="all"||(status==="verified"&&verified)||(status==="missing"&&missing);
    const matchesSection=section==="all"||page.section===section;
    if(!(matchesQ&&matchesContent&&matchesStatus&&matchesSection))return "";
    visible++;
    const label=page.sourcePage==null
      ? `${page.reviews.en?"EN":"FR"} PDF ${page.reviews.en?.pdfPage??page.reviews.fr?.pdfPage}`
      : `p.${page.sourcePage}`;
    const disposition=inside.length?`${inside.length} canonical`:"aucun canonical";
    return `<details class="page" ${missing?"open":""}>
      <summary>
        <div class="pageno">${esc(label)}</div>
        <div><div class="section">${esc(page.section)}</div>${reviewHtml(page.reviews.en,"EN")}${reviewHtml(page.reviews.fr,"FR")}</div>
        <div><span class="badge ${inside.length?"good":"muted"}">${disposition}</span></div>
        <div class="counts">${excluded.length} exclusion${excluded.length>1?"s":""}</div>
        <div>${missing?'<span class="badge bad">canonical manquant</span>':""}</div>
      </summary>
      <div class="body"><div class="grid">
        <section class="box"><h3>Canonical retenu (${inside.length})</h3>${inside.length?inside.map(canonicalEntry).join(""):'<div class="empty">Aucun contenu canonical retenu pour cette page.</div>'}</section>
        <section class="box"><h3>Éléments explicitement exclus (${excluded.length})</h3>${excluded.length?excluded.map(excludedEntry).join(""):'<div class="empty">Aucune exclusion cataloguée pour cette page.</div>'}</section>
      </div></div>
    </details>`;
  }).join("");
  document.querySelector("#footer").textContent=`${visible} page(s) affichée(s) · méthode: ${DATA.method}`;
}
for(const id of ["search","content","status","section"])document.querySelector("#"+id).addEventListener("input",render);
render();
</script>
</body></html>`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, html, "utf8");
console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
console.log(`${summary.numberedPages} numbered source pages, ${summary.inScope} in-scope entries, ${summary.outOfScope} exclusions, ${summary.missingCanonical} missing canonical references.`);
