import { PUBLICATIONS } from "../data/publications.mjs";

const IDENTIFIER = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const LANGUAGES = new Set(["en", "fr"]);
const TRANSLATIONS = new Set(["original", "official", "project"]);

function fail(field, message) {
  throw new Error(`${field}: ${message}`);
}

export function validatePublicationRegistry(registry = PUBLICATIONS) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)) fail("publications", "must be an object keyed by publication id");
  for (const [key, publication] of Object.entries(registry)) {
    const field = `publications.${key}`;
    if (!IDENTIFIER.test(key)) fail(field, "id must use lower-case snake_case");
    if (publication?.id !== key) fail(`${field}.id`, `must equal registry key ${JSON.stringify(key)}`);
    for (const language of ["en", "fr"]) {
      if (!publication.titles?.[language]?.trim()) fail(`${field}.titles.${language}`, "localized title is required");
      if (!publication.shortTitles?.[language]?.trim()) fail(`${field}.shortTitles.${language}`, "localized short title is required");
    }
    if (!Array.isArray(publication.languages) || !publication.languages.length) fail(`${field}.languages`, "must be a non-empty array");
    if (new Set(publication.languages).size !== publication.languages.length) fail(`${field}.languages`, "must not contain duplicates");
    const errataIds = new Set();
    for (const [index, erratum] of (publication.errata ?? []).entries()) {
      const errataField = `${field}.errata[${index}]`;
      if (!erratum?.id?.trim() || errataIds.has(erratum.id)) fail(`${errataField}.id`, "must be a unique non-empty id");
      errataIds.add(erratum.id);
      if (!erratum.title?.trim() || !erratum.version?.trim()) fail(errataField, "title and version are required");
      if (!Array.isArray(erratum.languages) || erratum.languages.some(language => !publication.languages.includes(language))) fail(`${errataField}.languages`, "must reference declared publication languages");
    }
    for (const language of publication.languages) {
      if (!LANGUAGES.has(language)) fail(`${field}.languages`, `unsupported language ${JSON.stringify(language)}`);
      const editions = publication.editions?.[language];
      if (!Array.isArray(editions) || !editions.length) fail(`${field}.editions.${language}`, "at least one edition is required");
      const editionIds = new Set();
      for (const [index, edition] of editions.entries()) {
        const editionField = `${field}.editions.${language}[${index}]`;
        if (!edition?.id?.trim() || editionIds.has(edition.id)) fail(`${editionField}.id`, "must be a unique non-empty id");
        editionIds.add(edition.id);
        if (!edition.title?.trim() || !edition.version?.trim()) fail(editionField, "title and version are required");
        if (!TRANSLATIONS.has(edition.translation)) fail(`${editionField}.translation`, "must be original, official, or project");
        if (!Array.isArray(edition.errata) || edition.errata.some(id => !errataIds.has(id))) fail(`${editionField}.errata`, "must contain only declared errata ids");
      }
    }
  }
  return registry;
}

function registeredPublication(registry, id) {
  const publication = registry[id];
  if (!publication) throw new Error(`Unknown publication id: ${JSON.stringify(id)}`);
  return publication;
}

export function readProvenance(document, { moduleId = "fallout2d20-compendium" } = {}) {
  const source = document?.flags?.[moduleId]?.source;
  if (!source) fail(`flags.${moduleId}.source`, "is required");
  return { ...source, appearances: source.appearances ?? [] };
}

export function validateProvenance(document, { moduleId = "fallout2d20-compendium", language, registry = PUBLICATIONS } = {}) {
  const field = `flags.${moduleId}.source`;
  const source = readProvenance(document, { moduleId });
  let publication;
  try { publication = registeredPublication(registry, source.book); }
  catch { fail(`${field}.book`, `unknown publication ${JSON.stringify(source.book)}`); }
  if (!publication.languages.includes(source.language)) fail(`${field}.language`, `language ${JSON.stringify(source.language)} is not available for publication ${JSON.stringify(source.book)}`);
  if (language && source.language !== language) fail(`${field}.language`, `expected ${JSON.stringify(language)}, got ${JSON.stringify(source.language)}`);
  if (document.system?.source !== undefined && document.system.source !== source.book) {
    fail("system.source", `must equal first-appearance publication ${JSON.stringify(source.book)}`);
  }
  if (!Array.isArray(source.appearances)) fail(`${field}.appearances`, "must be an array");
  const seen = new Set();
  for (const [index, appearance] of source.appearances.entries()) {
    const appearanceField = `${field}.appearances[${index}]`;
    if (!appearance || typeof appearance !== "object" || Array.isArray(appearance)) fail(appearanceField, "must be an object");
    if (appearance.book === source.book) fail(`${appearanceField}.book`, "must not repeat the first-appearance publication");
    const appearancePublication = registry[appearance.book];
    if (!appearancePublication) fail(`${appearanceField}.book`, `unknown publication ${JSON.stringify(appearance.book)}`);
    if (!appearancePublication.languages.includes(appearance.language)) {
      fail(`${appearanceField}.language`, `language ${JSON.stringify(appearance.language)} is not available for publication ${JSON.stringify(appearance.book)}`);
    }
    if (!appearancePublication.editions[appearance.language].some(edition => edition.id === appearance.edition)) {
      fail(`${appearanceField}.edition`, `unknown edition ${JSON.stringify(appearance.edition)} for publication ${JSON.stringify(appearance.book)} and language ${JSON.stringify(appearance.language)}`);
    }
    if (appearance.status !== "identical") fail(`${appearanceField}.status`, "must be \"identical\"; mechanical variants require a distinct document id");
    if (appearance.translation !== undefined && !TRANSLATIONS.has(appearance.translation)) fail(`${appearanceField}.translation`, "must be original, official, or project");
    const signature = `${appearance.book}/${appearance.edition}/${appearance.language}`;
    if (seen.has(signature)) fail(appearanceField, `duplicates secondary appearance ${JSON.stringify(signature)}`);
    seen.add(signature);
  }
  return source;
}

validatePublicationRegistry();
