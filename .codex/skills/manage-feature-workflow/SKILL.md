---
name: manage-feature-workflow
description: Route KIYOYO implementation work through the required Git workflow. Use whenever creating or substantially updating a feature, fixing a bug, refactoring code, or making another repository change that must be classified as major or lightweight before editing. Isolate major feature work in a new `.worktree/` worktree and open a PR only after tests pass; perform lightweight changes on a dedicated branch and commit them.
---

# Manage Feature Workflow

Classify the requested change before editing, then use the matching isolation, test, commit, and PR workflow. Preserve all pre-existing user changes.

## Inspect Before Changing Files

1. Inspect the repository root, current branch, working-tree status, existing worktrees, and relevant repository instructions.
2. Treat existing modified or untracked files as user-owned. Do not stash, discard, overwrite, amend, or include them unless the user explicitly places them in scope.
3. Never implement or commit directly on `main` or another protected base branch.
4. Use the repository's branch and commit conventions when present; otherwise prefix branches with `codex/`.

## Classify the Change

Treat work as **major** when it includes any of the following:

- A new user-facing or admin feature.
- A substantial update to an existing feature or workflow.
- Cross-cutting changes spanning multiple subsystems.
- Schema migrations, authentication or authorization changes, checkout or payment changes, public API changes, infrastructure changes, or risky dependency upgrades.
- Work whose scope, rollback risk, or test surface warrants strong isolation.

Treat work as **lightweight** when it is narrow and low risk, such as a typo, copy update, small style adjustment, localized bug fix, minor configuration change, or contained refactor with no behavioral or architectural expansion.

When classification is genuinely ambiguous, prefer the major workflow. State the classification briefly in the first progress update.

## Major Feature Workflow

1. Resolve the repository root and choose the intended base branch. Do not assume the current checkout is clean or current.
2. Create a dedicated branch named `codex/<short-feature-slug>` and add a linked worktree at `<repo-root>/.worktree/<short-feature-slug>`.
3. Keep `.worktree/` out of the parent checkout's status. Prefer a local Git exclude entry when the repository does not already ignore it; do not modify the tracked `.gitignore` solely for this without user approval.
4. Perform every implementation, dependency, generation, and test command for the feature inside that new worktree.
5. Run the relevant focused tests, then the broader repository checks warranted by the change. Include build, type, lint, migration, or end-to-end checks when applicable.
6. If any required check fails, do not open the PR. Fix the failure or report the exact blocker and the checks that remain incomplete.
7. Review the final diff for unintended files and secrets. Commit only the feature's files using the repository's commit-message convention.
8. After required tests pass, push the feature branch and create a PR against the intended base branch. Summarize the change, risk, and exact test evidence in the PR. Do not claim an unrun check passed.
9. Do not remove the worktree or branch until the PR is merged or the user explicitly asks for cleanup.

## Lightweight Change Workflow

1. Create or switch to a dedicated `codex/<short-change-slug>` branch before editing. Reuse the current branch only when it is already dedicated to the same requested change.
2. Make the minimal scoped change in the current checkout and run proportionate tests or checks.
3. Review the diff and commit only the requested files. Never absorb unrelated pre-existing changes.
4. Do not push or open a PR unless the user requests it or repository policy requires it.

If the current checkout contains unrelated changes and switching branches could disturb them, use a separate worktree as a safety exception even for lightweight work.

## Completion Report

Report the classification, branch, worktree path when used, commit, tests run and their outcomes, and PR link when created. Clearly identify any skipped or failing checks.
