# Repository instructions

## Context budget

Start with this file and `docs/STATE.md`. Read only the requested story under
`docs/stories/` and the contracts listed by that story. Do not read archived
handoffs, completed-story reports, generated JSON inventories, or unrelated
stories unless a concrete question requires them. Use targeted `rg` searches
and narrow excerpts; do not dump large JSON, pack lists, or full diffs.

## Scope and authority

- Work on one explicitly requested story or maintenance task at a time.
- Do not begin a later story implicitly.
- Preserve user changes and check Git status before editing.
- Ask the owner about genuine editorial ambiguity before changing content.
- Do not tag, publish, deploy, or alter external state without explicit owner
  authorization for that action.

## Authoritative data

- Editable documents: `src/packs/en/` and `src/packs/fr/`.
- Generated LevelDB: `packs-v14/`; never edit it directly.
- Publication registry: `scripts/data/publications.mjs`.
- Reviewed inventories: `catalog/`; never regenerate them automatically.
- Publication and provenance contract: `docs/MULTI-PUBLICATION-REGISTRY.md`.
- Durable owner decisions: `docs/EDITORIAL-DECISIONS.md`.

## Invariants

- Preserve categorical bilingual packs, stable IDs, `_key` values and UUIDs.
- `system.source` is the first appearance; secondary identical appearances use
  structured flags and do not create another document.
- English errata-corrected Core mechanics are canonical; French uses the
  official text adapted to that canon.
- French Core physical values use exact `kg = lb / 2` where covered.
- Language visibility is client-scoped: `both`, `en`, `fr`; default and fallback
  are `both`; hidden packs remain registered and UUID-resolvable.
- PDFs and temporary extraction inputs remain ignored and uncommitted.

The accepted V1.0.1 baseline is 40 packs, 2,764 root identities, 5,532 compiled
records and 3,565 audited French weight/capacity fields. Tests, rather than
repeated prose, are authoritative for exact hashes and inventories.

## Verification

Run tests proportional to the change. Use focused tests while iterating, then
`npm run ci` once on the final state when the story contract requires it.
Repeat full CI only after a later change can invalidate it. Foundry checks use a
dedicated world or disposable copy, never a user world. Bind local smoke tests
to loopback.

Report concise totals and failures. Refer to artifact paths instead of printing
their complete contents.
