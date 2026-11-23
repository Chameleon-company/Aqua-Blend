# Contributing to AquaBlend

This is the main AquaBlend repository, shared by all project teams. Before making changes, create a separate branch from `master`. All changes must be made on that branch and merged back into `master` through a pull request (PR) after review and approval. **Do not work directly on** `master`.

## Rules

- Work in the main repository. Do not create a separate fork for your changes.
- Create a separate branch for each task or related set of changes, and make all commits on that branch.
- Every PR requires 2 approvals before merging.
- All PRs must target `master` in `Chameleon-company/Aqua-Blend`.

## Setup (once)

Clone the main repository:

```bash
git clone https://github.com/Chameleon-company/Aqua-Blend.git
cd Aqua-Blend
```

Check that your remote points to the main repository:

```bash
git remote -v
```

## Making a change

### 1. Create a branch from master

Make sure your local master branch is up to date:

```bash
git checkout master
git pull origin master
git checkout -b feature/short-description
```

Use the following naming conventions:

- feature/... — New functionality
- fix/... — Bug fixes
- docs/... — Documentation changes
- test/... — Testing improvements

Keep each branch focused on one task or related set of changes.

For example, feature/milp-treatment-stages or docs/update-contributing.

### 2. Make your changes, commit and push

Work on your branch and commit your changes:

```bash
git status
git add <files-to-commit>
git commit -m "Short, clear message"
git push -u origin feature/short-description
```

Stage only the files relevant to your task.

Once your branch has been pushed, subsequent changes can be pushed using:

```bash
git push
```

### 3. Open a pull request

1. Open the main AquaBlend repository.
2. Select **Pull requests → New pull request**.
3. Check the branch selection:
   - **Base repository:** `Chameleon-company/Aqua-Blend`
   - **Base branch:** `master`
   - **Compare branch:** Your feature branch
4. Complete the PR template.
5. Request two reviewers.

### 4. Review and merge

Every PR requires 2 approvals.

Before merging:

- Address review comments and resolve discussions.
- Make sure required tests and checks pass.
- Obtain both approvals.
- Check that the PR targets `master`.

Delete the feature branch after merging.

## Keeping your branch up to date

If `master` changes while you're working, update your branch:

```bash
git checkout feature/short-description
git fetch origin
git merge origin/master
```

Resolve any merge conflicts, then push:

```bash
git push
```

For active PRs, make sure your branch includes the latest relevant changes from `master` before merging.
