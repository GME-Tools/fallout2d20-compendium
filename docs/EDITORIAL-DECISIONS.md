# Durable editorial decisions

Keep only human decisions that can affect future work and cannot be derived reliably
from canonical data, registries, validators or tests. Publication-specific facts should
normally live in source provenance, machine-readable inventories or regression tests.

| Area | Durable decision |
| --- | --- |
| Canon | English Core plus current approved errata is the canonical mechanical baseline; official French is adapted to that canon. |
| Scope | Publish reusable structured game elements. Exclude scenes, pregenerated characters and general adventure/rules prose unless explicitly approved otherwise. |
| Packs | Packs are categorical, bilingual and product-line-wide; do not create publication-specific packs. |
| Provenance | `system.source` is the first structured appearance when supported. Secondary identical appearances use structured provenance flags; mechanically different variants are separate reviewed documents. |
| Links | Cross-compendium references target this module's matching language pack, not the Fallout system Core compendiums. |
| Language visibility | Visibility is client-scoped (`both`, `en`, `fr`); hidden packs remain registered and UUID-resolvable. |
| Variants | Prefer an official/mechanical qualifier for distinct homonyms; otherwise use an approved localized publication qualifier. Never suffix an identical reprint. |
| Artwork sources | Use owned official PDFs, owner-supplied official assets, or other explicitly approved Modiphius/Bethesda assets. Do not use fan/web/generated artwork unless explicitly approved. |
| Artwork state | Every document uses `dedicated`, `shared`, or `placeholder`; sharing must be genuinely representative and traceable. |
| French physical values | Where the French Core convention applies, use exact `kg = lb / 2`; automated tests are authoritative for covered fields. |
| Source architecture | Shared mechanics live once in `src/packs/canonical/`; EN/FR differences live in sparse overlays. Generated language views and LevelDB packs are outputs. |
| Denizens | Creatures and NPCs use the `denizens` pack. Denizen abilities are autonomous embedded Items and may legitimately differ between denizens/publications. |
| Folders | Use durable type/family taxonomies. RollTables may use publication folders; other categorical packs should not reproduce book boundaries merely for provenance. |
| Release gates | Runtime qualification uses the current compatibility contract and repository release gates. Owner authorization is required to tag or publish. |

Before adding a row, ask whether an agent working on an unrelated future publication
could need the decision. If not, encode it closer to the affected data instead.
