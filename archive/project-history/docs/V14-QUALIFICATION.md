# Foundry v14 qualification

## Local evidence

On 2026-09-06, an isolated copy of the local `fallout` world loaded the packaged module with the Node distribution of Foundry 14.367 and Fallout system 11.17.1. Foundry connected and migrated all 40 bilingual packs, completed world launch, and answered over HTTP. The clean first-start log contains no warning or error.

A headless Chromium acceptance run then loaded all 2,708 root documents, resolved all 304 referenced UUIDs, imported an Item, an English NPC and a French creature, preserved their embedded documents, simulated an Item drop onto an Actor, rendered Item, Actor and RollTable sheets, and drew one Trinkets result. Every assertion passed without a browser error.

An earlier run exposed a pack-format defect: embedded Actor items were present in the readable JSON but absent from the `actors.items` LevelDB sublevel. The compiler now emits the Foundry v14 hierarchical format for embedded items and effects. Three missing magazine-perk Active Effects were also restored in both languages. The build verifier compares all 4,302 compiled records with their readable sources, including those sublevels, and a regression test fixes the expected key layout. The browser run also exposed a Fallout-system ammunition discovery race; the module now rebuilds that configuration from its dedicated ammunition packs before sheets are used.

## Qualification gates

- Automated source, content, artwork, UUID, LevelDB, and archive checks: covered by `npm run ci`.
- Server startup with a dedicated world: passed locally with Foundry 14.367 and is reproducible with `ci/run_headless_validation.sh`.
- Local browser drag-and-drop-equivalent imports, embedded documents, sheet actions, UUID resolution and RollTable draw: passed.
- Final human visual review in the local Foundry client: passed on 2026-09-07. The review covered all checklist sections; its reported ammunition, recipe-link, pack-folder and RollTable gaps were corrected and retested successfully.
- Oracle Foundry startup and interactive acceptance: planned as a post-release deployment validation of the published `1.0.0` package; it is not a release gate.

Foundry 14.367's Node distribution requires Node 24.13.1 or later in the Node 24 line. This runtime requirement is distinct from the module's build tooling, which remains tested with Node 20 and 23. The Oracle Foundry host will therefore require a Node 24 runtime even though CI/package generation can continue on Node 20.

The existing user world must not be used as the automated smoke-test target; use a dedicated world or a disposable copy.
