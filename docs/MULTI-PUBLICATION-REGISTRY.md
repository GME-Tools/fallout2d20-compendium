# Publication registry and provenance contract

## Registry

`scripts/data/publications.mjs` is the single registry of publications. Publication
IDs are stable lower-case `snake_case` keys and are never derived from localized
titles. Each entry carries localized titles plus the available source languages,
editions, translation status and applicable errata. The registry validator is the
authority for the exact schema.

Do not introduce publication constants elsewhere when the registry can represent the
same information.

## Document provenance

`flags.fallout2d20-compendium.source.book` is the unique first structured appearance.
For document types that expose it, `system.source` must match that publication ID.
`source.appearances` contains secondary appearances only and identifies the registered
publication/language/edition plus its reviewed status and optional page metadata.

Rules:

- An identical reprint reuses the oldest document identity and adds an appearance.
- A mechanically different profile is a distinct reviewed document, not an appearance.
- A corrected re-edition requires explicit editorial authority before changing the
  canonical mechanics or classifying the relationship.
- Never duplicate the first source inside `appearances`.
- Never mark a reprint `identical` without comparing the mechanics relevant to the
  document type.

`scripts/validate.mjs`, publication-audit helpers and regression tests enforce the
machine-checkable parts of this contract.

## Packs and folders

Packs are categorical, bilingual and product-line-wide. Publication IDs must not be
added to pack IDs, pack paths or labels.

RollTables may use a top-level publication folder because book context is useful for
navigation. Other categorical packs use durable type/family/rules taxonomies; do not
recreate publication boundaries merely to expose provenance.

Folder changes never redefine document identity. Stable folder IDs and localized
labels are generated from the repository folder taxonomy.

## Inventories and audits

Reviewed inventories are publication-scoped even though packs are not. Machine-readable
catalogs belong in `catalog/`; generated reports compare against them but must not
silently rewrite reviewed inputs.

A publication audit should report, as applicable:

- registered provenance and edition/translation metadata;
- bilingual occurrence/identity parity;
- local language-correct module UUIDs and canonical references;
- identical-reprint reuse versus distinct mechanical variants;
- paired artwork path/classification;
- exact comparison with any injected reviewed inventory.

Diagnostics should identify publication, language, pack, document ID and source field
or inventory coordinate. Ambiguous corrected editions and mechanical discrepancies are
editorial decisions, not automatic normalization opportunities.

Historical story-specific audit details belong under `archive/`; keep this document
limited to the reusable contract.
