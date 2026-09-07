# US-103 French weight qualification

## Scope and rule

The English Core documents corrected against Errata Log V6 (2026) are the
mechanical source. Every comparable French value uses exact division by two,
with no source rounding and no approved exception.

The exhaustive machine-readable inventory is
`reports/us103-french-weight-inventory.json`. It covers:

- root Item `system.weight`;
- nested `system.mods.<id>.system.weight` snapshots;
- Actor `items.<id>.system.weight` documents;
- robot armor `system.carry` modifiers;
- Actor `system.carryWeight.{base,value,mod}` capacity values.

RollTable result weights, quantities, charges, magazine capacities,
`slow_load`, descriptions, recipes and effect numbers are not physical weight
fields and are excluded.

## Inventory result

- 3,565 paired weight/capacity fields;
- 3,178 root or nested Item weight fields;
- 231 Actor-embedded Item weight fields;
- 51 robot carry modifiers;
- 105 Actor capacity fields;
- zero missing pairs, non-numeric French values, divergences or exceptions.

The correction changed 2,788 Item-weight values or numeric types and 79
capacity/carry values. English sources, names, descriptions, provenance, IDs,
`_key` values, pack declarations and UUID inputs are unchanged.

## Fallout runtime consequences

Fallout 11.17.1 uses a world-wide unit setting, converts pounds with the
real-world factor `0.4535924`, truncates robot carry modifiers with `parseInt`,
and rounds inventory totals to two decimals. That behavior conflicts with the
French book convention and loses valid `2.5 kg` modifiers.

The module compatibility runtime now recognizes its French documents through
their provenance and applies:

- `STR × 5 + carryBase` for character and NPC capacity when the world setting
  is kilograms (the configured base is already in kilograms);
- conversion of the configured base by `/2` only when a provenance-marked
  French Actor is used while the world remains configured in pounds;
- 25 kg per excess encumbrance level;
- `parseFloat`-equivalent handling of French robot carry modifiers;
- exact French Item totals, with only the Fallout sheet total rounded to two
  decimals;
- kilogram display selection for French Actors.

When the world uses pounds, English and external Actors retain the Fallout
system behavior. When it uses kilograms, all Actors receive the exact French
calculation, including newly created Actors without module provenance. No user
world migration is performed.

## Automated evidence

- `npm run audit:weights`: exhaustive comparison with field-level diagnostics;
- `test/french-weights.test.mjs`: roots, nested mods, embedded Items, missing or
  invalid values, fractions, zeros, no-exception policy and inventory totals;
- `test/runtime-compat.test.mjs`: French/English routing, Actor capacity,
  inventory totals and fractional robot modifiers;
- `test/v1-identity-stability.test.mjs`: 2,764 document identity tuples and 40
  pack declarations retain their accepted hashes.

## Foundry validation status

The owner completed proportionate interactive validation in Foundry on
2026-09-07 and accepted the result. The checks covered a converted French root
Item, an imported French Actor with converted embedded equipment, a fractional
robot carry modifier, and a newly created Actor in a kilogram-configured world.
For the latter, Strength 5 with a configured base of 75 produced the expected
100 kg capacity after the runtime correction. No console error was reported.

US-103 is complete and accepted. US-104 may start in a separate conversation.
