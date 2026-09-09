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
  }),
  gamemaster_toolkit: Object.freeze({
    id: "gamemaster_toolkit",
    titles: Object.freeze({
      en: "Fallout: The Roleplaying Game Gamemaster's Toolkit",
      fr: "Fallout : le jeu de rôle — Kit du meneur de jeu"
    }),
    shortTitles: Object.freeze({ en: "GM Toolkit", fr: "Kit du MJ" }),
    languages: Object.freeze(["en", "fr"]),
    editions: Object.freeze({
      en: Object.freeze([
        Object.freeze({
          id: "en-digital-2021-04-22",
          title: "English digital release (22 April 2021)",
          version: "2021-04-22",
          translation: "original",
          errata: Object.freeze([])
        })
      ]),
      fr: Object.freeze([
        Object.freeze({
          id: "fr-project-1.1.0",
          title: "Project French translation for version 1.1.0",
          version: "1.1.0",
          translation: "project",
          errata: Object.freeze([])
        })
      ])
    }),
    errata: Object.freeze([])
  }),
  starter_set: Object.freeze({
    id: "starter_set",
    titles: Object.freeze({
      en: "Fallout: The Roleplaying Game Starter Set",
      fr: "Fallout : le jeu de rôle — Kit d'initiation"
    }),
    shortTitles: Object.freeze({ en: "Starter Set", fr: "Kit d'initiation" }),
    languages: Object.freeze(["en", "fr"]),
    editions: Object.freeze({
      en: Object.freeze([
        Object.freeze({
          id: "en-adventure-2022-02-28",
          title: "English Adventure Booklet (28 February 2022)",
          version: "2022-02-28",
          translation: "original",
          errata: Object.freeze([])
        })
      ]),
      fr: Object.freeze([
        Object.freeze({
          id: "fr-official-adventure",
          title: "Official French adventure booklet",
          version: "official",
          translation: "official",
          errata: Object.freeze([])
        })
      ])
    }),
    errata: Object.freeze([])
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
