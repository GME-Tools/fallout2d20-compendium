# Project scope and architecture

## Long-term purpose

This module is the bilingual Fallout 2d20 Compendium. Its identity and technical architecture are not tied to one publication. Content from later sourcebooks may be added in future versions, with each document retaining explicit source provenance.

## Version 1 objective

Version 1 provides every reusable, structured game element from the Fallout 2d20 Core Rulebook in English and French. The English February 2023 digital release is canonical for this source, with Errata Log V6 (2026) applied before French adaptation.

Included content covers items, traits, perks, skills, equipment, mods, consumables, addictions, diseases, denizens (creatures and NPCs with autonomous embedded abilities), and rollable tables. Full element-specific descriptions are retained when present. Equipment referenced by character archetypes must exist in its normal pack and in the relevant roll table.

Origins remain a manually entered actor field because the Fallout system does not expose them as a supported Item type. Every selectable or origin-granted trait is provided as a draggable Item in both languages; the module does not add an origin assistant.

Scenes, pregenerated characters, general rules journals, and non-Core supplements are excluded.

## Compatibility

- Foundry Virtual Tabletop v14 and later; earlier versions are not supported.
- Current Fallout system, initially pinned to 11.17.1 or later.
- No dependency on Babele or the retired `fallout-fr` module.

## Content model

- `src/packs/canonical/` is the single editable source for shared document
  structure and mechanics. Sparse language overlays live under
  `src/packs/locales/<language>/`.
- `generated/source-packs/` contains disposable readable EN/FR views rebuilt by
  repository commands; it must never be edited or committed.
- Each RollTable source file contains its embedded results. Result `_id` and
  `_key` values remain explicit and stable; the pack build writes them to
  Foundry's `tables.results` LevelDB sublevel.
- Canonical cross-pack references use `$ref` plus sparse `$overrides`. The build
  resolves them recursively, including Actor abilities/equipment and weapon
  mods, so changes to a referenced document propagate unless an instance field
  is explicitly overridden.
- `packs/` is generated Foundry v14 LevelDB output and must never be edited manually.
- English and French packs are separate and grouped by language in Foundry. Pack and folder names remain publication-neutral so later books can extend them.
- IDs remain stable across edits and paired EN/FR documents reuse the same document ID in their respective packs. The documented migration from `creatures` and `npcs` to `denizens` is the sole current pack-ID exception. Source links are language-neutral; materialization emits the language-specific UUIDs required by Foundry.
- `scripts/data/pack-folders.mjs` is the authoritative bilingual folder
  taxonomy. Folder IDs are deterministic and language-neutral; labels are
  localized at build time. Packs explicitly excluded from the taxonomy remain
  flat.
- Source provenance and errata review state live under `flags.fallout2d20-compendium.source`. Registered publications, first and secondary appearances, and folder/catalog conventions are defined in `docs/MULTI-PUBLICATION-REGISTRY.md`.
- The current Fallout system's Core documents provide a v14-compatible technical baseline. They remain subject to line-by-line PDF and errata review and are not treated as editorial authority.

## Image policy

Images are square WebP files. The preferred maximum is 150 KiB; 300 KiB is the exceptional ceiling. Each document carries one explicit status: `dedicated`, `shared`, or `placeholder`. A shared illustration is acceptable when the same source artwork is genuinely representative. The reviewed inventory and contact sheet under `artwork/inventory/` track remaining placeholders. Paired EN/FR documents always share the same image and classification.

## Definition of done for a content lot

1. Every applicable Core Rulebook row is represented in the inventory matrix.
2. English values match the errata-corrected canonical source.
3. French content is complete and mechanically equivalent.
4. Images satisfy the image policy or carry a documented exception.
5. UUID links resolve and supported automation is configured.
6. Validation, unit tests, pack generation, and packaging succeed.
7. The lot has been opened and smoke-tested in Foundry v14.
