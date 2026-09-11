import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { LANGUAGES, MODULE_ID, PACKS, documentKey } from "./config.mjs";
import { listFiles } from "./lib/files.mjs";
import { imageDimensions } from "./lib/image-dimensions.mjs";
import { approvedDuplicateNameGroups, duplicateGroupSignature } from "./data/approved-core-duplicate-names.mjs";
import { validateProvenance } from "./lib/provenance.mjs";
import { auditPublicationDocuments } from "./lib/publication-audit.mjs";
import { PUBLICATIONS } from "./data/publications.mjs";
import { PUBLICATION_DUPLICATE_APPROVALS, PUBLICATION_INVENTORY_CONTRACTS } from "./data/publication-audit-contracts.mjs";

const errors = [];
const warnings = [];
const ids = new Map();
const namesByPack = new Map();
const documentIdsByPack = new Map();
let documentCount = 0;
let recordCount = 0;
const publicationRecords = [];

function issue(list, file, message) {
  list.push(`${path.relative(process.cwd(), file)}: ${message}`);
}

for (const language of LANGUAGES) {
  for (const pack of PACKS) {
    const root = path.resolve("generated/source-packs", language, `${pack.name}.db`);
    const files = await listFiles(root, file => file.endsWith(".json"));
    const names = new Map();
    const documentIds = new Set();
    namesByPack.set(`${language}/${pack.name}`, names);
    documentIdsByPack.set(`${language}/${pack.name}`, documentIds);
    for (const file of files) {
      let document;
      try {
        document = JSON.parse(await readFile(file, "utf8"));
      } catch (error) {
        issue(errors, file, `invalid JSON (${error.message})`);
        continue;
      }
      recordCount++;
      const [, recordCollection, recordId] = document._key?.split("!") ?? [];
      const isEmbeddedRecord = recordCollection?.includes(".");
      if (isEmbeddedRecord) {
        if (!/^[A-Za-z0-9]{16}$/.test(document._id ?? "")) issue(errors, file, "embedded record _id must contain 16 alphanumeric characters");
        if (recordId?.split(".").at(-1) !== document._id) issue(errors, file, "embedded record _key must end with its _id");
        if (recordCollection === "tables.results" && (!Array.isArray(document.range) || document.range.length !== 2)) {
          issue(errors, file, "table result range is required");
        }
        continue;
      }
      if (pack.type === "RollTable") {
        if (!Array.isArray(document.results)) issue(errors, file, "table results are required");
        for (const result of document.results ?? []) {
          recordCount++;
          if (!/^[A-Za-z0-9]{16}$/.test(result?._id ?? "")) issue(errors, file, "embedded table result _id must contain 16 alphanumeric characters");
          if (result?._key !== `!tables.results!${document._id}.${result?._id}`) issue(errors, file, `embedded table result ${result?._id ?? "<unknown>"} has an invalid _key`);
          if (!Array.isArray(result?.range) || result.range.length !== 2) issue(errors, file, `embedded table result ${result?._id ?? "<unknown>"} requires a range`);
        }
      }
      documentCount++;
      publicationRecords.push({ language, pack: pack.name, type: pack.type, file, document });
      if (!/^[A-Za-z0-9]{16}$/.test(document._id ?? "")) issue(errors, file, "_id must contain 16 alphanumeric characters");
      if (!document.name?.trim()) issue(errors, file, "name is required");
      if (!document.type && pack.type !== "RollTable") issue(errors, file, "document type is required");
      if ("data" in document) issue(errors, file, "legacy data property found; use system");
      if (pack.type !== "RollTable" && !document.system) issue(errors, file, "system object is required");
      if (document._key !== documentKey(pack.type, document._id)) issue(errors, file, "_key does not match pack type and _id");
      try {
        validateProvenance(document, { moduleId: MODULE_ID, language });
      } catch (error) {
        issue(errors, file, error.message);
      }
      const scopedId = `${language}/${pack.name}/${document._id}`;
      documentIds.add(document._id);
      const previous = ids.get(scopedId);
      if (previous) issue(errors, file, `_id duplicates ${path.relative(process.cwd(), previous)}`);
      else ids.set(scopedId, file);
      const normalizedName = document.name?.trim().toLocaleLowerCase(language);
      const namedDocuments = names.get(normalizedName) ?? [];
      namedDocuments.push({ id: document._id, file });
      names.set(normalizedName, namedDocuments);

      if (document.img?.startsWith(`modules/${MODULE_ID}/`)) {
        const relativeImage = decodeURIComponent(document.img.slice(`modules/${MODULE_ID}/`.length));
        const image = path.resolve(relativeImage);
        try {
          const metadata = await stat(image);
          const dimensions = imageDimensions(await readFile(image));
          if (dimensions.width !== dimensions.height) issue(warnings, file, `image is not square (${dimensions.width}x${dimensions.height})`);
          if (metadata.size > 300 * 1024) issue(warnings, file, `image exceeds hard target of 300 KiB (${Math.ceil(metadata.size / 1024)} KiB)`);
          else if (metadata.size > 150 * 1024) issue(warnings, file, `image exceeds preferred target of 150 KiB (${Math.ceil(metadata.size / 1024)} KiB)`);
        } catch {
          const imported = document.flags?.[MODULE_ID]?.source?.importedFromLegacy;
          issue(imported ? warnings : errors, file, `image does not exist: ${relativeImage}`);
        }
      }
    }
  }
}

for (const [publicationId, contract] of Object.entries(PUBLICATION_INVENTORY_CONTRACTS)) {
  if (!PUBLICATIONS[publicationId]) errors.push(`publication inventory contract: unknown publication ${JSON.stringify(publicationId)}`);
  if (contract.mode !== "specialized") errors.push(`publication ${publicationId}: unsupported inventory contract mode ${JSON.stringify(contract.mode)}`);
  for (const catalog of contract.catalogs ?? []) {
    try { await stat(path.resolve(catalog)); }
    catch { errors.push(`publication ${publicationId}: reviewed inventory does not exist: ${catalog}`); }
  }
}

const publicationAudit = auditPublicationDocuments({ registry: PUBLICATIONS, records: publicationRecords, duplicateApprovals: PUBLICATION_DUPLICATE_APPROVALS });
errors.push(...publicationAudit.errors);

for (const language of LANGUAGES) {
  for (const pack of PACKS) {
    const approved = new Set(approvedDuplicateNameGroups(language, pack.name).map(duplicateGroupSignature));
    const observed = new Set();
    for (const documents of namesByPack.get(`${language}/${pack.name}`).values()) {
      if (documents.length < 2) continue;
      const signature = duplicateGroupSignature(documents.map(document => document.id));
      observed.add(signature);
      if (!approved.has(signature)) issue(errors, documents[1].file, `unapproved duplicate localized name group (${documents.map(document => document.id).join(", ")})`);
    }
    for (const signature of approved) {
      if (!observed.has(signature)) errors.push(`${language}/${pack.name}: approved duplicate name group is stale or no longer shares one name (${signature})`);
    }
  }
}

for (const pack of PACKS) {
  const english = documentIdsByPack.get(`en/${pack.name}`);
  const french = documentIdsByPack.get(`fr/${pack.name}`);
  const missingInFrench = [...english].filter(id => !french.has(id));
  const missingInEnglish = [...french].filter(id => !english.has(id));
  if (missingInFrench.length || missingInEnglish.length) {
    errors.push(`parity ${pack.name}: missing FR IDs [${missingInFrench.join(", ")}], missing EN IDs [${missingInEnglish.join(", ")}]`);
  }
}

for (const message of errors) console.error(`ERROR ${message}`);
for (const message of warnings.slice(0, 50)) console.warn(`WARN  ${message}`);
if (warnings.length > 50) console.warn(`WARN  ${warnings.length - 50} additional warning(s) omitted from console output.`);
console.log(`Validated ${documentCount} documents (${recordCount} LevelDB records): ${errors.length} error(s), ${warnings.length} warning(s).`);
if (errors.length) process.exitCode = 1;
