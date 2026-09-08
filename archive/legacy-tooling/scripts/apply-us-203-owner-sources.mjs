import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MODULE_ID } from "./config.mjs";

const allowedPacks = new Set(["ammunition", "consumables"]);
const checklist = await readFile("reports/us-201-images-to-find.md", "utf8");
const entries = [];
for (const line of checklist.split("\n")) {
  const match = line.match(/^- \[ \] `([^:]+):([A-Za-z0-9]+)` .*?(https?:\/\/\S+)$/);
  if (!match || !allowedPacks.has(match[1])) continue;
  entries.push({ pack:match[1], id:match[2], identity:`${match[1]}:${match[2]}`, url:match[3] });
}
if (entries.length !== 36) throw new Error(`expected 36 annotated US-203 entries, found ${entries.length}`);

const byUrl = new Map();
for (const entry of entries) {
  const group = byUrl.get(entry.url) ?? [];
  group.push(entry); byUrl.set(entry.url, group);
}
const sourceRoot = "artwork/sources/owner/us-203";
const outputRoot = "artwork/Owner Approved/us-203";
await mkdir(sourceRoot,{recursive:true}); await mkdir(outputRoot,{recursive:true});
const exists=async file=>{try{await access(file);return true}catch{return false}};

await Promise.all([...byUrl].map(async ([url, group]) => {
  const key=createHash("sha256").update(url).digest("hex").slice(0,16);
  const metadataFile=path.join(sourceRoot,`${key}.json`), outputFile=path.join(outputRoot,`${key}.webp`);
  let metadata;
  if (await exists(metadataFile) && await exists(outputFile)) metadata=JSON.parse(await readFile(metadataFile,"utf8"));
  else {
    const response=await fetch(url,{headers:{"user-agent":"Mozilla/5.0 fallout2d20-compendium private artwork retrieval"}});
    if (!response.ok) throw new Error(`${group[0].identity}: HTTP ${response.status} for ${url}`);
    const buffer=Buffer.from(await response.arrayBuffer()), contentType=response.headers.get("content-type") ?? "application/octet-stream";
    const extension=contentType.includes("png")?"png":contentType.includes("jpeg")||contentType.includes("jpg")?"jpg":contentType.includes("gif")?"gif":"bin";
    const sourceFile=path.join(sourceRoot,`${key}.${extension}`);
    await writeFile(sourceFile,buffer);
    await sharp(buffer).resize(512,512,{fit:"contain",background:{r:28,g:31,b:28,alpha:1},withoutEnlargement:false}).sharpen().webp({quality:82,effort:6}).toFile(outputFile);
    metadata={url,retrievedAt:new Date().toISOString(),contentType,sourceFile,outputFile,entries:group.map(item=>item.identity)};
    await writeFile(metadataFile,`${JSON.stringify(metadata,null,2)}\n`);
  }
  const shared=group.length>1, sharingGroup=`shared-owner-source-${key}`;
  for (const entry of group) for (const language of ["en","fr"]) {
    const directory=`src/packs/${language}/${entry.pack}.db`;
    const file=(await readdir(directory)).find(file=>file.endsWith(`__${entry.id}.json`));
    if (!file) throw new Error(`${language}/${entry.identity}: document not found`);
    const candidate=path.join(directory,file), document=JSON.parse(await readFile(candidate,"utf8"));
    const target={candidate,document};
    const source=target.document.flags?.[MODULE_ID]?.source;
    target.document.img=`modules/${MODULE_ID}/${outputFile}`;
    Object.assign(source,{artworkReviewed:true,artworkStatus:shared?"shared":"dedicated",artworkSource:`Owner-approved URL: ${url}; retrieved ${metadata.retrievedAt}; source copy ${metadata.sourceFile}`});
    if (shared) Object.assign(source,{artworkSharingGroup:sharingGroup,artworkSharingJustification:"Owner supplied the same source URL for these entries."});
    else { delete source.artworkSharingGroup; delete source.artworkSharingJustification; }
    await writeFile(target.candidate,`${JSON.stringify(target.document,null,2)}\n`);
  }
}));
console.log(`Applied ${entries.length} US-203 identities from ${byUrl.size} owner-approved sources.`);
