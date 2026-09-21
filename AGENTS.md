# Repository instructions

## Minimal context

Start with this file and `docs/STATE.md`. Follow the active story linked from
`docs/STATE.md` and read only the contracts that the task actually requires.
Use targeted searches and narrow excerpts. Do not inspect `archive/`, generated
outputs, broad inventories, or unrelated stories unless historical evidence is
required.

## Sources of truth

- Shared mechanics and structure: `src/packs/canonical/`.
- Localized values: `src/packs/locales/en/` and `src/packs/locales/fr/`.
- Publication registry: `scripts/data/publications.mjs`.
- Reviewed machine-readable inventories: `catalog/`.
- Generated readable views: `generated/source-packs/`; never edit or commit them.
- Generated Foundry LevelDB: `packs/`; never edit it directly.

Use `docs/CANONICAL-PACK-SOURCES.md` for source-model details,
`docs/MULTI-PUBLICATION-REGISTRY.md` for provenance/reprint rules, and
`docs/EDITORIAL-DECISIONS.md` only for durable decisions not encoded by tests
or data.

## Working rules

- Work only on the requested story or maintenance task and preserve user changes.
- Preserve published IDs, `_key` values and UUID inputs unless the active story
  explicitly authorizes a migration.
- Never resolve genuine editorial ambiguity silently. If it blocks the requested
  edit, ask the owner; otherwise record it and continue non-blocked work.
- Prefer executable contracts (tests, validators, registries) over duplicated prose.
- Use repository skills under `.agents/skills/` for publication audits, content
  integration, Foundry qualification, and releases instead of loading all workflow
  documentation up front.

## Verification and external actions

Run focused checks while iterating and the smallest sufficient final gate. Run
`npm run ci` when the active story or handoff requires the full repository gate.
Use only a dedicated/disposable Foundry world for runtime checks and bind local
smoke tests to loopback.

Do not tag, publish, deploy, release, or change qualification/repository release
state without explicit owner authorization for that action. Report concise results
and artifact paths instead of dumping generated contents.
