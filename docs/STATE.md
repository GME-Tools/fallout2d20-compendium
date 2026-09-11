# Current project state

- Current development version: `1.2.0` (unreleased); current release remains `1.1.2`, tag `v1.1.2`.
- Released V1 work is summarized by the stable baseline below; completed story
  contracts and transient qualification reports have been removed.
- Current milestone: V1.2.0 Astoundingly Awesome Tales issues 1–7, US-401.
- Qualified matrix at V1.1.2: Foundry 14.367, Fallout 11.17.1, Node 24.20.0.
- The latest and prior compatibility pairs coincide; the disposable-world
  browser suite passed all 42 table draws,
  imports, sheets, embedded Items, drag/drop and UUID resolution.
- Release gate policy: latest stable compatible v14/Fallout pair plus the prior
  pair while available; Oracle is pre-release unless the owner documents a
  waiver. V1.0.2 received an explicit owner waiver after local qualification.

## Stable baseline

- 36 categorical bilingual packs (18 per language); creatures and NPCs share
  the `denizens` pack.
- 1,389 root documents per language; 2,778 total. Denizen abilities remain
  embedded in their Actors.
- 7,234 compiled LevelDB records across 36 packs.
- 46 RollTables per language, including the generic Hit Locations table, the
  Mister Handy Hit Locations table, both
  specialized tables added by Errata V6, and the GM Toolkit and Starter Set tables.
- 3,879 audited French weight/capacity fields; non-physical Items are rejected
  when they carry a non-zero weight.
- 34 Core RollTable placeholders mirrored in French remain tracked artwork
  debt; the 10 V1.1.0 tables intentionally retain the neutral die icon.
- Pack sources use one shared canonical tree plus sparse EN/FR overlays. The 36
  language-specific source views and LevelDB packs are generated, and embedded
  canonical dependencies are resolved from language-neutral references.
- Relevant packs use generated bilingual taxonomic folders; flat packs include
  addictions, ammunition, crafting stations, diseases, miscellany, robot
  modules, skills and traits.

## Read next

V1.2.0 is not ready for qualification. The contradictory PDF audit in
`docs/stories/US-401-AUDIT.md` found missing structured content, incorrect
first-appearance provenance, unverified reprint equivalence and cover images
misclassified as reviewed document artwork. The earlier CI and disposable-world
startup pass only validated the incomplete imported set; they are not evidence
of editorial completeness. Remediate US-401, then rerun CI and qualification.
Retired tooling and historical evidence live under `archive/` and are excluded
from normal agent context.
