# Project Rules

This document captures the agreed rules for this repository. It’s split into:
- Codebase rules (tooling, testing, style)
- VCS/GitHub workflow rules

These rules are enforced by ESLint/Prettier/Vitest configs and the CI, and are surfaced during PR creation via the PR template.

## Codebase Rules

- Testing
  - Vitest only. Do not use Jest APIs.
  - Use `vi.*` for spies/mocks/timers; no `jest` globals/imports.
  - Test env: `jsdom` with `test/setup.js` already configured.
  - Test patterns live in `vitest.config.js` and should remain the source of truth.
- Linting & Formatting
  - ESLint (flat config) is the linter. Prettier handles formatting.
  - Run `npm run lint` and `npm run format` locally; CI checks both (no duplicate tests).
  - Use `Object.prototype.hasOwnProperty.call(obj, key)` instead of `obj.hasOwnProperty(key)`.
- Language & Runtime
  - ESM only ("type": "module"). Node >= 18 required.
  - Avoid adding new code under `js/` legacy folder; use `src/`.
- Imports & Aliases
  - Use `@` for `src` and `@test` for test utilities (see `vitest.config.js` aliases).
- Performance tests
  - `gc` usage is guarded and allowed as a global in test context via ESLint.

## VCS/GitHub Workflow Rules

These summarize the automation rules; see `.vscode/copilot-instructions.md` for the authoritative automation checklist.

- PR Creation
  - Use GitHub CLI: `gh pr create` for all PRs.
  - For long PR bodies, use a temp file: `--body-file` and delete the file after.
- Reviews & Merging
  - Never merge without human review.
  - Only merge when explicitly requested.
  - Use: `gh pr merge <number> --squash --delete-branch` after approval.
- CI Design
  - Test workflow runs tests+coverage.
  - CI workflow runs lint and Prettier checks (no duplicate test runs).
- Hygiene
  - Keep PR descriptions in Markdown.
  - Document notable rules here when they change.

Links:
- Editor/automation guide: `.vscode/copilot-instructions.md`
- Test config: `vitest.config.js`
- Lint/format configs: `eslint.config.js`, `.prettierrc`, `.editorconfig`
