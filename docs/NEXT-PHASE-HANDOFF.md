# Next-phase handoff

The actionable backlog for separate work conversations is maintained in
`docs/NEXT-PHASE-USER-STORIES.md`. Its `US-000` framing gate was accepted by
the owner on 2026-09-07; implementation stories may now follow their recorded
dependencies without making implicit structural decisions.

`US-101`, `US-102`, and `US-103` are complete and accepted. The French Core
weight audit now enforces exact `kg = lb / 2` values for root and embedded
Items and carrying capacity, while the compatibility runtime corrects Actor
encumbrance in kilogram-configured worlds. `US-104` is the next story on the
consolidation sequence and must be handled in a separate conversation.

## Starting point

Version `1.0.0` is published at <https://github.com/GME-Tools/fallout2d20-compendium/releases/tag/v1.0.0> from commit `81daa06`.

Its scope is the complete reusable and structured content of the Fallout 2d20 Core Rulebook in independent English and French compendiums, corrected against Errata Log V6 (2026). Local human acceptance on Foundry 14.367 and Fallout 11.17.1 passed. GitHub CI and release packaging passed. Installation of the published package on Oracle is a post-release field validation, not an unfinished V1 gate.

The next phase is broader than another content import. It must begin with framing and is expected to cover at least:

- consolidation and maintenance of V1;
- integration of additional Fallout 2d20 publications;
- user-facing module settings and configurable behavior;
- evaluation of useful authoring, validation, migration, diagnostic or in-Foundry tools.

Do not assume these themes define a single release or that they should all be implemented together. Establish priorities, release boundaries and acceptance criteria with the owner first.

## Architecture to preserve

- The module is publication-neutral: it is the Fallout 2d20 Compendium, not a Core Rulebook module.
- Editable Foundry documents live as formatted JSON under `src/packs/en/` and `src/packs/fr/`. Never edit `packs-v14/`; it is generated and ignored by Git.
- English and French packs are independent, exhaustive and draggable. Paired documents reuse stable IDs within their respective packs.
- Cross-document links use Foundry UUIDs. Provenance lives in `flags.fallout2d20-compendium.source`.
- English errata-corrected material is mechanically canonical. Official French text is localized against that canon; ambiguous adaptations are brought to the owner.
- No Babele or `fallout-fr` dependency exists. Runtime compatibility code is in `runtime/fallout-v14-compat.mjs`.
- Pack declarations and current source constants are in `scripts/config.mjs`; `SOURCE_ID = "core_rulebook"` is an obvious multi-publication design point to revisit before importing another book.
- Static catalogs under `catalog/` are reviewed non-regression inventories. Generated audit and artwork reports live under `reports/`.
- Images are square WebP, preferably at most 150 KiB and exceptionally at most 300 KiB. Each document is classified as `dedicated`, `shared` or `placeholder`; EN/FR pairs share artwork.
- PDFs are working inputs under ignored `pdf/` or `tmp/` locations and must never be committed.
- `npm run rebuild:core` deterministically regenerates the Core sources. `npm run ci` audits, validates, tests, builds all Foundry v14 LevelDB packs, verifies them, packages the module and verifies the archive.
- Foundry must be closed before replacing `packs-v14/`, because it locks LevelDB files.
- The GitHub release workflow expects a tag exactly matching `v<module version>`.

## V1 baseline

- 40 packs: 20 English and 20 French.
- 1,382 root documents per language; 2,764 total.
- 5,532 compiled LevelDB records including embedded records.
- 29 RollTables per language, including recursive publication-to-issue draws.
- 37 automated test files at release time.
- 544 canonical English documents, mirrored in French, still use tracked placeholders. This is accepted debt, listed in `reports/missing-core-artwork.md`.

The authoritative completion and acceptance evidence is in:

- `docs/PROJECT.md`;
- `docs/V1-CONTENT-PLAN.md`;
- `docs/V14-QUALIFICATION.md`;
- `reports/v1-local-acceptance.md`;
- `CHANGELOG.md`.

## Framing decisions required

The first new-context discussion should elicit decisions rather than begin implementation. At minimum, clarify:

1. which V1 defects, artwork debt or usability improvements constitute consolidation, and their priority;
2. which additional books are available and in what EN/FR editions, including their errata;
3. whether the next milestone is one book, a reusable multi-book foundation, or both in staged releases;
4. whether documents from several books merge into the current category packs or use publication-specific packs, and how users should filter provenance;
5. how duplicate, revised or expanded documents across books are represented without unstable IDs or broken links;
6. what settings users need, at world or client scope, their defaults, and whether settings affect visibility, behavior, automation or content installation;
7. which automations are desired and which must remain opt-in to avoid surprising game masters;
8. what additional tools would create real value: import assistance, source/catalog generation, link diagnostics, artwork review, migrations, configuration UI, content browser, or other ideas;
9. compatibility policy for later Foundry v14 releases and Fallout system releases;
10. release sequence, acceptance environments and definition of done for each lot.

Also ask for the first new publication PDFs to be placed in the ignored `pdf/` directory only after the publication priority is chosen.

## Recommended first technical lot after framing

Unless framing leads elsewhere, begin with a multi-publication foundation before importing bulk content:

1. generalize source identifiers and provenance metadata without rewriting stable V1 IDs;
2. define publication registries and per-publication inventory/catalog conventions;
3. add schema validation and migration tests for old V1 provenance;
4. decide and test duplicate-document and cross-book-link policies;
5. design settings against concrete approved use cases;
6. verify a very small bilingual sample from the selected book before scaling extraction.

Every implementation lot should remain reviewable, preserve `npm run ci`, update documentation and changelog, and include proportionate Foundry testing.
