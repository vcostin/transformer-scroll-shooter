# Contributing Guide

Thanks for your interest in contributing! This project follows a few simple rules to keep quality high and reviews smooth.

## Workflow

1. Create a feature branch from `master`.
2. Implement changes with tests.
3. Run locally:
   - `npm run lint`
   - `npm run format:check`
   - `npm run test:run`
4. Create a PR using GitHub CLI: `gh pr create`.
5. Request review. Do not merge without human approval.
6. After approval, squash-merge and delete the branch.

## Codebase Rules

- Vitest only — use `vi.*` for mocks/spies/timers. No Jest APIs.
- ESLint for linting; Prettier for formatting.
- Use `Object.prototype.hasOwnProperty.call(obj, key)`.
- ESM only (`type: module`), Node >= 18.
- Prefer `src/` over legacy `js/`.

## Tests

- Tests run in `jsdom` environment.
- Shared setup in `test/setup.js`.
- Coverage via `vitest --coverage`.

## Docs

- See `docs/PROJECT_RULES.md` for project rules.
- Automation guidance: `.vscode/copilot-instructions.md`.
