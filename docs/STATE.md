# Current project state

- Current release: `1.0.2`, tag `v1.0.2`.
- Released V1 work is summarized by the stable baseline below; completed story
  contracts and transient qualification reports have been removed.
- Current milestone: V1.1.0 GM Toolkit and Starter Set.
- Qualified matrix at V1.0.2: Foundry 14.367, Fallout 11.17.1, Node 24.20.0.
- Release gate policy: latest stable compatible v14/Fallout pair plus the prior
  pair while available; Oracle is pre-release unless the owner documents a
  waiver. V1.0.2 received an explicit owner waiver after local qualification.

## Stable baseline

- 40 categorical bilingual packs.
- 1,380 root documents per language; 2,760 total.
- 5,546 compiled LevelDB records.
- 29 Core RollTables per language.
- 3,570 audited French weight/capacity fields.
- 30 canonical English RollTable placeholders mirrored in French remain tracked
  artwork debt; V1.0.2 does not claim complete artwork coverage.

## Read next

Select one story in `docs/NEXT-PHASE-USER-STORIES.md`. Its file lists the only
additional contracts normally required. Retired tooling and historical evidence
live under `archive/` and are excluded from normal agent context.
