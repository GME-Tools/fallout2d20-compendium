# Current project state

- Current release: `1.1.0`, tag `v1.1.0`.
- Released V1 work is summarized by the stable baseline below; completed story
  contracts and transient qualification reports have been removed.
- Completed milestone: V1.1.0 GM Toolkit and Starter Set, US-301 through US-306.
- Qualified matrix at V1.1.0: Foundry 14.367, Fallout 11.17.1, Node 24.20.0.
- The latest and prior compatibility pairs coincide; the disposable-world
  browser suite passed all 40 table draws,
  imports, sheets, embedded Items, drag/drop and UUID resolution.
- Release gate policy: latest stable compatible v14/Fallout pair plus the prior
  pair while available; Oracle is pre-release unless the owner documents a
  waiver. V1.0.2 received an explicit owner waiver after local qualification.

## Stable baseline

- 36 categorical bilingual packs (18 per language); creatures and NPCs share
  the `denizens` pack.
- 1,323 root documents per language; 2,646 total. Denizen abilities remain
  embedded in their Actors.
- 6,202 compiled LevelDB records across 36 packs.
- 40 RollTables per language, including the GM Toolkit and Starter Set tables.
- 3,620 audited French weight/capacity fields.
- 30 Core RollTable placeholders mirrored in French remain tracked artwork
  debt; the 10 V1.1.0 tables intentionally retain the neutral die icon.
- Pack sources use one shared canonical tree plus sparse EN/FR overlays. The 36
  language-specific source views and LevelDB packs are generated, and embedded
  canonical dependencies are resolved from language-neutral references.
- Relevant packs use generated bilingual taxonomic folders; flat packs include
  addictions, ammunition, crafting stations, diseases, miscellany, robot
  modules, skills and traits.

## Read next

V1.1.0 is complete. Await owner direction before opening the next milestone.
Retired tooling and historical evidence live under `archive/` and are excluded
from normal agent context.
