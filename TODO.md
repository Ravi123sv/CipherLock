# TODO - GitHub add + ensure web app works

## Step 1: Repository assessment
- [x] Checked workspace/package structure and key subpackages (cipherlock + api-server).
- [ ] Identify existing build/test scripts and deployment targets.

## Step 2: Verify builds locally
- [ ] Install dependencies (pnpm) at workspace root.
- [ ] Typecheck (whole repo) if possible.
- [ ] Build web app: artifacts/cipherlock (vite build).
- [ ] Run web app locally via preview to ensure it serves built assets.
- [ ] (If available) run api-server locally and sanity-check /api/health.

## Step 3: GitHub prep
- [ ] Ensure .gitignore includes appropriate build outputs.
- [ ] Add missing files needed for GitHub build (e.g., CI config, env docs).
- [ ] Add GitHub Actions workflow to build cipherlock on push/PR.

## Step 4: Commit + push
- [ ] Create a branch.
- [ ] Commit changes.
- [ ] Push to GitHub.

