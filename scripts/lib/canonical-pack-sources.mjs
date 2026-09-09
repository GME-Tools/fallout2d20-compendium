import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { listFiles } from "./files.mjs";
import { folderId, folderKeyForDocument, PACK_FOLDER_DEFINITIONS } from "../data/pack-folders.mjs";

const LANGUAGE_TOKEN = "{language}";
const MISSING = Symbol("missing");

function pointerSegment(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function normalizeReferences(value) {
  if (typeof value === "string") {
    return value.replace(/Compendium\.fallout2d20-compendium\.(?:en|fr)-/g, `Compendium.fallout2d20-compendium.${LANGUAGE_TOKEN}-`);
  }
  if (Array.isArray(value)) return value.map(normalizeReferences);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalizeReferences(child)]));
  return value;
}

function equal(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function splitValue(english, french, pointer, overlays) {
  const en = english === MISSING ? MISSING : normalizeReferences(english);
  const fr = french === MISSING ? MISSING : normalizeReferences(french);
  if (en !== MISSING && fr !== MISSING && equal(en, fr)) return en;

  if (en !== MISSING && fr !== MISSING && Array.isArray(en) && Array.isArray(fr) && en.length === fr.length) {
    return en.map((value, index) => {
      const common = splitValue(value, fr[index], `${pointer}/${index}`, overlays);
      return common === MISSING ? null : common;
    });
  }

  const enObject = en !== MISSING && en && typeof en === "object" && !Array.isArray(en);
  const frObject = fr !== MISSING && fr && typeof fr === "object" && !Array.isArray(fr);
  if (enObject && frObject) {
    const common = {};
    for (const key of new Set([...Object.keys(en), ...Object.keys(fr)])) {
      const child = splitValue(key in en ? en[key] : MISSING, key in fr ? fr[key] : MISSING, `${pointer}/${pointerSegment(key)}`, overlays);
      if (child !== MISSING) common[key] = child;
    }
    return common;
  }

  if (en !== MISSING) overlays.en[pointer] = en;
  if (fr !== MISSING) overlays.fr[pointer] = fr;
  return MISSING;
}

export function splitLocalizedDocument(english, french) {
  const overlays = { en: {}, fr: {} };
  const canonical = splitValue(english, french, "", overlays);
  return { canonical, overlays };
}

function setPointer(target, pointer, value) {
  if (!pointer) return structuredClone(value);
  const segments = pointer.slice(1).split("/").map(segment => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
  let parent = target;
  for (const [index, segment] of segments.slice(0, -1).entries()) {
    if (parent[segment] === null || parent[segment] === undefined) parent[segment] = /^\d+$/.test(segments[index + 1]) ? [] : {};
    parent = parent[segment];
  }
  parent[segments.at(-1)] = structuredClone(value);
  return target;
}

export function pointerOverrides(base, target, pointer = "", output = {}) {
  if (equal(base, target)) return output;
  if (base && target && typeof base === "object" && typeof target === "object" && !Array.isArray(base) && !Array.isArray(target)) {
    for (const key of new Set([...Object.keys(base), ...Object.keys(target)])) {
      const childPointer = `${pointer}/${pointerSegment(key)}`;
      if (!(key in target)) output[childPointer] = { $delete: true };
      else if (!(key in base)) output[childPointer] = structuredClone(target[key]);
      else pointerOverrides(base[key], target[key], childPointer, output);
    }
    return output;
  }
  output[pointer] = structuredClone(target);
  return output;
}

function applyPointerOverrides(base, overrides) {
  let result = structuredClone(base);
  for (const [pointer, value] of Object.entries(overrides ?? {})) {
    if (!value?.$delete) result = setPointer(result, pointer, value);
    else {
      const segments = pointer.slice(1).split("/").map(segment => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
      let parent = result;
      for (const segment of segments.slice(0, -1)) parent = parent[segment];
      delete parent[segments.at(-1)];
    }
  }
  return result;
}

export function resolveCanonicalReferences(value, documentsByPack, context = "document") {
  if (Array.isArray(value)) return value.map((child, index) => resolveCanonicalReferences(child, documentsByPack, `${context}/${index}`));
  if (!value || typeof value !== "object") return value;
  if (value.$ref) {
    const { pack, id } = value.$ref;
    const referenced = documentsByPack.get(pack)?.get(id);
    if (!referenced) throw new Error(`${context}: unresolved canonical reference ${pack}/${id}`);
    return resolveCanonicalReferences(applyPointerOverrides(referenced, value.$overrides), documentsByPack, `${context}->${pack}/${id}`);
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, resolveCanonicalReferences(child, documentsByPack, `${context}/${key}`)]));
}

function stripSourceMetadata(value) {
  if (Array.isArray(value)) { for (const child of value) stripSourceMetadata(child); return; }
  if (!value || typeof value !== "object") return;
  delete value.$folder;
  for (const child of Object.values(value)) stripSourceMetadata(child);
}

export function materializeLocalizedDocument(canonical, overlay, language) {
  let document = structuredClone(canonical);
  for (const [pointer, value] of Object.entries(overlay.values ?? {})) document = setPointer(document, pointer, value);
  return JSON.parse(JSON.stringify(document).replaceAll(LANGUAGE_TOKEN, language));
}

export async function loadCanonicalPack(language, packName, sourceRoot = "src/packs") {
  const canonicalRoot = path.resolve(sourceRoot, "canonical", `${packName}.db`);
  const localeRoot = path.resolve(sourceRoot, "locales", language, `${packName}.db`);
  const canonicalFiles = await listFiles(canonicalRoot, file => file.endsWith(".json"));
  const localeFiles = await listFiles(localeRoot, file => file.endsWith(".json"));
  const overlays = new Map(await Promise.all(localeFiles.map(async file => {
    const value = JSON.parse(await readFile(file, "utf8"));
    return [value._key, { ...value, file }];
  })));
  const documents = [];
  for (const file of canonicalFiles) {
    const canonical = JSON.parse(await readFile(file, "utf8"));
    const overlay = overlays.get(canonical._key);
    if (!overlay) throw new Error(`${language}/${packName}/${canonical._key}: missing locale overlay`);
    documents.push({ document: materializeLocalizedDocument(canonical, overlay, language), sourceFile: overlay._file, canonicalFile: file, overlayFile: overlay.file });
  }
  if (documents.length !== overlays.size) throw new Error(`${language}/${packName}: locale overlay contains an unknown document`);
  return documents;
}

export async function materializeSourceViews(outputRoot, languages, packs, sourceRoot = "src/packs") {
  for (const language of languages) {
    const loaded = new Map();
    const documentsByPack = new Map();
    for (const pack of packs) {
      const entries = await loadCanonicalPack(language, pack.name, sourceRoot);
      loaded.set(pack.name, entries);
      documentsByPack.set(pack.name, new Map(entries.filter(entry => /^!(?:items|actors|tables)!/.test(entry.document._key)).map(entry => [entry.document._id, entry.document])));
    }
    for (const pack of packs) for (const { document, sourceFile } of loaded.get(pack.name)) {
      const output = path.join(outputRoot, language, `${pack.name}.db`, sourceFile);
      await mkdir(path.dirname(output), { recursive: true });
      const resolved = resolveCanonicalReferences(document, documentsByPack, `${language}/${pack.name}/${document._id}`);
      if (/^!(?:items|actors|tables)![^.!]+$/.test(resolved._key ?? "") && PACK_FOLDER_DEFINITIONS[pack.name]) {
        const folderKey = folderKeyForDocument(pack.name, resolved);
        if (!folderKey && pack.name !== "perks") throw new Error(`${language}/${pack.name}/${resolved.name}: no folder classification`);
        resolved.folder = folderKey ? folderId(pack.name, folderKey) : null;
      }
      stripSourceMetadata(resolved);
      await writeFile(output, `${JSON.stringify(resolved, null, 2)}\n`);
    }
  }
}

export async function loadLegacyPack(root, language, packName) {
  const directory = path.join(root, language, `${packName}.db`);
  const files = await listFiles(directory, file => file.endsWith(".json"));
  return Promise.all(files.map(async file => ({
    document: JSON.parse(await readFile(file, "utf8")),
    sourceFile: path.relative(directory, file)
  })));
}

export async function directoryExists(directory) {
  try { await readdir(directory); return true; } catch (error) { if (error.code === "ENOENT") return false; throw error; }
}
