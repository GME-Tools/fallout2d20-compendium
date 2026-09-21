# Active work — Core Rulebook certification

> Temporary execution checkpoint. Astoundingly Awesome Tales remediation is paused
> while this owner-requested Core certification is active. Do not resume AAT work
> until this file is replaced or removed.

## Goal and authority

Certify the reusable structured content of the *Fallout: The Roleplaying Game Core
Rulebook* exhaustively in English and French.

Mechanical authority is the February 2023 English Core Rulebook plus the latest
approved Errata V6 (2026). The official French Core Rulebook is the localization
authority for names, descriptions and terminology, adapted when necessary to the
canonical EN + Errata mechanics.

Audit direction is strictly:

`PDF source -> Errata -> expected inventory -> canonical -> locale EN -> locale FR`

Existing packs, catalogs and tests are evidence to inspect, never the starting
authority for expected content.

## Certification inventory

The source-driven durable inventory is
`catalog/core-rulebook-certification.json`. It records page review coverage plus
in-scope and explicitly excluded structured candidates. Do not generate it from
existing packs.

Current completed boundary:

- EN PDF physical pages 1–62, through printed/source page 60.
- FR PDF physical pages 1–63, through printed/source page 60.
- Completed editorial sections: front matter, Introduction, Chapter One (Core
  Rules / Règles du jeu), Chapter Two (Combat), Chapter Three through Step 3
  (source pp.42–58), and Step 4 / the perk catalogue through source p.60.
- Because the EN and FR perk catalogues are alphabetized independently, bilingual
  identity checks for the p.59–60 lot also reviewed targeted counterpart entries on
  later pages without treating those intervening pages as page-certified coverage.
- Verified in-scope documents in this range: the three p.28 hit-location RollTables,
  all 17 Core Skill Items (source pp.44–47), all 10 Core origin/survivor Trait Items
  (pp.51–57), the Mister Handy p.54 hit-location RollTable, and the p.54 Buzz-Saw
  and Pincer item profiles.
- Static rules summaries/reference tables and general rules prose in this range are
  explicitly out of scope in the catalog.
- Errata reviewed in this range: p.20 Luck wording (Q3 2026), p.28 quadruped/flying
  insect hit locations, p.29 Random Quantities, and the p.44 Skills Summary Gauss
  correction.
- Skill provenance pages were tightened from the old generic `44-46` range to each
  detailed skill's actual source page.
- Corrected the French Energy Weapons description: the earlier integration had
  over-applied the p.44 Skills Summary errata and removed the official French
  detailed-text references to Gauss weapons. The errata only removes Gauss from the
  summary table; the canonical EN detailed description still includes them.
- The official FR p.28 flying-insect table combines 15–20 as `Pattes`; canonical
  EN + Errata retains 15–17 and 18–20 as two rows. The FR overlay correctly
  localizes both canonical rows to `Pattes`.
- Source pp.51–57 exposed several older FR paraphrase/extraction defects. Restored
  official French wording for The Chain that Binds, Necrotic Post-Human,
  Mister Handy Robot, Heavy Handed, Small Frame and Vault Kid while retaining
  canonical mechanical corrections where required (notably Vault Kid errata and
  the EN-authoritative alternative in Necrotic Post-Human).
- The p.54 Buzz-Saw and Pincer are first fully defined as Mister Handy arm
  attachments and are now sourced/certified there. Their French descriptions were
  replaced with the official p.54 text and combat-die symbols.
- The p.54 10mm Auto Pistol, Flamer and Laser Emitter rows are certified only as
  structured references to existing weapon identities; their full profiles remain
  pending until the equipment pages that define those profiles.
- Step 4 source pp.59–60 now certifies 15 bilingual perk identities encountered on
  those EN/FR pages: Action Boy/Girl, Adamantium Skeleton, Adrenalin Rush, Animal
  Friend, Aquaboy/Aquagirl, Armorer, Awareness, Barbarian, Basher, Better
  Criticals, Blitz, Center Mass, Lead Belly, Rad Resistance and Smooth Talker.
  The certification inventory records the actual EN and FR source coordinates for
  each identity because their alphabetical order differs by language.
- Perk provenance is being tightened from the legacy generic `59-73` range to each
  perk's first EN definition page as it is source-certified. The first lot also
  fixed exact EN slash-spacing for Action Boy/Girl and Aquaboy/Aquagirl and
  restored missing combat-die markup in Animal Friend, Blitz and Lead Belly.
- Armorer's 2021 level-increase erratum is present and structured as +4 levels per
  rank. Barbarian applies the Q1 2025 erratum in both languages, increasing Energy
  DR at the same rate as Physical DR even though the printed French page only lists
  ballistic DR.

## Next lot

Continue Chapter Three — Character Creation at printed/source page 61. The next
editorial sub-lot is the perk catalogue on source pp.61–64. Continue from the PDF
source rather than the existing perk pack; use targeted counterpart-page checks
where EN/FR alphabetical ordering differs.

Known later Core suspects to re-check against source rather than assume true:

- Boosted Capacitor cost.
- `Capactor Boosting Coil` / `Capacitor Boosting Coil` duplicate.
- Shielded Barrel crafting/recipe handling.
- Denizen Actor and embedded-Item completeness, especially salvage/butchery.

There are no unresolved anomalies or owner decisions in the completed p.1–58
boundary.

## Validation

`test/core-certification.test.mjs` enforces gapless page review through the current
boundary, explicit scope/status fields, bilingual identity/provenance for verified
entries, exact Skill and origin-Trait identities/source pages, the p.54 Mister Handy
attachment mechanics/localization, targeted FR source-text regressions, and absence
of unexplained Core documents with exact provenance within the certified boundary.
It now also checks the first 15 certified perk identities, their bilingual source
coordinates, exact canonical requirement fields, restored combat-die symbols, and
the Armorer/Barbarian errata regressions. Legacy broad provenance ranges are not
treated as exact page evidence until the corresponding perk is source-certified.

Run focused checks as each lot is added. Final completion still requires
`npm audit --audit-level=high`, `npm run ci`, and disposable Foundry qualification
on the required compatibility matrix. Only after the whole Core is certified should
`docs/STATE.md` be updated and this temporary file removed.
