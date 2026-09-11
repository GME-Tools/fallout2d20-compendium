# Changelog

All notable changes to this private module are documented here.

## 1.2.0 — Unreleased

### Added

- Begin integration of Astoundingly Awesome Tales issues 1–7. A contradictory
  PDF audit identified missing structured entries and incomplete profiles; the
  counts remain provisional until US-401 remediation is complete.
- Use the official French editions of issues 1–2 and reviewed project
  translations for issues 3–7, with exact metric overlays.
- Add publication registry entries, folder taxonomy, provenance scaffolding and
  focused regression coverage. Artwork remains provisional: covers must be
  replaced by document-specific official crops or neutral placeholders.

### Changed

- Treat the newer issues 1–5 collection as the mechanical authority for the
  first four adventures while retaining each individual issue as the first
  appearance. Reprint equivalence remains to be verified per document; the
  Sentry Bot is already known to be a real variant.
- Correct the overlapping Robot Assassin ranges to 1–5, 6–10, 11–17 and
  18–20 by explicit owner decision.

### Validation pending

- The prior CI and disposable-world startup pass covered the incomplete import
  but does not qualify editorial completeness. Full validation and Foundry
  qualification must be repeated after the audit findings are remediated.

## 1.1.2 — 2026-09-10

### Fixed

- Restrict deterministic French metric overlays to reviewed schema paths and
  reject unrelated mechanical fields whose leaf is merely named `base`.
- Reject non-physical Item weights symmetrically when introduced by either the
  English canonical source or French localized data, including embedded Items.
- Normalize all RollTable result weights to their inclusive ranges, including
  the Errata V6 Quadruped and Flying Insect hit-location tables, and enforce the
  relationship globally.
- Derive manifest, runtime and qualification checks from one Foundry 14 and
  Fallout 11.17.1–11.x compatibility contract.

### Validation

- Add regression coverage for metric path allowlists, French-only invalid
  weights, global RollTable weight/range consistency, and compatibility
  contract alignment.

## 1.1.1 — 2026-09-10

### Fixed

- Repair the reviewed Starter Set Actor profiles, inventories, attacks and
  abilities, using the corrected French third-generation Synth Replica profile.
- Add the Quadruped and Flying Insect hit-location tables from Errata V6 and
  correct the evident `Ring Wing` typo to `Right Wing`.
- Canonicalize 21 unauthorized French recipe divergences and reject mechanical
  overlay drift outside approved localization and metric conversions.
- Address embedded Item overlays by stable identity and reject missing targets.
- Restrict French weight auditing to physical Item types and extend metric
  runtime handling to every French module publication.
- Preserve third-party ammunition configuration and fail explicitly when an
  unsupported Fallout runtime cannot install the compatibility layer.

### Changed

- Align repository and release tooling on Node 20–24, with Node 24 as the
  release and Foundry qualification baseline.
- Pin GitHub Actions to immutable commits, add scheduled dependency review,
  gate releases on a commit-specific Foundry qualification, and automatically
  verify the published statistics in `STATE.md`.

### Qualification

- Validate 2,650 root documents and 3,708 French weight/capacity fields with no
  actionable issue or warning.
- Verify 6,232 records across 36 Foundry v14 LevelDB packs and the 19 MiB
  release archive.
- Validate 839 UUIDs, imports, embedded Items, sheets, drag/drop and all 42
  RollTables on Foundry 14.367 with Fallout 11.17.1 and Node 24.20.0.

## 1.1.0 — 2026-09-09

### Added

- Add seven bilingual GM Toolkit RollTables with 60 results, including the
  deterministic location-generation procedure and linked encounter tables.
- Add eleven bilingual Starter Set denizen profiles, including distinct
  Doctor Rast states and approved Starter-specific mechanical variants.
- Add dedicated Starter Set weapon, chem, and armor tables while recording
  identical Core reprints as secondary publication appearances.
- Add the multi-publication registry entries, provenance, folder taxonomy,
  artwork tracking, and regression coverage for both publications.
- Add reviewed illustrations for all eleven Starter Set Actors while leaving
  GM Toolkit and Starter RollTables intentionally unillustrated.

### Fixed

- Apply the approved mechanically coherent Starter rulings for Rad Rocky,
  Raider, `.45` ammunition, Random Armor, the Commonwealth merchant, and the
  wounded Mirelurk Queen.
- Correct Starter table embedded-result keys after Foundry migration testing.

### Qualification

- Validate 2,646 root documents and 3,620 French weight/capacity fields with no
  actionable issue; preserve the accepted Core identity snapshot.
- Verify 6,202 generated records across 36 Foundry v14 LevelDB packs.
- Validate imports, embedded Items, sheets, drag/drop, UUID links, and all 40
  tables in a disposable world on Foundry 14.367 with Fallout 11.17.1.

## 1.0.5 — 2026-09-09

### Changed

- Remove the obsolete tracked NeDB compendiums and use `packs/` exclusively for
  generated Foundry v14 LevelDB output, replacing the temporary `packs-v14/`
  name throughout the build and release pipeline.

## 1.0.4 — 2026-09-09

### Changed

- Remove the standalone creature-ability compendiums and make all 377 ability
  instances authoritative within their denizen sheets.
- Reassign the former creature-ability illustrations directly to their
  corresponding embedded denizen abilities.
- Normalize all denizen origins and body types, populate the radiation and
  poison immunity fields used by Fallout 11.17.1 while retaining matching
  descriptive abilities, and repair all 31 creature attacks to use the current
  creature attribute/skill fields.
- Replace descriptive Butchery and Salvage pseudo-items with actor test
  difficulties and embedded, rollable yields linked to the canonical item
  packs.

## 1.0.3 — 2026-09-09

### Added

- Generated bilingual folder taxonomies for apparel, mods, publications,
  consumables, perks, robot armor, RollTables, weapons, and denizens.
- Canonical language-neutral references with explicit embedded overrides for
  reusable creature abilities, equipment, and modifications.

### Changed

- Replace the parallel complete English and French source trees with one
  canonical source and sparse JSON-pointer localization overlays.
- Generate all readable localized source views during validation and build.
- Rename source files from opaque keys to readable English slugs while
  preserving document IDs and `_key` values.
- Merge the former creature and NPC packs into `denizens`, labelled
  “Denizens of the Wasteland” and “Résidents des Terres désolées”. This is an
  intentional Actor compendium UUID break; intra-module links are migrated.

### Qualification

- Validate 2,760 documents and 3,570 French weight/capacity fields with no
  errors or warnings.
- Verify 5,816 records, including 270 folders, across 38 Foundry v14 LevelDB
  packs and verify the generated release archive.
- Validate module startup in a disposable world on Foundry 14.367 with Fallout
  11.17.1.

## 1.0.2 — 2026-09-08

### Added

- Reviewed artwork for the V1 Core compendiums, reducing tracked placeholders from 544 to 30 RollTable icons.
- Canonical creature-ability links for 377 embedded Actor items and build-time materialization from the bilingual creature-ability packs.
- Regression coverage for canonical creature abilities and single-user artwork reuse.

### Changed

- Reduce default agent context with a concise repository instruction file,
  current-state summary, routed story contracts, and archived historical
  handoff/backlog documents.
- Reuse the corresponding Actor portrait for 32 AI-illustrated creature abilities that have exactly one creature or NPC user.
- Replace the Institute Scientist pseudo-ability Lab Coat with the canonical apparel item.
- Remove retired project history, legacy reconstruction tooling, obsolete reports, and superseded source artwork.

### Fixed

- Correct creature attacks and official French ability names against the Core Rulebook and current errata.
- Remove the duplicate Ghoul ability while preserving and relinking every embedded use to the retained stable identity.
- Normalize creature-ability weights and correct inherited English naming errors.

### Qualification

- Preserve 40 bilingual packs with 2,760 root documents and verify 5,546 compiled Foundry v14 LevelDB records.
- Validate the release candidate on Foundry 14.367 with Fallout 11.17.1 in a disposable local world.
- Retain 30 explicitly tracked RollTable placeholders; artwork completeness is not claimed.

## 1.0.1 — 2026-09-07

### Added

- Registry-driven publication audits for identity collisions, bilingual parity, UUIDs, reprints/variants, duplicate approvals, artwork and read-only inventories, including empty/pilot publication fixtures and precise negative diagnostics.
- Client-scoped English, French, or bilingual compendium navigation, defaulting to both for every role while keeping hidden packs and their UUIDs available.
- Validated multi-publication registry with localized titles, source editions, languages, errata and translation status.
- Backward-compatible structured provenance for secondary identical appearances, with precise validation diagnostics.
- Regression tests locking all V1 document identities, UUID inputs and pack declarations.

### Changed

- Generated content audits now emit registry edition, translation and errata metadata for every registered publication, including publications with no content.
- Core authoring scripts now resolve `core_rulebook` through the publication registry instead of a global source constant.
- Content audits now validate provenance and count first and secondary appearances by publication.

### Fixed

- Convert every French Core Item weight and carrying-capacity value, including embedded Actor equipment, robot modifiers and nested mod snapshots, with the authoritative exact `kg = lb / 2` rule and enforce it with an exhaustive audit.
- Correct Fallout's derived carrying-capacity calculation for every Actor in kilogram-configured worlds and for this module's French Actors, including newly created Actors and fractional robot modifiers, while leaving pound-configured English or external documents unchanged.

### Qualification

- Preserve all 2,764 V1 root identities and 40 categorical bilingual pack declarations while verifying 5,532 compiled LevelDB records.
- Qualify the release candidate on Foundry 14.367 with Fallout 11.17.1, the latest stable compatible pair available when this lot started and the previously qualified pair.
- Document the rollback procedure and the owner's explicit V1.0.1 waiver replacing the pre-release Oracle gate with post-release user validation.

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
