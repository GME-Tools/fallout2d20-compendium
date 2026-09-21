# Project scope

## Purpose

This repository is the bilingual English/French Fallout 2d20 compendium module.
It is product-line-wide rather than tied to one publication. New sourcebooks extend
the existing categorical packs while retaining explicit provenance.

## Content scope

Publish reusable structured game elements supported by the Fallout system: Items,
Actors with their embedded Items, and genuinely random RollTables. Keep complete
mechanical profiles and element-specific descriptions when the source provides them.

Do not publish scenes, maps, pregenerated characters, general rules/adventure prose,
or custom assistants solely to reproduce book workflows unless an approved story
explicitly adds them. Actor origins remain manual text because the system does not
expose them as a supported Item type.

English Core plus approved errata is the mechanical baseline for shared Core content.
French Core uses the official French source adapted to that canon. Publication-specific
authority and translation status belong in the publication registry and active story.

## Architecture

- Editable shared mechanics: `src/packs/canonical/`.
- Sparse localized values: `src/packs/locales/<language>/`.
- Disposable readable views: `generated/source-packs/`.
- Generated Foundry LevelDB: `packs/`.
- Publication metadata: `scripts/data/publications.mjs`.
- Folder taxonomy: `scripts/data/pack-folders.mjs`.

See `docs/CANONICAL-PACK-SOURCES.md` for source/reference mechanics and
`docs/MULTI-PUBLICATION-REGISTRY.md` for provenance, reprints and variants.
Runtime compatibility is defined by `runtime/compatibility.mjs` and enforced by tests.

IDs and `_key` values are stable publication identity. Paired EN/FR documents reuse
the same document ID in their respective language packs unless an explicitly approved
migration says otherwise.

## Artwork

Use square WebP assets and record `dedicated`, `shared`, or `placeholder`. EN/FR pairs
share the same image and classification. Source authorization and sharing rules live
in `docs/EDITORIAL-DECISIONS.md`; reviewed inventories/tests are authoritative for
document-level assignments.

## Definition of done for a content lot

1. The approved source inventory covers every in-scope structured element.
2. Canonical mechanics and localized text match the approved source/errata authority.
3. Provenance, variants, references, IDs and bilingual parity validate.
4. Artwork has a reviewed status or explicit tracked placeholder.
5. Focused regression tests pass and the story-required final repository gate passes.
6. Runtime-affecting lots pass the required disposable Foundry qualification.
