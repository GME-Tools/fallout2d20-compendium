# V1 local acceptance report

## Environment

- Date: 2026-09-07
- Foundry VTT: 14.367
- Fallout system: 11.17.1
- Languages reviewed: English and French

## Result

Local human acceptance passed.

Every section of `docs/V1-LOCAL-ACCEPTANCE.md` was exercised successfully: module and compendiums, drag and drop, mechanics, bilingual links and content, and visual presentation.

The first review identified four actionable gaps:

1. pack folders still carried Core-specific names;
2. localized ammunition could be lost after opening an owned weapon sheet;
3. recipe descriptions lacked some useful document links;
4. Random Publication did not draw the matching issue table.

All four were corrected. The final retest confirmed that French plasma ammunition remains selected and is consumed after editing the weapon, and that Random Publication performs its nested issue draw. The reviewer accepted all other checks without reservation.

## Automated evidence after corrections

- 2,764 root documents validated with no errors or warnings;
- 37 test files passed;
- 5,532 records verified across 40 Foundry v14 LevelDB packs;
- release archive verified: 967 files, 19 MiB.

All V1 release gates are satisfied. Deployment on the Oracle Foundry host will validate the published package after release.
