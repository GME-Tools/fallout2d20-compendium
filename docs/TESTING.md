# Testing and release checks

`npm run ci` is the authoritative full local gate. The exact subcommands and Node
matrix live in `package.json` and `.github/workflows/`; do not duplicate them here.
Use focused tests while iterating and run the full gate once on the final candidate
when the task requires it.

Generated outputs are `generated/source-packs/`, `packs/`, and `dist/`. They are
not editable sources. Reviewed inventories are manual inputs and must not be
regenerated implicitly by validation.

## Foundry qualification

Use a dedicated or disposable world, never a user world. Close Foundry before
replacing installed packs. For a release candidate:

1. use the exact supported Foundry/Fallout pair from the runtime compatibility
   contract and the required prior pair when available;
2. confirm expected packs and language folders;
3. exercise documents changed by the candidate, including imports, sheets, embedded
   Items, drag/drop, UUID links and RollTable draws where relevant;
4. use `./ci/run_headless_validation.sh` and the browser validator when runtime
   qualification is required;
5. record qualification only after the tested commit itself passes.

Headless validation is configured through `FOUNDRY_APP_PATH`, `FOUNDRY_DATA_PATH`
and `FOUNDRY_WORLD`. Runtime compatibility is defined in
`runtime/compatibility.mjs`, not in this document.

## Release

Release workflow behavior, package verification, tag checks and qualification
environment variables are encoded in `.github/workflows/release.yml` and repository
scripts. Do not reproduce their implementation here.

Tag or publish only with explicit owner authorization. A release candidate must have
the required CI, Foundry qualification, artwork review and any documented waiver
before publication.
