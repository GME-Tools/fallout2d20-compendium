# Compendium data model

This is the reusable contract for editable sources, localization, references,
publication provenance and reviewed inventories. Validators and tests are
authoritative for exact schemas and machine-checkable invariants.

## Source layout and localization

- `src/packs/canonical/<pack>.db/` stores shared structure and mechanics once.
- `src/packs/locales/<language>/<pack>.db/` stores sparse language overlays.
- `generated/source-packs/<language>/` is disposable materialized output.
- `packs/` is generated Foundry LevelDB output.

Each overlay joins its canonical record by stable `_key`. `_file` controls the
readable generated filename and `values` maps JSON pointers to localized values.
When EN and FR differ, both overlays declare the localized value; equal values remain
canonical. Source compendium UUIDs use the `{language}` token and are resolved during
materialization.

Categorized source documents use a source-only `$folder` key. Stable folder IDs and
localized labels come from `scripts/data/pack-folders.mjs`.

## Canonical references

Embedded reusable dependencies use a language-neutral source reference:

```json
{
  "$ref": { "pack": "weapon-mods", "id": "067VeMDTeThvISLa" },
  "$overrides": {
    "/system/attached": true
  }
}
```

Materialization clones the localized referenced document, then applies JSON-pointer
overrides. `{ "$delete": true }` removes an inherited field. Missing references,
wrong packs and unknown IDs are build errors.

Copies without `$ref` are autonomous only when the data model requires it. Denizen
abilities are the standing exception: the embedded Actor Item is authoritative because
identically named abilities may legitimately vary by denizen or publication.

## Publication provenance

`scripts/data/publications.mjs` is the single publication registry. IDs are stable
lower-case `snake_case` keys and are not derived from localized titles. Do not create
parallel publication constants when the registry can represent the information.

`flags.fallout2d20-compendium.source.book` is the first structured appearance. For
document types exposing it, `system.source` must match. Secondary appearances belong
in `source.appearances` with registered publication/language/edition metadata and an
appropriate reviewed status.

- Identical reprints reuse the oldest document identity and add an appearance.
- Mechanically different profiles are distinct reviewed documents.
- Corrected re-editions require explicit editorial authority before changing canonical
  mechanics or classifying the relationship.
- Never duplicate the first source in `appearances`.
- Never mark a reprint `identical` without comparing the relevant mechanics.

Packs remain categorical, bilingual and product-line-wide. Publication IDs do not
belong in pack IDs, paths or labels. RollTables may use publication folders; other
packs use durable type/family/rules taxonomies.

## Reviewed inventories and audits

Machine-readable reviewed inventories belong in `catalog/`. Generated reports may
compare against them but must never silently rewrite them.

A publication audit should distinguish new identities, identical reprints, mechanical
variants, corrected editions, static controls and out-of-scope prose. Where relevant,
verify bilingual identity parity, language-correct UUIDs/references, provenance,
artwork classification and exact reviewed-inventory coordinates.

Ambiguous corrected editions and mechanical discrepancies are editorial questions, not
automatic normalization opportunities.

## Editing and verification

Edit shared mechanics in canonical records and localized values in sparse overlays.
Never edit generated source views or LevelDB packs directly. Preserve published IDs,
`_key` values and UUID inputs unless an explicitly approved migration changes them.

Use focused validation while editing. Materialize for inspection when useful and run
the task-required final gate before handoff.
