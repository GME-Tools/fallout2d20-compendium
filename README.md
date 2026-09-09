# Fallout 2d20 Compendium

Private bilingual English/French compendium module for Fallout 2d20 on Foundry Virtual Tabletop v14. Version 1.0.3 introduces canonical bilingual pack sources, generated folders, and the unified Denizens compendium.

The project is being rebuilt around readable document sources, reproducible LevelDB packs, automated quality checks, and GitHub release packaging. For version 1, the English Core Rulebook plus Errata Log V6 (2026) is the canonical mechanical source; French documents are adapted from the official French book and checked against that canon.

## Development

Requirements: Node.js 20 or 23 and npm.

```sh
npm ci
npm run validate
npm test
npm run build
npm run package
```

`npm run ci` runs the complete local quality and packaging pipeline. Generated LevelDB packs are written to `packs-v14/`; the installable archive is written to `dist/`.

Do not edit generated packs. Shared authoritative documents live under `src/packs/canonical/`; sparse localized values live under `src/packs/locales/en/` and `src/packs/locales/fr/`.

Publications are declared in the validated registry at `scripts/data/publications.mjs`; provenance, reprint/variant policy, and publication-aware folder and catalog conventions are documented in `docs/MULTI-PUBLICATION-REGISTRY.md`.

## Visible languages

In Foundry's settings, **Visible compendium languages** lets each browser show
English packs, French packs, or both. The client-scoped default is both and
preserves V1.0.0 navigation. A hidden language can be restored from the same
setting; hiding affects only the Compendium sidebar and does not unload packs or
break UUID links.

## Documentation

- [Current state and minimal context](docs/STATE.md)
- [Backlog index and per-story contracts](docs/NEXT-PHASE-USER-STORIES.md)
- [Project scope](docs/PROJECT.md)
- [Testing and Foundry smoke test](docs/TESTING.md)
- [Editorial decisions](docs/EDITORIAL-DECISIONS.md)
- [Multi-publication registry and provenance](docs/MULTI-PUBLICATION-REGISTRY.md)
- [Changelog](CHANGELOG.md)
