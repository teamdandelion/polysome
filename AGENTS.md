# Agent workflow

Use GitHub's official `gh stack` extension for pull-request change management. Keep every layer focused, keep the working tree clean before stack operations, and let only one worktree own the locally tracked stack.

- Inspect the chain with `gh stack view --json`. Start dependent work from its top with `gh stack top`, then `gh stack add codex/<concern>`. Start unrelated work with `gh stack init --base main codex/<concern>`.
- Commit and test normally. Publish or update the chain with `gh stack submit --auto --open --remote origin`, then polish generated PR text with explicit `gh pr edit <PR-number> --title ... --body-file ...` arguments.
- Put a fix in the layer that owns it: navigate with `gh stack down` or `gh stack checkout <branch>`, commit there, run `gh stack rebase --upstack --remote origin`, then `gh stack push --remote origin` and `gh stack top`.
- Resume an existing remote stack with `gh stack checkout <PR-number>`. Reconcile it after merges with `gh stack sync --remote origin` from a clean tree; add `--prune` only after verifying that deleting merged local branches will not disrupt another worktree.
- If `sync` reports divergence or a rebase conflicts, stop and report it. Do not use interactive `gh stack modify` from an agent.
- Do not run `gh stack merge`, `gh stack unstack`/`delete`, manual force-pushes, or `gh pr merge` on a stacked PR without explicit user approval.

Reference: [GitHub's stacked pull request CLI guide](https://docs.github.com/en/pull-requests/reference/stacked-prs-cli-commands).
