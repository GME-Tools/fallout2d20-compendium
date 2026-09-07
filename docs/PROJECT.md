# Project scope and architecture

## Long-term purpose

This module is the bilingual Fallout 2d20 Compendium. Its identity and technical architecture are not tied to one publication. Content from later sourcebooks may be added in future versions, with each document retaining explicit source provenance.

## Version 1 objective

Version 1 provides every reusable, structured game element from the Fallout 2d20 Core Rulebook in English and French. The English February 2023 digital release is canonical for this source, with Errata Log V6 (2026) applied before French adaptation.

Included content covers items, traits, perks, skills, equipment, mods, consumables, addictions, diseases, creature abilities, creatures, NPCs, and rollable tables. Full element-specific descriptions are retained when present. Equipment referenced by character archetypes must exist in its normal pack and in the relevant roll table.

Origins remain a manually entered actor field because the Fallout system does not expose them as a supported Item type. Every selectable or origin-granted trait is provided as a draggable Item in both languages; the module does not add an origin assistant.

Scenes, pregenerated characters, general rules journals, and non-Core supplements are excluded.

## Compatibility

- Foundry Virtual Tabletop v14 and later; earlier versions are not supported.
- Current Fallout system, initially pinned to 11.17.1 or later.
- No dependency on Babele or the retired `fallout-fr` module.

## Content model

- `src/packs/en/` and `src/packs/fr/` are the editable sources.
- Each document is stored as formatted JSON in a `<pack>.db` directory.
- `packs-v14/` is generated LevelDB output and must never be edited manually.
- English and French packs are separate and grouped by language in Foundry. Pack and folder names remain publication-neutral so later books can extend them.
- IDs remain stable across edits and paired EN/FR documents reuse the same document ID in their respective packs. Cross-document references must use UUIDs rather than names.
- Source provenance and errata review state live under `flags.fallout2d20-compendium.source`. Registered publications, first and secondary appearances, and folder/catalog conventions are defined in `docs/MULTI-PUBLICATION-REGISTRY.md`.
- The current Fallout system's Core documents provide a v14-compatible technical baseline. They remain subject to line-by-line PDF and errata review and are not treated as editorial authority.

## Image policy

Images are square WebP files. The preferred maximum is 150 KiB; 300 KiB is the exceptional ceiling. Each document carries one explicit status: `dedicated`, `shared`, or `placeholder`. A shared illustration is acceptable for variants, components, associated magazine perks, and other entries for which the same source artwork is genuinely representative. Placeholders remain listed in `reports/missing-core-artwork.md` until suitable book/game artwork is supplied. Paired EN/FR documents always share the same image and classification.

## Definition of done for a content lot

1. Every applicable Core Rulebook row is represented in the inventory matrix.
2. English values match the errata-corrected canonical source.
3. French content is complete and mechanically equivalent.
4. Images satisfy the image policy or carry a documented exception.
5. UUID links resolve and supported automation is configured.
6. Validation, unit tests, pack generation, and packaging succeed.
7. The lot has been opened and smoke-tested in Foundry v14.
