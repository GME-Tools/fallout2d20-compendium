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

- EN PDF physical pages 1–101, through printed/source page 99.
- FR PDF physical pages 1–102, through printed/source page 99.
- Completed editorial sections: front matter, Introduction, Chapter One (Core
  Rules / Règles du jeu), Chapter Two (Combat), and Chapter Three through Step 6
  (source pp.42–81), including the complete Core perk catalogue and starting-equipment section.
- Because the EN and FR perk catalogues are alphabetized independently, bilingual
  identity checks for the perk lots also review targeted counterpart entries on
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
- Source pp.61–64 add 36 certified bilingual perk identities (including the later EN
  counterparts required by the independently alphabetized FR pp.61–64) and the
  fully structured Dogmeat / Canigou Actor from EN p.63 / FR p.61.
- Perk provenance for this lot has been tightened from the legacy `59-73` range to
  exact first EN definition pages. Exact EN source names were restored for
  Black Widow/Lady Killer, Grim Reaper’s Sprint and Party Boy/Party Girl.
- Additional combat-die extraction defects were repaired in EN perk text, including
  Black Widow/Lady Killer, Bloody Mess, Chem Resistant, Commando, Comprehension,
  Concentrated Fire, Finesse, Fortune Finder, Grim Reaper’s Sprint, Laser Commander
  and Scrounger. Ghost's omitted PER 5 requirement was also restored.
- The Dogmeat / Canigou profile is now represented as the existing stable Actor with
  its exact p.63/p.61 stats, Bite and three embedded abilities. The FR Actor no
  longer carries an unrelated generic-dog biography from the later denizen section,
  and the FR Canigou perk no longer duplicates the entire Actor statblock inside its
  description. The damaged FR Canaille extraction was restored to the official
  sentence.
- Gun Nut was checked at EN p.65 and confirmed at 4 ranks in accordance with the
  8 April 2021 erratum. The official FR perk text omitted heavy weapons; the FR
  localization now restores the canonical EN scope of small guns and heavy weapons.
- Source pp.65–68 complete the next page-driven perk lot. Because FR alphabetical
  ordering differs, targeted counterparts on later EN pages were also certified:
  Paralyzing Palm, Pickpocket, Piercing Strike, Quick Hands, Rifleman and Size Matters.
  Those later EN pages are not yet counted as page-reviewed coverage.
- The p.65–68 audit repaired additional EN combat-die extraction tokens in Gunslinger,
  Iron Fist, Meltdown, Mister Sandman, Mysterious Stranger, Nerd Rage!, Ninja, Pain
  Train, Rifleman and Size Matters. Gunslinger also restores the source hyphen in
  “one-handed”.
- The FR Hacker/Pirate entry had swallowed the adjacent general “Faire les poches”
  rules from p.68; the perk is now limited to its actual source text and the general
  pickpocketing rules are explicitly catalogued out of scope.
- The official FR Healer/Guérisseur and Medic/Infirmier perk boxes print “action
  mineure Porter secours”, but the canonical EN rules and the FR combat rules both
  define Porter secours / First Aid as a major action. Both localized perk texts now
  use “action capitale” as a deliberate mechanical adaptation.
- Source pp.69–73 complete the Core perk catalogue page-by-page. All 31 perk
  identities on these final five EN pages have exact first-definition provenance
  and explicit FR counterpart coordinates despite the independently alphabetized
  French catalogue.
- Science! / Scientifique is canonicalized at 4 ranks in accordance with Errata V6;
  the EN book prints 3 ranks while the official FR book already prints 4. Quick
  Hands / Mains lestes was rechecked against the p.70 erratum and both locales
  contain the corrected +2 Fire Rate for 2 AP mechanic.
- Pyromaniac's EN extraction now preserves the source hyphen in “fire-based” and
  restores the combat-die token as `@fos[DC]`.
- Step 5 on source p.74 was reviewed as general character-sheet calculation rules
  and is explicitly out of compendium scope; source p.75 is artwork only. The
  official FR p.74 prints first-level HP as END + CHA while canonical EN uses
  END + LCK. This localization discrepancy is recorded in the certification
  catalogue rather than silently treated as canonical mechanics.
- Step 6 source pp.76–81 is now source-inventoried package by package. The 16
  origin equipment bundles are character-build loadouts rather than standalone
  reusable Foundry documents, so they are explicitly out of compendium scope while
  their complete canonical contents, options, quantities and referenced document
  identities are retained in the certification catalogue.
- Random Trinkets / Babioles aléatoires is a genuine reusable RollTable and is
  certified exactly in both languages at p.80. Personal-trinket Luck recovery,
  the complete 17-row Tag Skill Items mapping, and the higher-level starting-equipment
  table are explicitly source-inventoried as out-of-scope character-build rules.
- Step 6 applies the current errata: Mister Farmhand fertilizer is 1 uncommon
  material; Super Mutant Skirmisher uses a Pipe Gun with Long Barrel and Full Stock
  plus 6 +3 CD .308 rounds. The printed FR Trader package says “Deux brahmines”,
  but canonical EN grants one pack brahmin; the source-localization discrepancy is
  recorded and the canonical quantity is one.
- Source pp.82–83 are closing artwork and the Chapter Four divider and are explicitly
  out of scope. Source pp.84–87 (Obtaining Equipment through Modifying Equipment)
  contain general transaction, rarity, encumbrance and modification procedures rather
  than standalone reusable documents; each subsection is now explicitly catalogued.
- The p.85 Availability rule is canonicalized to LCK from EN; the official FR page
  prints CHA, which is recorded as a localization discrepancy. The p.87 Q3 2026
  erratum is applied so armor's second mod slot is a unique mod rather than the
  printed EN utility mod. The Modified Equipment Names continuation onto p.88 is
  accounted for, and p.88 is independently certified in the weapon-rules lot.
- Source pp.88–94 are certified for the weapon-rules vocabulary and the complete
  ammunition catalogue. The 28 concrete ammunition identities have exact p.91/p.93
  provenance, reviewed bilingual text/weights and the current p.94 Fusion Core
  Scrounger erratum.
- Source pp.95–99 certify all 15 base Small Guns from the p.95 table together with
  their detailed descriptions and accepted-mod lists. The audit found and fixed a
  missing Hardened mod reference on the Assault Rifle, repaired the lost initial
  “T” and several Recoil-Compensating hyphens in EN extraction, and tightened all
  15 weapon provenance records to p.95. The September 2022 p.97–99 mod-list errata
  are applied in both languages. Two FR p.95 mechanical discrepancies are retained
  only as source notes: Fusil d’assaut omits Burst and Fusil à double canon prints
  Fire Rate 1; shared canonical data correctly uses EN Burst and Fire Rate 0.

## Next lot

Continue page-by-page at printed/source p.100 with the Small Gun Mods table. Build
the expected mod inventory and mechanics from the PDFs before comparing repository
data. Apply the cumulative V6 corrections on this page, including the added Full
Capacitors and Capacitor Boosting Coil rows, Large Magazine cost +8, and the Q3 2026
removal of Repair from Shielded Barrel. This is the correct point to re-check the
known Capacitor/Capactor identity issue and Shielded Barrel recipe/provenance without
assuming the existing catalog is correct.

Known later Core suspects to re-check against source rather than assume true:

- Boosted Capacitor cost.
- `Capactor Boosting Coil` / `Capacitor Boosting Coil` duplicate.
- Shielded Barrel crafting/recipe handling.
- Denizen Actor and embedded-Item completeness, especially salvage/butchery.

There are no unresolved anomalies or owner decisions in the completed p.1–75
boundary.

## Validation

`test/core-certification.test.mjs` enforces gapless page review through the current
boundary, explicit scope/status fields, bilingual identity/provenance for verified
entries, exact Skill and origin-Trait identities/source pages, the p.54 Mister Handy
attachment mechanics/localization, targeted FR source-text regressions, and absence
of unexplained Core documents with exact provenance within the certified boundary.
It now also checks explicit source classification and canonical rule notes through p.99, including the EN LCK/FR CHA Availability discrepancy, the Q3 2026 unique-mod erratum, the source-derived weapon-rule vocabulary and Fire Rate/range contract from pp.88–90, the complete 28-identity ammunition inventory with p.91/p.93 provenance, source quantities/costs/rarities, FR weight conversion, syringe mechanics, and the p.94 Fusion Core Scrounger erratum, plus all 15 p.95 Small Guns with exact mechanics, weights, ammunition, accepted-mod identities, EN extraction repairs, p.97–99 errata and the two documented FR p.95 mechanical discrepancies. It checks the complete Step 6 source inventory through p.81, including all 16 equipment bundles and their bilingual referenced identities, current Farmhand/Skirmisher errata, the Trader FR quantity discrepancy, exact Random Trinkets results, all Tag Skill Item rows and the higher-level starting-equipment table. It also checks the certified perk identities through source p.64 plus targeted
bilingual counterparts, their exact source coordinates and canonical requirement
fields, restored combat-die symbols, source-exact EN names, the Armorer/Barbarian
and Gun Nut errata regressions, the p.65–68 exact perk source/requirements contract,
FR Gun Nut/First Aid adaptations, Hacker extraction regression, the complete
Dogmeat / Canigou Actor including embedded Bite and abilities, and the final
p.69–73 31-perk inventory with exact bilingual coordinates plus Science!, Quick
Hands and Pyromaniac regressions. Legacy broad provenance ranges are not treated as
exact page evidence until the corresponding perk is source-certified.

Run focused checks as each lot is added. Final completion still requires
`npm audit --audit-level=high`, `npm run ci`, and disposable Foundry qualification
on the required compatibility matrix. Only after the whole Core is certified should
`docs/STATE.md` be updated and this temporary file removed.
