# V1 local acceptance checklist

This review covers the behavior and presentation that automated tests cannot reliably judge. Run it in a disposable Foundry world before the Oracle qualification and the first release candidate.

## Test environment

- Foundry VTT 14.367.
- Fallout system 11.17.1 or later.
- The current checkout installed as `Data/modules/fallout2d20-compendium`.
- A disposable world using the Fallout system, with only this module enabled if practical.
- Test once with Foundry set to English and once with Foundry set to French.

Close Foundry before running `npm run build`, because Foundry locks the compiled LevelDB packs. Restart Foundry after the build, enable the module, and reload the world.

Record the exact Foundry and Fallout system versions used.

## Acceptance checks

### Module and compendiums

- [ ] The module enables without an error notification or browser-console error.
- [ ] All 40 compendiums appear: 20 under `English` and 20 under `Français`.
- [ ] No starting-equipment or personal-item RollTable is present.
- [ ] Each language contains 29 Core RollTables: trinkets, publications and magazine issues, diseases, scavenging loot, Vault encounters, and Commonwealth encounters.
- [ ] Open at least one document from every pack; sheets render without an exception or visibly broken field.

### Drag and drop

- [ ] Import one EN creature and one FR creature into the Actors directory.
- [ ] Import one EN NPC and one FR NPC into the Actors directory.
- [ ] Their embedded attacks, abilities, inventory, names, icons, and mechanical values survive the import.
- [ ] Drag representative weapons, ammunition, apparel, mods, consumables, traits, perks, and conditions onto compatible Fallout actors.
- [ ] The resulting embedded Items open normally and retain their descriptions, effects, images, and mechanical fields.

### Mechanics

- [ ] Make a test attack with a firearm and confirm its skill, attribute, damage, damage type, effects, range, rate and ammunition are plausible.
- [ ] Make a test attack with a melee weapon and confirm its damage, effects and derived fields are plausible.
- [ ] Equip armor and confirm locations, resistances and mod slots behave as expected.
- [ ] Add a weapon mod and an apparel mod; confirm the system accepts them and exposes the intended fields.
- [ ] Add a consumable and exercise any action exposed by its sheet; confirm effects and duration text are coherent.
- [ ] Open several ranked perks and verify requirements, ranks and cumulative errata are readable.
- [ ] Draw several results from each trinket table and confirm that the result range and displayed text are correct.

### Links and bilingual content

- [ ] Click links in representative weapon, mod, recipe, magazine and actor descriptions; each resolves to a document in the same language.
- [ ] Check at least one magazine from several series and its linked temporary perk in both languages.
- [ ] Check several recipes: ingredients, quantities, required perk/rank and crafting station must be understandable.
- [ ] Compare a representative EN/FR pair in each major category. The French may be idiomatic, but must preserve the errata-corrected English meaning and rules.
- [ ] Check the adventure-only NPCs and their biographies in both languages.
- [ ] No obvious page header, footer, table fragment or adjacent entry remains in descriptions.

### Visual review

- [ ] Inspect at least 30 documents spread across every artwork category and both languages.
- [ ] Images are square, correctly oriented, legible at sheet and compendium sizes, and do not show accidental crops or unrelated subjects.
- [ ] Shared images remain relevant to every document using them.
- [ ] Placeholders are acceptable for this pass when no suitable source exists; do report a dedicated image that is incorrect or poorly cropped.
- [ ] Long descriptions, lists, headings and inline document links remain readable in the Fallout sheets.

## Reporting a failure

For each failure, provide:

1. language, pack, and exact document name;
2. action performed;
3. expected and observed result;
4. screenshot when visual, plus the relevant browser-console error when technical.

Also provide a simple pass/fail for each section above. Placeholder requests can be supplied separately as source images; the current generated inventory is `reports/missing-core-artwork.md`.

## Exit criterion

Local acceptance is complete when every section passes or every remaining failure has an explicit editorial decision. The next project lot is then Oracle deployment qualification, followed by the release-candidate and GitHub release workflow.
