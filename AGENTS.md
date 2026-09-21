# Repository instructions

## Minimal context

Start with this file and `docs/STATE.md`. If `docs/STATE.md` points to
`docs/WORK.md`, read it only when the requested task overlaps that active work.
For simple or one-off tasks, do not create a planning document.

Read task-specific contracts only when needed. Use targeted searches and narrow
excerpts; do not load generated outputs or broad inventories without a reason.

## Sources of truth

- Shared mechanics and structure: `src/packs/canonical/`.
- Localized values: `src/packs/locales/en/` and `src/packs/locales/fr/`.
- Publication registry: `scripts/data/publications.mjs`.
- Reviewed machine-readable inventories: `catalog/`.
- Data/source/provenance contract: `docs/DATA-MODEL.md`.
- Durable human decisions: `docs/EDITORIAL-DECISIONS.md`.
- Generated readable views: `generated/source-packs/`; never edit or commit them.
- Generated Foundry LevelDB: `packs/`; never edit it directly.

## Working rules

- Work only on the requested task and preserve user changes.
- Preserve published IDs, `_key` values and UUID inputs unless explicitly authorized
  to migrate them.
- Never resolve genuine editorial ambiguity silently. Ask the owner only when it
  blocks the requested edit; otherwise record it in the active work and continue.
- Prefer data, registries, validators and regression tests over duplicated prose.
- Use repository skills under `.agents/skills/` for specialized workflows.
- Create `docs/WORK.md` only for work that genuinely spans multiple sessions or has
  a substantial unresolved checklist. Delete it when the work is complete after
  moving durable facts into data, tests, registries or editorial decisions.

## Verification and external actions

Run focused checks while iterating and the smallest sufficient final gate. Run
`npm run ci` when the task or handoff requires the full repository gate. Use only
a dedicated/disposable Foundry world for runtime checks and bind local smoke tests
to loopback.

Do not tag, publish, deploy, release, or change qualification/repository release
state without explicit owner authorization for that action. Report concise results
and artifact paths instead of dumping generated contents.
