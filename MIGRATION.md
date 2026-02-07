# Migration Checklist: Gitflow to GitHub Flow

This checklist covers the safe migration from Gitflow (`develop`/`main` separation) to GitHub Flow (feature branches directly to `main`), including the addition of Release Please for automated versioning.

---

## Pre-Flight

- [ ] Confirm all in-flight PRs targeting `develop` are merged or closed.
- [ ] Confirm `develop` is fully merged into `main` (no commits on `develop` that aren't on `main`).
  ```bash
  git log main..develop --oneline
  # Should return empty. If not, merge develop into main first.
  ```
- [ ] Notify the team that the branching model is changing.

---

## Step 1: Create the Migration Branch

```bash
git checkout develop
git pull origin develop
git checkout -b chore/migrate-to-github-flow
```

---

## Step 2: Add New Files and Update Docs

On the `chore/migrate-to-github-flow` branch, add/update these files:

- [ ] **`.github/workflows/release.yml`** -- Release Please workflow (triggers on push to `main`).
- [ ] **`AGENTS.md`** -- Replace "Git Strategy (Gitflow)" with "Git Strategy (GitHub Flow)".
- [ ] **`CONTRIBUTING.md`** -- Rewrite branch strategy section to document GitHub Flow + Release Please.
- [ ] **`.github/workflows/ci.yml`** -- Remove `develop` from the push branch trigger list.
- [ ] **`.github/copilot-instructions.md`** -- Update the Git Strategy section to match AGENTS.md changes (if this file mirrors AGENTS.md content).

Commit:

```bash
git add -A
git commit -m "chore(ci): migrate from Gitflow to GitHub Flow with Release Please"
```

---

## Step 3: Verification PR (docs review)

Open a PR from `chore/migrate-to-github-flow` -> `develop`:

```bash
git push -u origin chore/migrate-to-github-flow
gh pr create \
  --base develop \
  --head chore/migrate-to-github-flow \
  --title "chore(ci): migrate from Gitflow to GitHub Flow with Release Please" \
  --body "## Summary
- Replaces Gitflow branching model with GitHub Flow
- Adds Release Please workflow for automated versioning
- Updates AGENTS.md and CONTRIBUTING.md to reflect new strategy
- Removes \`develop\` branch from CI triggers

## Review Focus
- Verify documentation accuracy
- Confirm Release Please workflow syntax
- Check that no references to \`develop\` branch remain in docs"
```

- [ ] CI passes on this PR.
- [ ] Documentation reviewed and approved.
- [ ] Merge this PR into `develop`.

---

## Step 4: The Migration PR (develop -> main)

Once the docs PR is merged into `develop`, open the final migration PR:

```bash
gh pr create \
  --base main \
  --head develop \
  --title "chore(ci): migrate from Gitflow to GitHub Flow" \
  --body "## The Migration PR

This merges all Gitflow-to-GitHub-Flow changes into \`main\`.

After this PR is merged:
1. \`develop\` branch becomes obsolete
2. All future feature branches target \`main\` directly
3. Release Please will begin managing versions automatically

## Post-Merge Actions
- [ ] Delete the \`develop\` branch
- [ ] Update branch protection rules on \`main\`
- [ ] Communicate the change to the team"
```

- [ ] CI passes.
- [ ] PR reviewed and approved.
- [ ] Merge into `main`.

---

## Step 5: Delete the `develop` Branch

**Only do this after the migration PR is merged into `main`.**

```bash
# Delete remote
git push origin --delete develop

# Delete local
git branch -d develop
```

### Safety check before deleting:

```bash
# Verify develop is fully merged into main
git fetch origin
git log origin/main..origin/develop --oneline
# Must be empty. If it shows commits, DO NOT delete.
```

---

## Step 6: Post-Migration Cleanup

- [ ] Update GitHub branch protection rules:
  - Remove any rules specific to `develop`.
  - Ensure `main` has appropriate protections (require PR reviews, require CI to pass).
- [ ] Update any CI/CD pipelines that reference `develop` (Cloudflare Pages, etc.).
- [ ] Set `main` as the default branch in GitHub repo settings (if not already).
- [ ] Verify Release Please creates its first Release PR on the next `feat:` or `fix:` commit to `main`.
- [ ] Communicate to the team:
  - No more `develop` branch.
  - All feature branches go from `main` and PR back to `main`.
  - Use Conventional Commits (`feat:`, `fix:`) to trigger releases.

---

## Rollback Plan

If something goes wrong after merging to `main`:

1. The `develop` branch can be recreated from the commit before deletion:
   ```bash
   git checkout -b develop <last-develop-commit-sha>
   git push origin develop
   ```
2. Revert the CI workflow changes:
   ```bash
   git revert <migration-commit-sha>
   ```
3. Delete `.github/workflows/release.yml` if Release Please causes issues.

**Save the last `develop` commit SHA before deleting the branch.**
