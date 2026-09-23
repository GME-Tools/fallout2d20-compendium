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

- EN PDF physical pages 1–136, through printed/source page 134.
- FR PDF physical pages 1–137, through printed/source page 134.
- Completed editorial sections: front matter, Introduction, Chapter One (Core
  Rules / Règles du jeu), Chapter Two (Combat), Chapter Three through Step 6
  (source pp.42–81), and Chapter Four through Clothing, Outfits and Headgear
  (source pp.84–133), including all weapon sections, Dog Armor, Ballistic Weave,
  Vault Jumpsuit linings, the p.130–132 armor-piece tables, and the p.133
  Raider/Leather family descriptions and Material mods.
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

- Source p.100 is now certified for the first 24 Small Gun mod rows (receivers, barrels, capacitors and magazines). The source-driven audit corrected Long from cost 10 to 20, separated the Large Magazine p.100 install requirement (Gun Nut 2) from its later p.222 crafting requirement (Gun Nut 1), and confirmed the current +8 cost from errata. Shielded Barrel keeps Gun Nut 3 while Q3 2026 removes Repair only from the Perks column; Repair remains the table-wide installation skill.
- The historical Capactor/Capacitor Boosting Coil anomaly is now explicit. The Gauss-linked stable identity 6hh0Evmfv0N8kX81 is the certified source identity and has corrected +1 CD/Vicious automation and spelling. CapaBoostCoil001 is retained only as a published stable-ID duplicate, with identical corrected mechanics rather than being deleted. FR names use the official Gauss Rifle terminology from p.97 because the official FR p.100 table predates the capacitor-row erratum: « Condensateurs intégraux » and « Bobine de suppression de condensateur ». FR prefixes for every p.100 row are now localized from the table; the FR Large Magazine printed cost -3 is superseded by canonical +8.
- Source p.101 closes the Small Gun Mods table and certifies all 15 continuation rows. This exposed two previously crossed same-name identity families: Small Guns now use the p.222 Small Gun Full Stock (`8nHC8z4vEY4yX7bM`) and Recoil Compensating Stock (`H5uajcZl8MICYwfy`), while Energy Weapons use their distinct p.223 counterparts (`bRV8rXkptjU6mz9Y` and `pxflsyihN3fjKgYq`). Existing weapon references were corrected without changing IDs.
- Source pp.101–105 certify all five base Energy Weapons, the four Laser Musket capacitor mods, three Gamma Gun-only mods, and all 26 general Energy Weapon mods. The audit corrected Boosted Capacitor cost from 94 to the source value 35, Standard Stock cost from 15 to 10, and the Energy Full Stock to cost 15 with Piercing 1, removal of Close Quarters and the errata-required Two-Handed quality. Signal Repeater was also corrected from an erroneous +2 damage implementation to +2 Fire Rate. The FR Gamma Gun antenna table prints Scientifique 3, while canonical EN requires Science! 4; the EN requirement is retained mechanically and the discrepancy is recorded.
- EN extraction cleanup in this lot removed a spurious duplicated “Lazer Musket Capacitor” list from the Laser Musket description and repaired the malformed Gamma Gun mod phrase “Antennaem Signal Repeater”.
- Source pp.106–110 now certify the complete Big Guns section: all seven p.106 base weapons, the Big Guns complication/sidebar rules as explicit out-of-scope prose, and all 29 weapon-specific Flamer, Gatling Laser, Junk Jet, Minigun and Missile Launcher mods. The April 2022 p.107 Flamer perk erratum is enforced for all six Flamer mods.
- The Big Guns audit resolved the historical duplicate Flamer identity without deleting stable IDs: `75n1EFSJw8xxti6s`, already referenced by Mister Handy p.54, is the certified Core Flamer; `q3RjTNEYvfHVBzVk` is retained and catalogued as a duplicate. Both now carry the p.107 mod set and Close range, and the p.54 arm-attachment sentence was removed from the reusable weapon description.
- Several same-name Gatling Laser mod identities had inherited mechanics from ordinary Energy Weapon variants. The p.108 source audit corrected the Gatling-only Photon Agitator (cost 132, weight 3, Science! 3), Reflex Sight (cost 169, Remove Inaccurate, Science! 4), Beam Focuser (cost 22, Piercing 1 and +1 range, no perk), and Boosted Capacitor (+1 damage only, no Fire Rate penalty), while restoring all Gatling variants to the Big Guns family. The Missile Launcher Scope was likewise reclassified from Energy Weapons to Big Guns.
- The official FR p.106 table prints the Lance-flammes at 8.5 kg although canonical EN gives 16 lb. The module retains the project-wide exact lb/2 metric policy (8 kg) and records this localization discrepancy rather than treating the FR number as canonical mechanics.
- Source pp.111–118 certify the complete p.111 Melee Weapons table (26 weapon identities) and all 51 unique melee mods defined through p.118. The September 2022 Sledgehammer Two-Handed erratum is enforced. The audit corrected the Aluminum Baseball Bat from 6 CD/cost 39/weight 3 lb to 5 CD/cost 32/weight 2 lb, plus multiple inherited mod costs, weights, perks, families and effects, including Board Puncturing and Walking Cane Barbed. The official FR p.111 Baton prints cost 10/rarity 0 instead of canonical EN 15/1, and omits Two-Handed on Sledgehammer; both discrepancies are recorded while canonical mechanics remain EN + Errata. Power Fist itself is certified from the p.111 table; its two detailed mods are certified in the following p.119 lot.
- Source pp.119–121 close the Core weapon section: both Power Fist mods, all three Throwing Weapons and all 11 Explosives are certified with exact bilingual coordinates, profiles, weights and current Errata V6. The audit repaired crossed Heating Coil recipe identities: `MvrQv0wg5FE6j7TR` is the p.119 Power Fist coil (cost 100, +2 CD, Energy, Blacksmith 3), while `hVD46UqAqiNB4f57` remains the p.117 Super Sledge coil (cost 180, +1 CD, Energy, Blacksmith 2). Nuka Grenade and Nuke Mine use Breaking, and Nuke/Plasma/Pulse Mines use Mine rather than Thrown (M).
- The official FR p.120 table misprints Mine à impulsion with the Plasma Mine profile (9 CD, no Stun, Thrown (M), cost 135). Canonical EN + Errata retains 6 CD, Stun, Mine and cost 100; the localization discrepancy is recorded in the certification inventory.
- Source pp.122–123 certify the Apparel overview and all four Dog Armor profiles. General clothing, outfit, armor-piece, headgear, super-mutant, Power Armor and robot-armor guidance is explicitly out of scope. The four canine Items retain exact resistances, coverage, weights, costs and rarities; their EN/FR descriptions now include the complete official acquisition sentence omitted by the earlier extraction.
- Source pp.124–129 now certify the complete Clothing, Outfit and Headgear table (29 profiles), all five Ballistic Weave mods and all five Vault Jumpsuit lining mods. The audit corrects Hard Hat rarity to 1, Hazmat Suit head coverage and explicit radiation immunity, restricts Ballistic Weave to the six profiles named by source prose, removes Ballistic Weave from Vault Jumpsuit, converts reusable embedded mods to canonical `$ref` dependencies, restores the complete official FR profile text, removes stale EN sidebar page references, and records the FR p.124 misplaced COUVRE-CHEFS heading as a localization-layout discrepancy.
- Source p.130 certifies the Raider Armor and Leather Armor reference tables and all 30 reusable side-specific armor-piece identities derived from their 18 side-neutral source rows. Canonical resistances, locations, weights, costs and rarities already matched EN; FR metric weights match the official table. Six right-leg French names were corrected from the masculine side suffix “(droit)” to the grammatically correct “(droite)”. The later family descriptions plus Material/Upgrade mod lists are deliberately not certified yet; they occur on later source pages.
- Source p.131 certifies the Metal Armor and Combat Armor reference tables and all 36 reusable side-specific armor-piece identities derived from their 24 side-neutral source rows. Canonical resistances, locations, weights, costs, rarities and EN names already match the source, and FR metric weights match the official table. Six right-leg French names were normalized from the masculine side suffix “(droit)” to the grammatically correct “(droite)”. Family descriptions and Material/Upgrade mod lists remain pending for their later source pages.
- Source p.132 certifies the Synth Armor and Vault-Tec Security Armor reference tables, covering 18 side-specific Synth pieces plus the two direct Vault-Tec Security Items. The audit corrects Synth Arm rarity from 3 to the source value 4 on both sides, fixes Sturdy Synth Right Arm coverage from left to right arm, fixes Heavy Synth Right Arm coverage from right leg to right arm, and normalizes the three French right-leg suffixes to “(droite)”. Source p.135 now additionally certifies the Synth family description, its Material-mod acceptance/slot rule and all eight published Synth Material-mod identities (four source rows plus torso variants), while restoring the official FR Synth and Vault-Tec Security descriptions. Synth helmets are now Material-only. The aggregate random-armor identities remain distinct and are not sourced to p.132 or p.135.

- Source p.133 certifies the Raider and Leather armor-family descriptions, the shared Shadowed Armor rule, and all 18 published Material-mod identities (nine source rows plus their torso-specific doubled weight/cost variants). The official FR family and Shadowed texts replace earlier paraphrases; Upgrade-mod acceptance remains pending its later source tables.

## Next lot

Source p.134 is certified for the Metal Armor and Combat Armor family descriptions and all 18 published Material-mod identities (nine source rows plus torso-specific doubled weight/cost variants). The six Metal/Combat helmet Items enforce the source Material-only rule, four base Combat limb Items were corrected to the source two-slot rule for non-helmets, and the unrelated Rust Devils Painted Metal erratum is explicitly excluded.

Source p.135 is certified for the Synth Armor family description, all eight published Synth Material-mod identities (four source rows plus torso-specific doubled weight/cost variants), and the Vault-Tec Security Armor family description. The three Synth helmet Items enforce the source Material-only rule and no longer expose Upgrade mods. The official FR Synth and Vault-Tec Security descriptions replace earlier paraphrases.

Source p.136 is certified for the shared Armor Upgrade rule and all 22 published Upgrade-mod identities: 17 source rows plus five torso-specific variants of the All Locations rows. Errata V6's replacement of obsolete Laminated/Resin/Microcarbon upgrade rows with Lighter Build/Pocketed/Deep Pocketed is enforced; those Synth identities remain Material mods only. Lead Lined is corrected from Armorer 3 to the source Armorer 4 + Science! 1 requirement, Ultra Light Build is normalized to All Locations, and the official EN/FR p.136 applicability prose and effect wording are restored while preserving later crafting recipes. Accepted Upgrade-mod references are certified for all 86 armor Items from pp.130–132, including the Material-only helmet rules and Vault-Tec Security exclusion. The official FR table's perk and weight discrepancies are recorded while canonical mechanics follow EN + Errata.

Source p.137 is certified for the Power Armor introduction and complete 21-row Power Armor table, represented by 31 stable Foundry identities after deriving Left/Right Arm and Leg variants. The February 2023 EN digital table already reflects Errata V6's corrected Weight/Cost column order; all canonical resistances, HP, weights, costs and rarities match that source, including the unusual T-51 Leg cost 10, which is printed in both EN and FR and is not changed by Errata V6. Five French right-leg names were normalized from “(droit)” to the grammatically correct “(droite)”. The FR p.137 cost divergences for T-45 Leg, T-60 and X-01 are recorded as localization discrepancies while canonical mechanics remain EN + Errata. Model-specific descriptions and Power Armor modification rules remain pending their later source pages.

Source p.138 is certified for the complete Armor Frame rules: entering/leaving the frame, fusion-core consumption, Impact Landing, Enhanced Strength, Sealed Environment, Ablative Resilience and Technological. The existing EN Item text already matched the February 2023 source; the earlier condensed FR paraphrase has been replaced by the complete official French text. The frame remains non-moddable, with STR 11, one fusion-core charge consumed per used scene, 3 CD Impact Landing damage above the source threshold, and the source-exact damage/repair behavior documented in the certification catalog. Errata V6 contains no p.138 correction.

Source p.139 is certified for Raider Power Armor: the complete EN/FR family description and slot rule, all four Raider II Upgrade mods, and Welded Rebar. The Raider II canonical perk requirements were corrected to Armorer 1. Raider Power Armor no longer exposes any plating mods, and its arm pieces no longer expose Tesla Bracers, matching the source rule that Raider pieces accept exactly one Upgrade and one System and may use normal systems except Tesla Arms. The p.144–145 system tables were read only as the explicit dependency needed to resolve that accepted-system identity set; those system-mod mechanics remain uncertified until their own pages. The official FR Welded Rebar effect replaces the earlier paraphrase. Errata V6 contains no p.139 correction.

Source p.140 is now certified for T-45 Power Armor: the complete EN/FR family description, the three-slot Upgrade/Plating/System rule, and all 20 T-45b through T-45f Upgrade identities. All six T-45 armor pieces were corrected from two to three mod slots. The earlier numeric-only Upgrade perk fields were normalized to the source requirements: Armorer 1 for T-45b, Armorer 2 for T-45c, Armorer 2 + Science! 1 for T-45d, Armorer 3 + Science! 1 for T-45e, and Armorer 3 + Science! 2 for T-45f, including their embedded copies. The official FR family text replaces the earlier paraphrase. Generic System/Plating acceptance was resolved from pp.144–145 only as the explicit dependency required by p.140; those later mod mechanics remain uncertified. Errata V6 contains no p.140 correction.

Continue page-by-page at printed/source p.141 with T-51 Power Armor: family description/slot rule and all 20 Unique T-51 Power Armor Upgrade Mods. Do not re-audit pp.1–140.


Known later Core suspects to re-check against source rather than assume true:

- Shielded Barrel crafting/recipe handling.
- Denizen Actor and embedded-Item completeness, especially salvage/butchery.

There are no unresolved anomalies or owner decisions in the completed p.1–140
boundary.

## Validation

`test/core-certification.test.mjs` enforces gapless page review through the current
boundary, explicit scope/status fields, bilingual identity/provenance for verified
entries, exact Skill and origin-Trait identities/source pages, the p.54 Mister Handy
attachment mechanics/localization, targeted FR source-text regressions, and absence
of unexplained Core documents with exact provenance within the certified boundary.
It now also checks explicit source classification and canonical rule notes through p.123, including the EN LCK/FR CHA Availability discrepancy, the Q3 2026 unique-mod erratum, the source-derived weapon-rule vocabulary and Fire Rate/range contract from pp.88–90, the complete 28-identity ammunition inventory with p.91/p.93 provenance, source quantities/costs/rarities, FR weight conversion, syringe mechanics, and the p.94 Fusion Core Scrounger erratum, plus all 15 p.95 Small Guns with exact mechanics, weights, ammunition, accepted-mod identities, EN extraction repairs, p.97–99 errata and the two documented FR p.95 mechanical discrepancies. It also covers the p.101 Small Gun mod continuation, all five p.101 Energy Weapons, Laser Musket and Gamma Gun unique mods, all Energy Weapon mods through p.105, corrected same-name mod-family references, the Boosted Capacitor/stock/Signal Repeater fixes, and the FR Gamma Gun perk discrepancy. It additionally certifies all seven Big Guns and all 29 weapon-specific Big Gun mods through p.110, including the Flamer duplicate/range cleanup, Flamer perk errata, Gatling-only mod corrections, exact bilingual coordinates and the FR Flamer weight discrepancy, then the complete weapon closure through p.121: two Power Fist mods, three Throwing Weapons and 11 Explosives, including corrected Heating Coil identities, weights, mine errata and the FR Pulse Mine discrepancy. The p.122–123 regression accounts for all overview rules and verifies the complete four-item Dog Armor table, bilingual provenance, exact metric weights and descriptions. The p.130 regression then verifies the full Raider/Leather armor-table inventory as 30 stable side-specific Items, exact bilingual names/provenance, all resistances, locations, weights, costs and rarities, while guarding the distinct later Raider Power Armor identities. The p.131 regression likewise verifies all 36 Metal/Combat side-specific Items from the two 12-row source tables and guards the aggregate random-armor identities from being mis-sourced to p.131. The p.132 regression verifies all 18 Synth side-specific pieces plus the two Vault-Tec Security Items, including the corrected Synth-arm rarity and right-side coverage regressions, while keeping aggregate armor identities separate. The p.135 regression additionally verifies the exact EN/FR Synth and Vault-Tec descriptions, all eight Synth Material-mod identities and torso-derived variants, the Synth helmet Material-only rule, and the explicit separation of the p.136 armor-upgrade erratum from the p.135 material table. The p.136 regression verifies all 22 corrected Upgrade-mod identities, exact bilingual names/weights/effects and provenance, the Lead Lined requirement fix, official applicability prose, all location-specific accepted Upgrade sets on the 86 certified armor Items, Material-only helmets, Vault-Tec Security exclusion, and the obsolete Synth-Material rows remaining Materials rather than Upgrades. The p.137 regression verifies all 31 Power Armor identities derived from the 21-row table, exact EN/FR weights and names, canonical resistances/HP/cost/rarity, Errata V6 column-order handling, the source-exact T-51 Leg cost 10, documented FR cost discrepancies and corrected feminine right-leg suffixes. The p.138 regression verifies the full Armor Frame EN/FR text, zero-mod contract and every operating-rule invariant represented in the certification catalog, including fusion-core consumption, STR 11, Impact Landing, sealed-environment prerequisites, ablative damage handling and technological repair constraints. The p.139 regression verifies the complete Raider Power Armor family prose, exactly two mod slots, the four Raider II upgrades, Welded Rebar, Armorer 1 requirements, the no-plating rule, Tesla Arms/Bracers exclusion and the location-specific accepted System-mod identity sets resolved from the p.144 dependency without certifying those later mechanics. The p.140 regression verifies the complete T-45 family prose, all 20 T-45b–f upgrades, exact bilingual names/weights, source resistances/HP/costs/perks, three-slot Upgrade/Plating/System acceptance, and the full location-specific accepted identity sets while keeping pp.144–145 mechanics pending. It checks the complete Step 6 source inventory through p.81, including all 16 equipment bundles and their bilingual referenced identities, current Farmhand/Skirmisher errata, the Trader FR quantity discrepancy, exact Random Trinkets results, all Tag Skill Item rows and the higher-level starting-equipment table. It also checks the certified perk identities through source p.64 plus targeted
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
