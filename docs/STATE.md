# Current project state

- Current release: `1.2.0`, tag `v1.2.0`.
- Active work: post-V1.2.0 remediation of Astoundingly Awesome Tales issues 1–7.
- Active contract: [`docs/stories/US-401.md`](stories/US-401.md).
- Qualified V1.2.0 matrix: Foundry 14.367, Fallout 11.17.1, Node 24.20.0.
- V1.2.0 was released with an explicit owner waiver for known AAT completeness,
  provenance and artwork debt; it does not claim complete AAT coverage.

## Stable baseline

- 36 categorical bilingual packs (18 per language).
- 1,389 root documents per language; 2,778 total.
- 7,260 compiled LevelDB records across 36 packs.
- 46 RollTables per language.
- 3,880 audited French weight/capacity fields.
- Sources use one canonical tree plus sparse EN/FR overlays; generated language
  views and LevelDB packs are outputs, not editable sources.
- Creatures and NPCs share the `denizens` pack; denizen abilities remain embedded.

These exact statistics are checked by `npm run state:check`; tests and registries
are authoritative for detailed inventories and compatibility contracts.

## Current blocker

US-401 remains incomplete. Its active story contains the consolidated remediation
checklist derived from the contradictory PDF audit. Historical inventories, audits,
completed stories and qualification evidence live under `archive/` and are not
normal agent context.

Read `AGENTS.md` first, then this file, then only the active story or task-specific
contract.
