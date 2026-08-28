# Working in this repo

## Multiple agents run here at once

The user runs several Claude Code agents/sessions concurrently, often against this same
primary working directory. Its checked-out branch and working-tree contents can change
out from under you mid-task — another session may `git checkout` a different branch,
or have real staged/unstaged edits sitting there.

- Don't assume the branch you saw a moment ago is still checked out. Re-run
  `git branch --show-current` immediately before any git action, not just once.
- For any task that needs a specific branch checked out for more than a quick read,
  don't `git checkout` in this shared directory. Create an isolated worktree instead:
  `git worktree add ../leveluprewards-<short-task-name> <branch>` and work there. It's
  additive and can't collide with another session's checkout.
- If `git status` here shows unfamiliar staged/unstaged changes, that's likely another
  live session's in-progress work. Never discard, commit, or overwrite it. If a checkout
  looks like it carried someone else's changes onto the wrong branch, `git checkout` the
  branch they actually belong to to move them back, then stop touching this directory
  for that task and use a worktree instead.
