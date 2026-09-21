---
name: content-integration
description: Add or correct Fallout 2d20 compendium Actors, Items, RollTables, localization overlays, provenance, references, or artwork metadata in the canonical source model.
---

Read `AGENTS.md`, `docs/STATE.md`, `docs/DATA-MODEL.md`, and `docs/WORK.md`
only when the requested change overlaps the active multi-session work.

Search for an existing identity before creating a document. Edit shared mechanics in
`src/packs/canonical/` and language-specific values in sparse EN/FR overlays. Never
edit `generated/source-packs/` or `packs/` directly.

Preserve published IDs, `_key` values and UUID inputs unless explicitly authorized
to migrate them. Use language-neutral canonical `$ref` dependencies and only
instance-specific overrides. Denizen abilities remain autonomous embedded Items.

Keep first appearance and secondary appearance provenance distinct. Do not encode a
mechanically different profile as an identical reprint.

Run the narrowest relevant validation/tests while iterating. Materialize sources only
when needed for inspection; run the task-required final gate at handoff.
