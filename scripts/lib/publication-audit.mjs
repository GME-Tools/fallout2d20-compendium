import { validatePublicationRegistry, validateProvenance } from "./provenance.mjs";

const MODULE_ID = "fallout2d20-compendium";
const ROOT_KEY = /^!(?:items|actors|tables)![^.!]+$/;
const UUID = /Compendium\.fallout2d20-compendium\.([a-z]{2})-([A-Za-z0-9_-]+)\.(Item|Actor|RollTable)\.([A-Za-z0-9]+)/g;

function location(record) {
  return record.file ?? `${record.language}/${record.pack}/${record.document?._id ?? "<unknown>"}`;
}

function strings(value, field = "", output = []) {
  if (typeof value === "string") output.push([field, value]);
  else if (Array.isArray(value)) value.forEach((entry, index) => strings(entry, `${field}[${index}]`, output));
  else if (value && typeof value === "object") for (const [key, entry] of Object.entries(value)) strings(entry, field ? `${field}.${key}` : key, output);
  return output;
}

function signature(ids) {
  return [...ids].sort().join(":");
}

/**
 * Audit publication-neutral invariants. The caller supplies reviewed inventory
 * expectations; this function only compares them and never writes them.
 */
export function auditPublicationDocuments({ registry, records, duplicateApprovals = [], inventories = {} }) {
  validatePublicationRegistry(registry);
  const errors = [];
  const roots = records.filter(({ document }) => ROOT_KEY.test(document?._key ?? ""));
  const publications = Object.fromEntries(Object.keys(registry).map(id => [id, {
    firstAppearances: 0, secondaryAppearances: 0, identities: { en: 0, fr: 0 }, inventory: "not-configured"
  }]));
  const coordinates = new Map();
  const ids = new Map();
  const occurrences = new Map();
  const names = new Map();

  for (const record of roots) {
    const { document, language, pack } = record;
    let source;
    try { source = validateProvenance(document, { language, registry }); }
    catch (error) { errors.push(`${location(record)}: ${error.message}`); continue; }
    const coordinate = `${language}/${pack}/${document._id}`;
    coordinates.set(coordinate, record);
    const identity = `${language}/${document._id}`;
    if (ids.has(identity)) errors.push(`${location(record)}: identity collision ${JSON.stringify(identity)} with ${location(ids.get(identity))}`);
    else ids.set(identity, record);

    publications[source.book].firstAppearances++;
    publications[source.book].identities[language]++;
    for (const appearance of source.appearances) publications[appearance.book].secondaryAppearances++;
    for (const publicationId of [source.book, ...source.appearances.map(({ book }) => book)]) {
      const key = `${publicationId}/${language}/${pack}/${document._id}`;
      if (occurrences.has(key)) errors.push(`${location(record)}: duplicate occurrence for publication ${JSON.stringify(publicationId)} and identity ${JSON.stringify(`${language}/${pack}/${document._id}`)}`);
      else occurrences.set(key, { record, source, primary: publicationId === source.book });
    }
    const normalizedName = document.name?.trim().toLocaleLowerCase(language);
    const nameKey = `${language}/${pack}/${normalizedName}`;
    names.set(nameKey, [...(names.get(nameKey) ?? []), record]);
    const artworkStatus = document.flags?.[MODULE_ID]?.source?.artworkStatus;
    if (!["dedicated", "shared", "placeholder"].includes(artworkStatus)) errors.push(`${location(record)}: flags.${MODULE_ID}.source.artworkStatus: must be dedicated, shared, or placeholder`);

    for (const [field, value] of strings(document)) for (const match of value.matchAll(UUID)) {
      const [, targetLanguage, targetPack,, targetId] = match;
      if (targetLanguage !== language) errors.push(`${location(record)}: ${field}: cross-language UUID ${JSON.stringify(match[0])}; expected ${JSON.stringify(language)}`);
      if (!roots.some(candidate => candidate.language === targetLanguage && candidate.pack === targetPack && candidate.document._id === targetId)) {
        errors.push(`${location(record)}: ${field}: unresolved UUID ${JSON.stringify(match[0])}`);
      }
    }
  }

  for (const [publicationId, publication] of Object.entries(registry)) {
    if (publication.languages.includes("en") && publication.languages.includes("fr")) {
      const relevant = [...occurrences].filter(([key]) => key.startsWith(`${publicationId}/`));
      for (const [, occurrence] of relevant.filter(([, value]) => value.record.language === "en")) {
        const { pack, document } = occurrence.record;
        const counterpart = occurrences.get(`${publicationId}/fr/${pack}/${document._id}`);
        if (!counterpart) errors.push(`${location(occurrence.record)}: publication ${JSON.stringify(publicationId)} language parity: missing fr/${pack}/${document._id}`);
        else {
          if (counterpart.primary !== occurrence.primary) errors.push(`${location(counterpart.record)}: publication ${JSON.stringify(publicationId)} distinguishes first appearance and identical reprint differently between languages`);
          const enSource = occurrence.record.document.flags?.[MODULE_ID]?.source;
          const frSource = counterpart.record.document.flags?.[MODULE_ID]?.source;
          if (occurrence.record.document.img !== counterpart.record.document.img) errors.push(`${location(counterpart.record)}: publication ${JSON.stringify(publicationId)} image differs from English identity ${document._id}`);
          if (enSource?.artworkStatus !== frSource?.artworkStatus) errors.push(`${location(counterpart.record)}: publication ${JSON.stringify(publicationId)} artworkStatus differs from English identity ${document._id}`);
        }
      }
    }

    const expected = inventories[publicationId];
    if (expected !== undefined) {
      publications[publicationId].inventory = "checked";
      const actual = [...occurrences]
        .filter(([key]) => key.startsWith(`${publicationId}/`))
        .map(([key]) => key.slice(publicationId.length + 1)).sort();
      const wanted = [...expected].sort();
      const missing = wanted.filter(key => !actual.includes(key));
      const unexpected = actual.filter(key => !wanted.includes(key));
      if (missing.length || unexpected.length) errors.push(`publication ${JSON.stringify(publicationId)} inventory mismatch: missing [${missing.join(", ")}], unexpected [${unexpected.join(", ")}]`);
    }
  }

  const approved = new Set(duplicateApprovals.map(({ publication, language, pack, ids, classification }) => `${publication}/${language}/${pack}/${classification}/${signature(ids)}`));
  const usedApprovals = new Set();
  for (const [nameKey, group] of names) {
    if (group.length < 2) continue;
    const [language, pack] = nameKey.split("/", 2);
    const publicationIds = new Set(group.map(record => record.document.flags?.[MODULE_ID]?.source?.book));
    const groupSignature = signature(group.map(record => record.document._id));
    const createsIdenticalReprint = group.some(record => {
      const book = record.document.flags?.[MODULE_ID]?.source?.book;
      return group.some(other => other !== record && (other.document.flags?.[MODULE_ID]?.source?.appearances ?? []).some(appearance => appearance.book === book && appearance.status === "identical"));
    });
    if (createsIdenticalReprint) {
      errors.push(`${location(group[1])}: identical reprint must reuse the oldest canonical document; duplicate identities ${group.map(record => record.document._id).join(", ")}`);
      continue;
    }
    const classification = publicationIds.size > 1 ? "mechanical-variant" : "editorial";
    const matchingApproval = [...publicationIds].map(publication => `${publication}/${language}/${pack}/${classification}/${groupSignature}`).find(key => approved.has(key));
    const matches = Boolean(matchingApproval);
    if (matchingApproval) usedApprovals.add(matchingApproval);
    if (!matches) errors.push(`${location(group[1])}: unapproved duplicate localized name ${JSON.stringify(group[0].document.name)} (${group.map(record => record.document._id).join(", ")})`);
  }
  for (const approval of approved) if (!usedApprovals.has(approval)) errors.push(`stale duplicate approval ${JSON.stringify(approval)}: IDs no longer form one complete localized-name group`);

  return { errors, publications };
}
