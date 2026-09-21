---
name: release
description: Prepare or execute a repository release only when the owner explicitly asks to tag, publish, release, or change release qualification state.
---

Do not invoke this skill for ordinary development or validation.

Read `AGENTS.md`, `docs/STATE.md`, `docs/TESTING.md`, the active story if relevant,
`.github/workflows/release.yml`, and the release verification scripts.

Require explicit owner authorization for tagging or publishing. Verify version
metadata, changelog/release notes, full CI, exact candidate qualification, package
verification and release gates before changing release state.

Do not bypass a failing gate. A waiver must be explicit and documented by the owner.
