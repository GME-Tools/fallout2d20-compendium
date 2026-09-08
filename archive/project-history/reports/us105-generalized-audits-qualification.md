# US-105 generalized audits qualification

## Scope

US-105 generalizes reusable quality invariants without importing content,
changing packs, changing the manifest, or starting US-106. Core-specific
editorial regressions and their reviewed catalogs remain unchanged.

## Generic controls

`scripts/lib/publication-audit.mjs` is a pure audit over the publication
registry and normalized root records. It checks publication/provenance,
cross-pack identity collisions, bilingual occurrence parity, local UUID
resolution and language, identical reprints versus variants/corrections,
duplicate approvals, paired images and artwork statuses, and injected exact
inventories. It returns one summary per registry entry.

`scripts/validate.mjs` applies those invariants to repository sources and
verifies that every routed reviewed catalog exists. `scripts/audit-content.mjs`
reports each registered publication with its source languages, editions,
translation status and applicable errata.

## Core controls deliberately retained

The V1 domain catalogs, recipes, random tables, character creation, named Core
errata, French editorial translations and extraction cleanup, magazine links,
artwork counts, duplicate groups, French weight audit and identity hashes stay
in their existing specialized tests. Inventory snapshotting remains the manual
`scripts/snapshot-core-inventories.mjs` command and is not called by audit,
validation, rebuild or CI.

## Negative fixture coverage

- unknown publication or provenance field;
- ID reused across categorical packs;
- unapproved localized duplicate;
- second document created for an identical reprint;
- variant encoded as an appearance;
- corrected re-edition without owner arbitration;
- missing bilingual occurrence or inconsistent first/reprint classification;
- cross-language or unresolved module UUID;
- language, edition, translation or errata registry mismatch;
- EN/FR image or artwork-status mismatch;
- missing or unexpected reviewed inventory coordinate.

Every failure includes a fixture/source location and the relevant publication,
language, pack, ID or field.

## Empty and pilot evidence

`test/publication-audit.test.mjs` registers `pilot_book` only in an in-memory
fixture. An empty reviewed inventory succeeds with zero first and secondary
appearances; a minimal bilingual document pair also succeeds. No production
publication, pack, catalog, or content document is created.

## Qualification boundary

The changes are build-time validation and documentation only. They do not touch
`module.json`, runtime code, `src/packs/`, generated LevelDB packs, UUID inputs,
or visible Foundry behavior. A new Foundry validation is therefore not required
for US-105; existing US-103 and US-104 runtime tests remain mandatory in CI.

## Automated result

Run on 2026-09-07:

- targeted publication, provenance, catalog, artwork, UUID and identity tests:
  passed;
- `npm run audit:weights`: 3,565 fields, zero error;
- `npm run validate`: 2,764 root documents and 3,984 readable records, zero
  error and zero warning;
- `npm run ci`: 43 test files passed, 5,532 compiled records verified in 40
  packs, and the 973-file release archive verified at 19 MiB;
- V1 identity regression: 2,764 `(language, pack, _id, _key)` tuples retain
  hash `56b6e2d398575a466c64562e0fa41591518274eaf5b0a2785e09016c28628743`;
- pack declarations retain their accepted 40-pack hash
  `b0a9ec3d008887c479c30ec96bdbdc38c0a48d99ac3c50088315450241452f3e`.

The CI run includes the US-102 registry/provenance suite, US-103 weight and
runtime-capacity suites, and US-104 language-visibility suite. It completed
without warnings.
