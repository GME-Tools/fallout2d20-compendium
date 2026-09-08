# V1.0.0 post-release qualification report

## Traceability

- Report date: 2026-09-07
- Qualified release: `v1.0.0`
- Release commit: `81daa0628c8e804736dd233754ebedf1c2315353`
- Qualification story: `US-101 - Qualifier la dette et la validation terrain de la V1`
- Owner validation: explicitly granted on 2026-09-07

This report records the post-release baseline only. No functional or editorial
defect was corrected as part of US-101.

## Release baseline

- The published manifest and package version are `1.0.0`.
- The manifest declares Foundry VTT 14 compatibility and Fallout system
  11.17.1 or later.
- The release contains 40 packs, 2,764 root documents and 5,532 compiled
  LevelDB records.
- GitHub CI and release packaging passed for V1.0.0.
- Local human acceptance passed on Foundry 14.367 with Fallout 11.17.1.
- The recorded local acceptance validated both languages, representative
  imports and sheets, embedded documents, UUID links, ammunition behavior,
  recipes and RollTable draws.
- The generated content audit records zero actionable editorial issues.

## Oracle post-release deployment

**Result: passed on owner declaration.**

The owner confirmed on 2026-09-07 that V1.0.0 was deployed on Oracle, that the
Foundry and Node versions were appropriate for the deployment, and that the
result should be considered successful. No particular error or warning was
reported.

The exact Foundry, Fallout system and Node versions, the operating environment,
the world type, the detailed interactive checks and the Oracle logs were not
provided. The Oracle evidence is therefore a field result declared by the
owner, not a reproducible technical transcript. This missing detail is not
interpreted as either a hidden success or a hidden failure.

The owner also reported that users were satisfied and that no particular user
feedback had been received. No defect, regression or irritant is inferred from
that general positive report.

Oracle remains a pre-release gate for V1.0.1 and later planned milestones unless
the owner explicitly documents a waiver. This successful post-release V1.0.0
declaration does not replace those future gates.

## Classified inventory

### V1-DEBT-ART-001 - Tracked Core artwork placeholders

- Source: `reports/missing-core-artwork.md`, `CHANGELOG.md` and the V1 baseline.
- Environment: all supported Foundry environments; English and French packs.
- Reproduction: confirmed statically; 544 canonical English documents and
  their French counterparts retain tracked placeholders.
- User impact: reduced visual specificity; no known functional obstruction.
- Classification and severity: planned debt; minor.
- Proposed priority: P3.
- Destination: `v1.0.2`.
- Correction story: `US-201` through `US-205` already cover inventory,
  illustration lots, qualification and delivery.
- Available evidence: generated missing-artwork report and per-document artwork
  metadata.
- Information still required from owner: approved official source assets and
  per-lot visual approvals when the illustration stories begin.

### V1-DOC-001 - Conflicting Oracle Node guidance

- Source: `docs/TESTING.md` allows Node 20 for Oracle tooling, while
  `docs/V14-QUALIFICATION.md` records that Foundry 14.367 requires Node 24.13.1
  or later in the Node 24 line.
- Environment: Oracle deployment and future Foundry server qualification.
- Reproduction: confirmed by comparing the checked-in documentation; no Oracle
  runtime failure was reported.
- User impact: a maintainer could select the build-tool Node version for the
  licensed Foundry server and obtain a failed or misleading qualification run.
- Classification and severity: important but non-blocking documentation defect.
- Proposed priority: P2.
- Destination: `v1.0.1`.
- Correction story: create or complete a documentation/qualification task under
  the V1.0.1 consolidation scope.
- Available evidence: the two checked-in documentation statements and the
  successful Oracle result declared by the owner.
- Information still required from owner: exact Oracle Node version only if a
  reproducible environment record is later desired.

### V1-DOC-002 - Stale cross-cutting progress label

- Source: `docs/V1-CONTENT-PLAN.md` labels the cross-cutting lot "In progress"
  while the same document and the acceptance reports record V1 completion.
- Environment: project documentation only.
- Reproduction: confirmed by comparing the checked-in status and completion
  evidence.
- User impact: minor ambiguity about whether V1 qualification was completed.
- Classification and severity: optional documentation improvement; minor.
- Proposed priority: P3.
- Destination: `v1.0.1`.
- Correction story: create or complete a documentation task under the V1.0.1
  consolidation scope.
- Available evidence: `docs/V1-CONTENT-PLAN.md`, `docs/V14-QUALIFICATION.md` and
  `reports/v1-local-acceptance.md`.
- Information still required from owner: none.

### V1-VAL-001 - Browser qualification pinned to Foundry 14.367

- Source: `ci/run_foundry_browser_validation.mjs` asserts the exact Foundry
  version `14.367`, while the accepted compatibility policy requires each
  future lot to test the latest stable Foundry v14 version available at its
  start and the previously qualified pair while available.
- Environment: automated browser qualification for future releases.
- Reproduction: confirmed by static inspection; no impact on the completed
  V1.0.0 qualification is observed.
- User impact: the current scenario cannot serve unchanged as evidence for a
  newer v14 qualification target.
- Classification and severity: planned validation debt; important before the
  next release, non-blocking for V1.0.0.
- Proposed priority: P2 before release.
- Destination: `v1.0.1`.
- Correction story: complete `US-106` or create a dedicated prerequisite
  validation story if the change must precede final V1.0.1 qualification.
- Available evidence: browser validation script and the compatibility decision
  recorded for US-000.
- Information still required from owner: the latest stable compatible
  Foundry/Fallout pair at the start of the future qualification lot.

### V1-OBS-ORACLE-001 - Oracle technical details not recorded

- Source: owner declaration on 2026-09-07.
- Environment: Oracle deployment of V1.0.0; exact versions not supplied.
- Reproduction: deployment success confirmed by the owner; detailed checks and
  logs unavailable.
- User impact: none reported; reduces only the reproducibility and precision of
  the historical evidence.
- Classification and severity: information missing / observation not
  independently reproduced; informational.
- Proposed priority: P3 documentation.
- Destination: no corrective action for V1.0.0.
- Correction story: none required. Future releases use their own Oracle gate.
- Available evidence: owner confirmation that deployment succeeded, no
  particular errors were observed and users were satisfied.
- Information still required from owner: none for closure of US-101; exact
  versions and logs would be optional historical enrichment.

## Conclusion and routing

No blocking defect, reproduced post-release regression or known functional
defect is recorded for V1.0.0. The inventory contains one planned artwork debt,
two documentation items, one future-validation debt and one explicitly limited
Oracle evidence observation. Every item has a priority and a destination.

The owner explicitly accepted the classifications, priorities and destinations
on 2026-09-07, then explicitly validated this US-101 report. US-101 is complete.
According to the accepted dependency graph, US-102 may start in a separate
conversation. US-102 is not started by this report.
