# Testing

## Local checks

Use Node.js 20 (CI/Oracle) or Node.js 23 (local development):

```sh
npm ci
npm run ci
```

The command validates source documents and assets, runs unit tests, builds Foundry v14 LevelDB packs, and creates the release archive under `dist/`.
It also reads every compiled LevelDB record back and compares it with its JSON source, then verifies the exact contents and manifest of the ZIP archive.

Validation is warning-free. Approved duplicate display names are recorded as exact stable-ID groups; a new duplicate or an obsolete approval fails validation. Missing dedicated illustrations are tracked separately in `reports/missing-core-artwork.md` and use valid placeholders until replacement artwork is supplied.

Publication-registry and provenance tests accept unchanged V1 flags, reject unknown publications and invalid secondary appearances, and lock the complete V1 document identity set and pack declarations. The content audit reports first and secondary appearance counts by registered publication.

`npm run audit:weights` exhaustively pairs every physical Core Item weight by
pack and stable ID, including embedded Actor Items, Actor carrying capacity,
robot carry modifiers, and the mod snapshots held by weapons and apparel. French values must be finite JSON numbers exactly equal to
the numeric English value divided by two; no rounding or exception is currently
allowed. The deterministic paired inventory is written to
`reports/us103-french-weight-inventory.json`.

Runtime regression tests verify that kilogram-configured worlds and
provenance-marked French Actors use the Core convention (`STR × 5 + 75 kg`),
25 kg encumbrance increments, exact fractional robot carry modifiers and
kilogram inventory totals. Newly created Actors without provenance are covered;
English and external Actors delegate unchanged only in pound-configured worlds.

Language-visibility regression tests verify the client-scoped `languageVisibility`
setting for GM and player clients, all three choices, the safe fallback for an
unknown stored value, initial directory rendering and live rerendering after a
change. They also assert that filtering only removes this module's sidebar
entries: all 40 collections remain in `game.packs` and a hidden document UUID
continues to resolve.

The CI matrix runs the same checks on Node.js 20 and 23. It also verifies the generated LevelDB pack contents and release archive rather than merely checking that those files exist.

## Foundry smoke test

The human V1 review is specified in `docs/V1-LOCAL-ACCEPTANCE.md`.

1. Build with `npm run build`.
2. Enable this module in a Foundry v14 world using Fallout system 11.17.1 or later.
3. Confirm both language pack folders are visible.
4. Open at least one document in every non-empty pack.
5. Drag representative Item and Actor documents into the world and onto compatible actors.
6. Exercise attacks, consumables, mods, effects, and UUID links touched by the current lot.
7. Record ambiguous content in `docs/EDITORIAL-DECISIONS.md`.

Foundry keeps LevelDB files locked while it is running. Close Foundry before rebuilding the module's `packs-v14/` directory. To verify compilation without replacing locally installed packs, use `node scripts/build-packs.mjs --output /tmp/fallout2d20-packs`.

For an installed Foundry v14 server and a dedicated world with the module enabled, set `FOUNDRY_APP_PATH`, `FOUNDRY_DATA_PATH`, and `FOUNDRY_WORLD`, then run `./ci/run_headless_validation.sh`. This checks server startup and fails on module startup errors or missing embedded Actor records.

With that server running and Playwright installed outside the repository, run `ci/run_foundry_browser_validation.mjs`. Set `PLAYWRIGHT_MODULE` to Playwright's `index.mjs` when it is not installed in this project, and optionally set `FOUNDRY_URL`, `FOUNDRY_USERNAME`, and `FOUNDRY_PASSWORD`. The scenario validates every pack and UUID, imports representative documents, preserves embedded records, renders sheets, and draws from the Trinkets table. A final human visual review remains useful for layout and artwork quality.

For a repeatable server-start smoke test, prepare a dedicated world with the module enabled, close any running Foundry process, then run:

```sh
FOUNDRY_APP_PATH=/path/to/foundry \
FOUNDRY_DATA_PATH=/path/to/foundry-data \
FOUNDRY_WORLD=fallout2d20-smoke \
./ci/run_headless_validation.sh
```

`FOUNDRY_APP_PATH` accepts either the root of the Node distribution (containing `main.js`) or the desktop installation root (containing `resources/app/main.js`). Set `FOUNDRY_NODE` when the required Node runtime is not the default executable.

The script starts the installed Foundry server on port `30001` (override with `FOUNDRY_SMOKE_PORT`), waits for an HTTP response, and fails on module startup errors. This local/Oracle check is intentionally separate from GitHub CI because the Foundry application is licensed and is not stored in the repository.

With the dedicated server still running and Playwright installed outside the repository, the browser-level functional smoke test can be run with:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
FOUNDRY_URL=http://127.0.0.1:30001 \
FOUNDRY_USERNAME=Gamemaster \
FOUNDRY_PASSWORD= \
node ci/run_foundry_browser_validation.mjs
```

This opens a real Chromium client, loads every module pack, resolves all embedded UUID links, renders representative Item, Actor, and RollTable sheets, draws every English Core table, and creates then removes representative world documents and an embedded Item.

For US-104, use separate GM and player browser profiles in the dedicated world.
On each profile, exercise English, French, and both; reconnect and confirm that
the client choice persists independently. For each single-language choice,
resolve and open a known UUID from the hidden language in the console and
confirm `game.packs` still contains all 40 module packs. No user world is an
acceptable target for this check.
