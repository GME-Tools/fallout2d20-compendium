---
name: foundry-qualification
description: Qualify a Fallout 2d20 compendium candidate in Foundry when the owner or current work explicitly requires runtime smoke, browser, compatibility, or release-candidate validation.
---

Read `AGENTS.md`, `docs/STATE.md` and `docs/TESTING.md`. Read `docs/WORK.md`
only when it defines additional qualification requirements for the current work.

Use a dedicated/disposable world only. Qualify the exact candidate commit against the
runtime compatibility contract. Run focused repository checks first and the full CI
gate only on the final candidate when required.

Exercise only the runtime surfaces relevant to the candidate plus required regression
coverage: pack visibility, imports, sheets, embedded Items, drag/drop, UUID resolution
and RollTable draws as applicable.

Do not record qualification for a different commit and do not modify release gates or
publish anything unless explicitly authorized.
