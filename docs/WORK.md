# Active work — Core Rulebook certification

> Temporary execution checkpoint. Astoundingly Awesome Tales remediation is paused
> while this owner-requested Core certification is active. Do not resume AAT work
> until this file is replaced or removed.

## Goal and authority

Certify the reusable structured content of the *Fallout: The Roleplaying Game Core
Rulebook* exhaustively in English and French.

Mechanical authority is the February 2023 English Core Rulebook plus the latest
approved Errata V6 (2026). The official French Core Rulebook is the localization
authority for names, descriptions and terminology, adapted when necessary to the
canonical EN + Errata mechanics.

Audit direction is strictly:

`PDF source -> Errata -> expected inventory -> canonical -> locale EN -> locale FR`

Existing packs, catalogs and tests are evidence to inspect, never the starting
authority for expected content.

## Certification inventory

The source-driven durable inventory is
`catalog/core-rulebook-certification.json`. It records page review coverage plus
in-scope and explicitly excluded structured candidates. Do not generate it from
existing packs.

Current completed boundary:

- EN PDF physical pages 1–41, through printed/source page 39.
- FR PDF physical pages 1–42, through printed/source page 39.
- Completed editorial sections: front matter, Introduction, Chapter One (Core
  Rules / Règles du jeu), and Chapter Two (Combat).
- Verified in-scope documents in this range: the three p.28 hit-location RollTables
  (standard, quadruped, flying insect).
- Static rules summaries/reference tables and general rules prose in this range are
  explicitly out of scope in the catalog.
- Errata reviewed in this range: p.20 Luck wording (Q3 2026), p.28 quadruped/flying
  insect hit locations, and p.29 Random Quantities.
- The official FR p.28 flying-insect table combines 15–20 as `Pattes`; canonical
  EN + Errata retains 15–17 and 18–20 as two rows. The FR overlay correctly
  localizes both canonical rows to `Pattes`.

## Next lot

Continue with Chapter Three — Character Creation, beginning at printed/source page
42. Audit in reasonable sub-sections rather than treating the current catalogs as
proof. The first useful sub-lot is S.P.E.C.I.A.L., Skills and derived statistics,
including the p.44 Gauss/skill errata.

Known later Core suspects to re-check against source rather than assume true:

- Energy Weapons wording and Gauss weapons versus Errata V6.
- Boosted Capacitor cost.
- `Capactor Boosting Coil` / `Capacitor Boosting Coil` duplicate.
- Shielded Barrel crafting/recipe handling.
- Denizen Actor and embedded-Item completeness, especially salvage/butchery.

There are no unresolved anomalies or owner decisions in the completed p.1–39
boundary.

## Validation

`test/core-certification.test.mjs` enforces gapless page review through the current
boundary, explicit scope/status fields, bilingual identity/provenance for verified
entries, and absence of unexplained Core documents sourced before p.40.

Run focused checks as each lot is added. Final completion still requires
`npm audit --audit-level=high`, `npm run ci`, and disposable Foundry qualification
on the required compatibility matrix. Only after the whole Core is certified should
`docs/STATE.md` be updated and this temporary file removed.
