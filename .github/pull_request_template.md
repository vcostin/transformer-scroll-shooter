## Summary

Describe what this PR changes and why.

## Checklist

- [ ] PR body is Markdown and clear
- [ ] Follows Codebase Rules (see `docs/PROJECT_RULES.md`)
  - [ ] Vitest-only (no Jest APIs)
  - [ ] ESLint/Prettier clean locally (`npm run lint`, `npm run format:check`)
  - [ ] Uses safe `Object.prototype.hasOwnProperty.call`
- [ ] Follows VCS/GitHub Workflow Rules (see `docs/PROJECT_RULES.md` and `.vscode/copilot-instructions.md`)
  - [ ] Created with `gh pr create` (or equivalent)
  - [ ] Not merging without human review
  - [ ] Will squash-merge and delete branch after approval

## Validation

- [ ] Tests pass locally (`npm run test:run`)
- [ ] CI is green (lint/format and tests as applicable)

## Notes

Anything else reviewers should know?

## 🎯 Pull Request Title

Brief description of the changes in this PR.

### 📋 **Issue Reference**

Closes #(issue number)

### ✨ **Changes Made**

- [ ] Feature implementation
- [ ] Bug fix
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

### 🔧 **Technical Details**

- **Files Modified:**
  - `file1.js`: Description of changes
  - `file2.js`: Description of changes

- **Architecture Changes:**
  - Describe any architectural changes or new patterns introduced

### 🧪 **Testing**

- [ ] Manual testing completed
- [ ] Edge cases covered
- [ ] Performance testing done (if applicable)
- [ ] Cross-browser testing (if applicable)

### 📱 **Screenshots/Demo**

If applicable, add screenshots or demo links to help reviewers understand the changes.

### 🚀 **Version Impact**

- [ ] **Major:** Breaking changes (will increment major version)
- [ ] **Minor:** New features (will increment minor version)
- [ ] **Patch:** Bug fixes, documentation, small improvements (will increment patch version)

### 📝 **Additional Notes**

Any additional information that reviewers should know.

### ✅ **Checklist**

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated (if needed)
- [ ] No console errors or warnings
- [ ] Changes are backward compatible (or marked as breaking change)
