# Multi-publication registry and provenance

This document defines the data contract introduced by US-102. It applies to
future content without changing any V1 document identity or pack declaration.

## Publication registry

`scripts/data/publications.mjs` is the single registry of publications. A new
publication is added as one registry entry; it must not introduce another
global source constant. Publication identifiers use stable lower-case
`snake_case` and are never derived from a localized title.

Each entry records:

- the technical identifier;
- long and short English and French titles;
- the available source languages;
- one or more identified source editions per available language;
- each edition's label, version, translation status and applicable errata;
- each known erratum's identifier, title, version and affected languages.

Translation status is one of `original`, `official`, or `project`. The Core
Rulebook is registered as `core_rulebook`, using the February 2023 English
digital release, the official French edition, and Errata Log V6 (2026).

The registry validator rejects malformed or inconsistent entries when it is
loaded. Titles remain localized metadata; IDs are the stable keys used by
documents, catalogs, reports and tools.

## Document provenance

The existing flag envelope remains authoritative:

```json
{
  "flags": {
    "fallout2d20-compendium": {
      "source": {
        "book": "core_rulebook",
        "language": "en",
        "appearances": [
          {
            "book": "example_supplement",
            "language": "en",
            "edition": "en-first",
            "status": "identical",
            "page": 42
          }
        ]
      }
    }
  },
  "system": {
    "source": "core_rulebook"
  }
}
```

`source.book` is the unique first-appearance publication. For document types
that expose it, `system.source` must contain the same identifier. Existing V1
flags without `appearances` are read as an empty list and require no source or
world migration.

`source.appearances` contains secondary appearances only. Every entry must
reference a registered publication, language and edition, and currently uses
`status: "identical"`. It may also record `page` and a translation status when
useful. A publication cannot repeat the first source, and a
publication/edition/language occurrence cannot be duplicated.

An identical reprint adds an appearance to the existing oldest document; it
does not create a document and does not change `system.source`. A mechanically
different variant is not an appearance: it receives a distinct reviewed
document ID, with its own first source. A corrected re-edition remains subject
to owner review before the canonical document is changed.

`scripts/validate.mjs` and `scripts/audit-content.mjs` validate this contract.
Diagnostics identify the source file and the invalid field. The generated
audit counts first and secondary appearances per publication.

## Packs and folders

All packs remain categorical, bilingual and product-line-wide. Publication IDs
must never be added to pack IDs, paths, or labels, and no publication-specific
pack may be created.

RollTables are placed in a top-level publication folder whose stable
technical association is that publication's registry ID and whose displayed
name is the localized short title. Nested folders may classify related table
families. Core tables use the localized Core Rulebook folder with functional
subfolders for character creation, publications, equipment, encounters and
Vaults. Folder changes never rename or move a pack.

Other categorical packs may use durable taxonomic folders such as equipment
family, creature family, or rules category. They must not use publication
folders merely to reproduce book boundaries; publication filtering comes from
provenance.

## Catalogs and reports

Reviewed inventories are publication-scoped even though packs are not. New
catalog filenames use `<milestone>-<publication-id>-<domain>.json`, and each
catalog declares its publication ID at the top level. A catalog occurrence
points either to the canonical document identity or to a separately approved
variant identity; an identical reprint never duplicates a document row.

Generated reports aggregate by registry publication ID and distinguish first
from secondary appearances. Core-specific V1 catalogs, report names and
regression scripts retain their existing names because they are stable reviewed
evidence, not generic infrastructure.

## Publication audit contract

US-105 adds a pure, registry-driven audit in
`scripts/lib/publication-audit.mjs`. Its input is a registry, normalized root
document records, reviewed duplicate approvals, and optional reviewed inventory
coordinates. It returns diagnostics and a result for every registered
publication, including a publication with zero occurrences.

The generic invariants are:

- provenance and registered language/edition/translation/errata metadata;
- globally unambiguous document IDs within each language, plus bilingual
  publication occurrence parity;
- local, language-correct module UUIDs;
- identical-reprint reuse, distinct approved mechanical variants, and reviewed
  same-name editorial groups;
- paired image path and artwork classification;
- exact comparison with an injected publication inventory when one is supplied.

Inventory coordinates use `<language>/<pack>/<document-id>` against the
materialized language view. Audit code only
reads and compares these references; it has no snapshot or write operation.
`scripts/data/publication-audit-contracts.mjs` routes the Core to its existing
specialized reviewed catalogs and tests. A future reviewed catalog can provide
an exact coordinate list without changing Core tests.

Diagnostics identify the source file (or fixture coordinate), publication,
language, pack, document ID, and relevant field. A `variant` appearance is
rejected because variants are documents; a `corrected` appearance explicitly
requires owner arbitration; only `identical` is accepted as a secondary
appearance.

## V1 identity guarantee

US-102 does not edit `src/packs/`, `module.json`, or generated `packs/`.
The regression suite fixes the ordered identity set
`(language, pack, _id, _key)` for all 2,764 V1 root documents and the 40 pack
declarations. Because Foundry UUIDs are formed from the module ID, pack ID and
document ID, this also locks every V1 compendium UUID input.

The later owner-approved `creatures`/`npcs` to `denizens` migration is an
explicit exception to that historical guarantee. Document IDs and `_key`
values remain stable, while Actor compendium UUIDs now use the `denizens` pack
ID and intra-module links are validated against it.
