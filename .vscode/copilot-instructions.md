# GitHub Copilot Instructions

## GitHub Workflow Rules - ALWAYS FOLLOW

### Branch Management - CRITICAL RULE
- 🚨 **NEVER COMMIT DIRECTLY TO MASTER/MAIN** - Always create feature branches first
- ✅ **COMMITS TO FEATURE BRANCHES ARE ENCOURAGED** - Commit work as it completes naturally
- ✅ ALWAYS create feature/fix/enhancement branches before any development work
- ✅ Pattern: `feature/story-enhancements`, `fix/powerup-bug`, `enhancement/ui-improvements`
- ✅ Create branch BEFORE making any changes or commits
- ✅ Only master/main should receive changes via reviewed PRs

### PR Creation
- ✅ Use `gh pr create` CLI tool for ALL PRs
- ✅ For large/markdown descriptions: Create temp file, use `gh pr create --body-file temp.md`, then delete temp file
- ✅ Never use git commands for GitHub operations

### PR Merging  
- ⚠️ **NEVER MERGE WITHOUT REVIEW** - PRs must be reviewed before merging
- ⚠️ **NEVER MERGE UNLESS EXPLICITLY ASKED** - Only merge when user specifically requests it
- ✅ Wait for human review and approval before merging
- ✅ Use `gh pr merge <number> --squash --delete-branch` for ALL merges AFTER review
- ✅ ALWAYS squash merge (keeps master history clean)
- ✅ ALWAYS delete branch after merge
- ✅ Never do local git merges
- ✅ GitHub Copilot and humans should review code together

### File Cleanup
- ✅ Delete temporary description files after PR creation
- ✅ Commit cleanup before final operations

## Reminder: Ask "Should I use gh CLI?" before any GitHub operation
## **CRITICAL**: NEVER merge PRs without human review - where's the fire? Take time for proper review!
## **IMPORTANT**: Only merge PRs when explicitly asked by the user - don't auto-merge!

## ⚠️ VIOLATION TRACKING ⚠️
**Date: 2025-07-20** - VIOLATED: Did local git merge instead of gh pr create + review process
- Consequence: Lost user trust, violated established workflow
- Commitment: Must follow copilot-instructions.md without exception
- Accountability: Any future violation means this AI assistant cannot be trusted with GitHub operations

**Date: 2025-08-22** - VIOLATED: Committed directly to master branch instead of creating feature branch first
- Consequence: Broke branch protection workflow, made changes outside of PR process
- Rule Added: Always create feature/fix/enhancement branches BEFORE any development work
- Commitment: Must create branches first, then commit, then create PR

## 🔒 MANDATORY CHECKS BEFORE ANY GIT/GITHUB OPERATION:
1. ❓ Did I read copilot-instructions.md first?
2. ❓ Am I on a feature branch (NOT master/main)?
3. ❓ For GitHub operations: Am I using gh CLI instead of git commands?
4. ❓ For PR merging: Did the user explicitly ask me to merge, or am I assuming?
5. ❓ For PR merging: Has this PR been reviewed by a human?
6. ❓ Am I following the exact workflow specified in the instructions?

**For regular commits to feature branches: Commit when work naturally completes!**
**If ANY GitHub operation answer is NO, STOP and ask the user for clarification.**

## Examples:

### Creating PR with large description:
```bash
# Create temp file for large description
cat > pr-description.md << 'EOF'
# Large PR Description
...
EOF

# Create PR with file
gh pr create --title "feat: description" --body-file pr-description.md

# Clean up temp file
rm pr-description.md
```

### Merging PR (ONLY AFTER HUMAN REVIEW AND EXPLICIT REQUEST):
```bash
# Wait for review first AND explicit user request to merge!
gh pr merge <number> --squash --delete-branch
```

## Never Use:
- ❌ `git merge`
- ❌ Manual GitHub UI operations
- ❌ Local merge commands
- ❌ Direct git push for PR operations
- ❌ **MERGING WITHOUT REVIEW** - This is the biggest mistake!
- ❌ **AUTO-MERGING** - Only merge when explicitly requested by user!
