# Canonical pack source contract

## Layout

- `src/packs/canonical/<pack>.db/` stores shared structure and mechanics once.
- `src/packs/locales/<language>/<pack>.db/` stores one sparse overlay for every
  canonical record. `_key` is the stable join key; `_file` controls the readable
  generated filename; `values` maps JSON pointers to localized values.
- `generated/source-packs/<language>/` is disposable output used by audits,
  tests and compilation.

When an EN and FR value differs, neither value belongs in the canonical field:
both overlays declare it. Equal values remain canonical. Compendium UUIDs use
the `{language}` token in source and are resolved while materializing.

Documents in a categorized pack declare a source-only `$folder` key such as
`armor-combat` or `smallGuns-barrel`. The bilingual hierarchy and labels live
in `scripts/data/pack-folders.mjs`. Materialization converts `$folder` to the
stable generated Folder ID and removes the source-only key from published data.

## Canonical references

Embedded dependencies use this shape:

```json
{
  "$ref": { "pack": "weapon-mods", "id": "067VeMDTeThvISLa" },
  "$overrides": {
    "/system/attached": true
  }
}
```

The referenced localized document is cloned first, then the JSON-pointer
overrides are applied recursively. `{ "$delete": true }` explicitly removes a
field inherited from the referenced document. A missing reference, wrong pack,
or unknown ID is a build error. Copies without `$ref` are autonomous by design
and require an explicit editorial exception. Denizen abilities are the
documented exception: the published Actor instance is authoritative because
identically named abilities may legitimately vary by denizen or publication.

## Editing and verification

Edit shared mechanics in the canonical record and localized text in both
overlays. Do not edit `generated/source-packs/`. Run `npm run
source:materialize` for inspection and `npm run ci` before handoff. The
regression suite preserves the published bilingual identities and verifies that
canonical references resolve before LevelDB compilation.
