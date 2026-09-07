# Changelog

All notable changes to this private module are documented here.

## 1.0.0 — 2026-09-07

### Added

- Complete independent English and French Core Rulebook compendiums: 40 packs and 2,764 draggable root documents.
- Core character-creation traits, skills and perks, equipment, modifications, ammunition, consumables, survival content, creatures, NPCs, adventure profiles and all 29 random tables in each language.
- Current Core Rulebook errata corrections with deterministic regression tests.
- Language-local UUID links, crafting recipes, magazine/perk relationships and supported Active Effects.
- Square, size-controlled artwork with explicit dedicated, shared and placeholder classifications.
- Readable JSON sources, deterministic Foundry v14 LevelDB compilation, validation reports and release packaging.
- GitHub Actions CI on Node.js 20 and 23 and release packaging on published tags.
- Foundry 14.367 server and Chromium acceptance scripts.

### Fixed

- Emit embedded Actor items and Item Active Effects in Foundry v14 LevelDB sublevels.
- Restore three missing magazine-perk Active Effects in both languages.
- Rebuild the Fallout ammunition sheet configuration from this module's dedicated ammunition packs when the system-wide discovery remains pending.
- Complete remaining French robot, apparel-mod, consumable, miscellany and generic creature-ability texts.
- Remove PDF extraction bleed from French ammunition, weapons and embedded actor equipment.
- Preserve localized ammunition references when French receiver mods are applied.
- Preserve localized ammunition selections when the Fallout system asynchronously refreshes its ammunition index or an owned weapon sheet is edited.
- Link crafting stations, skills, perks and ingredients from generated recipe descriptions.
- Make Random Publication recursively draw from the matching issue table for the ten multi-issue magazine series.

### Known limitations

- 544 canonical English documents, mirrored by their French equivalents, still use tracked placeholders pending suitable artwork; 28 of the additions are standard RollTable icons.
- Local human acceptance passed on Foundry 14.367 with Fallout 11.17.1. The released package will receive an additional deployment validation on the Oracle host.
