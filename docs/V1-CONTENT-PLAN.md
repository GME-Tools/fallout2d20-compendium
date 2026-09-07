# Version 1 content plan

The inventory is organized by book chapter and game-facing document category. Static catalogs record the expected source rows; generated audits report implementation, translation, errata, link, automation, and image status separately.

| Lot | Core pages | Deliverables | State |
| --- | ---: | --- | --- |
| Character creation | 42-81 | Skills, all origin-related traits, perks, starting-equipment references | Complete and inventoried |
| Equipment | 84-188 | Equipment, mods, ammunition, consumables, books, magazines, miscellany | Complete and inventoried |
| Survival | 190-227 | Diseases, addictions, crafting stations and recipes | Complete and inventoried |
| Denizens | 332-400, 405-418 | Creatures, NPCs, abilities, attacks, inventories and adventure profiles | Complete and inventoried |
| Cross-cutting | All applicable | EN/FR parity, UUID links, automation, square artwork | In progress |

The checked-in inventories are the non-regression references for the Core scope:

- `catalog/v1-core-equipment.json`: 944 draggable documents across 10 equipment packs.
- `catalog/v1-core-survival-and-crafting.json`: 12 addictions, 20 diseases, 6 crafting stations, 339 recipe rows, and the Core random tables.
- `catalog/v1-core-denizens.json`: 80 abilities, 40 creatures and 35 NPCs, including all 9 distinct profiles introduced by the adventure.
- `catalog/v1-core-character-creation.json` and `catalog/v1-core-starting-equipment.json`: character-creation and starting-package quality-control inventories.

Starting packages and personal-item selections are not published as RollTables. The 29 genuinely random Core tables are included in each language: trinkets, publications and magazine issues, diseases, scavenging loot, Vault encounters, and Commonwealth encounters. Inventories are updated manually with `node scripts/snapshot-core-inventories.mjs` only after source review; the rebuild never rewrites its own expected results.

The character-creation review also restores Fallout dice symbols lost by PDF text extraction and applies the cumulative Armorer, Gun Nut, Barbarian, Vault Kid, and Super Mutant Skirmisher errata. These corrections are a deterministic rebuild step and are covered by exact regression tests.

## Cross-cutting progress

- UUID links and supported magazine automation: complete. All 95 magazine/perk pairs are reciprocally linked in each language, recipe ingredient links resolve locally, and embedded provenance no longer depends on the Fallout system's own Core compendiums.
- Random tables: complete. Each language contains all 29 genuinely random Core tables; Random Publication recursively draws a specific issue for the ten multi-issue series.
- Mechanical fields: present for weapons, modifications, consumables, perk requirements, recipes, and embedded actor attacks; semantic smoke testing in Foundry remains required.
- Artwork: policy and technical classification complete. Of 1,382 canonical English documents, 611 have dedicated artwork, 227 use an approved relevant shared illustration, and 544 retain a tracked placeholder pending suitable book/game artwork. The 28 additional RollTables use Foundry's standard d20 placeholder.
- Foundry qualification: automated pack/package verification, isolated local server startup, headless browser acceptance and final human visual review on Foundry 14.367 are complete. Oracle will validate the published package after release and is not a V1 release gate.

## Editorial debt burn-down

The generated content audit now ignores embedded LevelDB records when counting root documents, compares editorial text independently from generated recipe sections, detects untranslated `effect` and `summary` fields, and flags known PDF extraction bleed markers. Its 2026-09-06 baseline contained 448 actionable occurrences: 388 untranslated root text fields and 60 extraction-bleed documents. The robot, apparel-mod, consumable, miscellany, creature-ability and extraction-cleanup lots reduced the current total to zero. CI now requires the actionable issue count to remain zero.
