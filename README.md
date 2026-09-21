# Fallout 2d20 Compendium

Private bilingual English/French compendium module for Fallout 2d20 on Foundry
Virtual Tabletop v14. Version 1.2.0 completes the source-driven French Core Rulebook
localization audit; Astoundingly Awesome Tales coverage remains under remediation.

The project uses readable document sources, reproducible LevelDB packs, automated
quality checks, and GitHub release packaging. English Core plus approved errata is
the canonical mechanical baseline; French content is adapted from official French
sources where available.

## Development

Requirements: Node.js 20 through 24 and npm. Node.js 24 is the release and Foundry
qualification baseline.

```sh
npm ci
npm run ci
```

`npm run ci` is the authoritative local quality and packaging gate. Shared source
documents live under `src/packs/canonical/`; sparse localized values live under
`src/packs/locales/en/` and `src/packs/locales/fr/`. Do not edit generated views or
LevelDB packs.

Publications are declared in `scripts/data/publications.mjs`; provenance and
reprint/variant rules are documented in `docs/MULTI-PUBLICATION-REGISTRY.md`.

## Visible languages

Foundry's **Visible compendium languages** setting lets each client show English,
French, or both. Hiding a language affects navigation only; packs stay registered
and UUID links remain resolvable.

## Documentation

- [Current state and active work](docs/STATE.md)
- [Active US-401 contract](docs/stories/US-401.md)
- [Project scope](docs/PROJECT.md)
- [Canonical source model](docs/CANONICAL-PACK-SOURCES.md)
- [Publication/provenance contract](docs/MULTI-PUBLICATION-REGISTRY.md)
- [Durable editorial decisions](docs/EDITORIAL-DECISIONS.md)
- [Testing and Foundry qualification](docs/TESTING.md)
- [Changelog](CHANGELOG.md)

Agent workflows are packaged as progressive-disclosure skills under `.agents/skills/`.
Historical audits, completed stories and decision snapshots live under `archive/`
and should be read only when historical evidence is required.
