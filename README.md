# Fallout 2d20 Compendium

Private bilingual English/French compendium module for Fallout 2d20 on Foundry Virtual Tabletop v14. Version 1 focuses on the Core Rulebook; later versions may add other Fallout 2d20 publications.

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

Do not edit generated packs. Authoritative documents live under `src/packs/en/` and `src/packs/fr/`, one JSON file per Foundry document.

## Documentation

- [Project scope](docs/PROJECT.md)
- [Testing and Foundry smoke test](docs/TESTING.md)
- [Foundry v14 qualification](docs/V14-QUALIFICATION.md)
- [Editorial decisions](docs/EDITORIAL-DECISIONS.md)
- [Generated content audit](reports/content-audit.md)
- [Version 1 content plan](docs/V1-CONTENT-PLAN.md)
- [Changelog](CHANGELOG.md)
