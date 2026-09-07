export const PUBLICATIONS = Object.freeze({
  core_rulebook: Object.freeze({
    id: "core_rulebook",
    titles: Object.freeze({
      en: "Fallout: The Roleplaying Game Core Rulebook",
      fr: "Fallout : le jeu de rôle — Livre de base"
    }),
    shortTitles: Object.freeze({ en: "Core Rulebook", fr: "Livre de base" }),
    languages: Object.freeze(["en", "fr"]),
    editions: Object.freeze({
      en: Object.freeze([
        Object.freeze({
          id: "en-digital-2023-02",
          title: "English digital release (February 2023)",
          version: "2023-02",
          translation: "original",
          errata: Object.freeze(["errata-v6-2026"])
        })
      ]),
      fr: Object.freeze([
        Object.freeze({
          id: "fr-official",
          title: "Official French edition",
          version: "official",
          translation: "official",
          errata: Object.freeze(["errata-v6-2026"])
        })
      ])
    }),
    errata: Object.freeze([
      Object.freeze({
        id: "errata-v6-2026",
        title: "Fallout: The Roleplaying Game Errata Log",
        version: "V6 (2026)",
        languages: Object.freeze(["en", "fr"])
      })
    ])
  })
});

export function getPublication(id) {
  const publication = PUBLICATIONS[id];
  if (!publication) throw new Error(`Unknown publication id: ${JSON.stringify(id)}`);
  return publication;
}

export function publicationEdition(publicationId, language, editionId) {
  const publication = getPublication(publicationId);
  const edition = publication.editions[language]?.find(candidate => candidate.id === editionId);
  if (!edition) {
    throw new Error(`Unknown edition ${JSON.stringify(editionId)} for publication ${JSON.stringify(publicationId)} and language ${JSON.stringify(language)}`);
  }
  return edition;
}
