# Contributing to AquaBlend

This is the main AquaBlend repository, shared by all project teams. All changes should be made on a separate branch and merged into master through a pull request (PR) after review and approval. **Do not push changes directly to master.**

## Rules

- Work in the main repository. Do not create a separate fork for your changes.
- Keep MILP implementation and testing changes inside the MILP/ folder. Changes to shared files, integration components or team-process documentation should be coordinated with the relevant team members.
- Create a separate branch for each task or related set of changes.
- Never push commits directly to master.
- Every PR requires 2 approvals before merging.
- All PRs must target master in Chameleon-company/Aqua-Blend.

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

**1. Create a branch from master**

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

**2. Make your changes, commit and push**

Work on your branch and commit your changes:

```bash
git add .
git commit -m "Short, clear message"
git push -u origin feature/short-description
```

Stage only the files relevant to your task.

Once your branch has been pushed, subsequent changes can be pushed using:

```bash
git push
```

**3. Open a pull request**

1. Open the main AquaBlend repository.
2. Select **Pull requests → New pull request**.
3. Check the branch selection:
   - **Base repository:** `Chameleon-company/Aqua-Blend`
   - **Base branch:** `master`
   - **Compare branch:** Your feature branch
4. Complete the PR template.
5. Request two reviewers.

Do not open a pull request directly from master or against an old team fork.

**4. Review and merge**

Every PR requires 2 approvals.

Before merging:

- Address review comments and resolve discussions.
- Make sure required tests and checks pass.
- Obtain both approvals.
- Check that the PR targets master.

Delete the feature branch after merging.

## Keeping your branch up to date

If master changes while you're working, update your branch:

```bash
git checkout feature/short-description
git fetch origin
git merge origin/master
```

Resolve any merge conflicts, then push:

```bash
git push
```

For active PRs, make sure your branch includes the latest relevant changes from master before merging.

## Do not

Do not create individual forks for team development.

- Do not push directly to master.
- Do not make unrelated changes in the same PR.
- Do not modify another stream's files without coordinating with that team.
- Do not force-push to master.
- Do not merge a PR without 2 approvals.
- Do not delete or overwrite another contributor's work.
