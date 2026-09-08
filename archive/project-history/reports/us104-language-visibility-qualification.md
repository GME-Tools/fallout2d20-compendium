# US-104 language visibility qualification

## Setting contract

- Namespace/key: `fallout2d20-compendium.languageVisibility`.
- Scope: `client`; it is available independently to every role and is never
  written by a GM for another client.
- Type and values: string `both`, `en`, or `fr`.
- Default and compatibility fallback: `both`. An unknown or obsolete stored
  value is treated as `both` when rendering.
- Labels and help text are supplied in English and French.

## Runtime behavior

The setting uses Foundry v14's public client-setting registration and
`renderCompendiumDirectory` lifecycle hook. At each directory render, only DOM
entries whose `data-entry-id` identifies this module and the hidden language
are removed from that rendered navigation. If its 20 entries are removed, the
now-empty affected language folder is removed from that render as well.

`both` removes nothing. `en` removes the 20 `fr-*` entries, and `fr` removes
the 20 `en-*` entries. Other modules' and the world's compendiums are untouched.
Changing the setting rerenders only the Compendium directory; no page reload,
content migration, pack registration change, or document write is performed.

This implementation does not mutate, delete, replace, lock, unregister, or
otherwise alter `game.packs`. Consequently Foundry's UUID resolver continues
to address documents in packs absent from the navigation.

The DOM adapter accepts both Foundry directory identifiers (`data-entry-id`
and `data-pack`), fully qualified or bare pack IDs, as well as both native
elements and the legacy hook wrapper shape. This compatibility was added after
the first local test showed that the original fully-qualified
`data-entry-id`-only selector did not match the rendered Foundry directory.

## Automated evidence

- `test/language-visibility.test.mjs`: exact setting contract, all values,
  obsolete-value fallback, targeted DOM filtering, empty language folder,
  initialization, live setting changes, separate GM/player choices, retention
  of 40 `game.packs` collections, and resolution of a hidden UUID.
- `test/v1-identity-stability.test.mjs`: the 2,764 root identity tuples and 40
  declarations retain their accepted hashes.
- `test/provenance.test.mjs` and `test/publications.test.mjs`: the US-102
  registry/provenance contract, including `core_rulebook`, remains covered.
- `npm run audit:weights`: all 3,565 US-103 fields retain exact expected values.
- `test/runtime-compat.test.mjs`: US-103 French capacity behavior remains
  covered alongside the visibility runtime.

The full `npm run ci` pipeline passed on 2026-09-07 with zero validation
warnings: 2,764 root documents, 42 test files, 5,532 compiled records in 40
packs, and a verified 973-file release archive. The archive contains both
localization files.

## Foundry validation

The owner tested the corrected runtime locally on 2026-09-07 and confirmed
that selecting French hides the English packs. The first local attempt had
exposed a DOM-compatibility defect; the owner explicitly confirmed the fix and
accepted US-104 after retest.

The automated suite separately covers English, French, both, unknown values,
GM/player client independence, persistence contract, preservation of all 40
registered packs, and hidden UUID resolution. Together with the owner's local
retest, this closes US-104. US-105 may start in a separate conversation.
