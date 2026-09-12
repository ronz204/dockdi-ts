# Package Distribution — Plan

> Implements the two items `package-distribution.spec.md` explicitly deferred: the first real `npm publish` of `1.0.0`, and a GitHub Actions workflow for ongoing publishing. The spec's own root-README item is already done as separate, already-committed work and isn't part of this plan.

## Status

In progress — steps 1-6 done (npm account/2FA, pre-publish check, manual `1.0.0` publish, Trusted Publisher configured, Changesets initialized, `.github/workflows/release.yml` authored). Remaining: step 7 (end-to-end dry run) and step 8 (README contributor docs).

## Goal

Get `dockdi` onto the npm registry as `1.0.0`, then put continuous publishing behind a repeatable, low-maintenance CI workflow — without ever storing a long-lived npm token as a GitHub secret, and without breaking the zero-runtime-dependency invariant `no-runtime-deps.md` owns.

## Approach

npm's OIDC-based Trusted Publishing (GA since mid-2025) lets a GitHub Actions workflow authenticate to npm using short-lived, workflow-scoped credentials instead of a stored `NPM_TOKEN` secret, and it automatically attaches provenance attestations to every publish. The one hard constraint: npm only exposes the "Trusted Publisher" configuration on a package's settings page *after* that package exists on the registry — a brand-new name can't be bootstrapped through OIDC alone. So the sequence below does one manual, local `npm publish` first to claim the `dockdi` name and put `1.0.0` on the registry, then wires up Trusted Publishing for every release after that.

For versioning and changelog generation, this plan adopts Changesets (`@changesets/cli` + `changesets/action`) rather than a bare tag-and-publish workflow: it's the ecosystem-standard choice for a public library with external consumers, gives contributors a lightweight per-PR way to declare semver impact, and produces an automatic changelog and a review step (the "Version Packages" PR) before anything actually ships — which fits "publish constantly" better than a maintainer manually bumping versions by hand. Changesets is a devDependency only, so it doesn't touch the manifest's runtime-dependency surface.

## Steps

| # | Step | Touches | Done when |
|---|---|---|---|
| 1 | Create or verify an npm account, enable 2FA | npm account (external) | Logged in locally via `npm login`; account has 2FA enabled for both authorization and publishing in npm account settings |
| 2 | Pre-publish sanity pass | `package.json`, build output | `bun run verify` and `bun run build` both pass with zero errors; `npm pack --dry-run` lists only `dist/`, `package.json`, and `LICENSE` — nothing from `samples/`, `testing/`, or the knowledge base leaks in |
| 3 | One-time manual publish of `1.0.0` | npm registry, package `dockdi` (external) | `npm publish` succeeds from a clean, logged-in local shell; `https://www.npmjs.com/package/dockdi` shows version `1.0.0` |
| 4 | Configure npm Trusted Publisher for the package | npm package settings for `dockdi` (external) | The "Trusted Publisher" section on the package's npm settings page is configured with this GitHub repo and the exact workflow filename from step 6, and shows as configured |
| 5 | Add Changesets tooling | `package.json` devDependencies, `.changeset/config.json` | `@changesets/cli` is a devDependency; `bunx changeset init` has created `.changeset/config.json` with `baseBranch` set to this repo's default branch and public npm access; `bunx changeset` runs locally without error |
| 6 | Author the release workflow | `.github/workflows/release.yml` | Workflow triggers on push to the default branch, runs the existing `verify`/`build` scripts, sets `permissions: id-token: write` (plus `contents: write` and `pull-requests: write` for the Version Packages PR), and invokes `changesets/action` for the publish step — no `NPM_TOKEN` secret referenced anywhere in the file |
| 7 | Dry-run the full release flow once | A real changeset + its Version Packages PR | Merging a changeset to the default branch opens a "Version Packages" PR with a correct version bump and changelog entry; merging that PR triggers a workflow run that publishes to npm and the published version shows a provenance attestation on its npm page |
| 8 | Document the contributor release workflow | `README.md` | A short section explains: add a changeset per change via `bunx changeset`, merging the resulting "Version Packages" PR is what actually releases |

## Risks & rollback

- **Step 2's dry-run check is the only guard against a bad first publish**: npm packages can't be unpublished after 72 hours, so anything wrong in the tarball (an accidental `samples/` or `testing/` leak, a stale `dist/`) ships permanently under `1.0.0`. Treat the `npm pack --dry-run` file list as a hard gate before running `npm publish` in step 3.
- **A misconfigured Trusted Publisher (wrong repo, wrong workflow filename) fails the publish step in CI with an auth error**, not a wrong-but-successful publish — safe to fix and re-run. While debugging it, a manual `npm publish` from a local machine (still requiring the maintainer's own npm login + 2FA) remains available as a fallback for an urgent release; it doesn't require re-doing steps 1–4.
- **If the workflow's `GITHUB_TOKEN` lacks `pull-requests: write`, the Version Packages PR silently never opens** — no error, just nothing happening after a changeset lands on the default branch. Check that permission first if step 7 doesn't produce a PR.

## Validation

- Local, before any publish: `bun run verify` (typecheck + lint + test) and `npm pack --dry-run` tarball contents.
- After step 3: the package page on npmjs.com shows `1.0.0` with the correct README, license, and files.
- After step 7: the npm package page shows a provenance badge ("Built and signed on GitHub Actions") on the newly published version, confirming Trusted Publishing — not a manual token — produced it.
- After adding `@changesets/cli`: re-confirm the manifest's runtime-dependency entry is still empty, per `no-runtime-deps.md`.

## Out of scope

Everything `package-distribution.spec.md`'s own Non-goals section already excludes (gzip size measurement, CI-enforced size-budget failures) stays excluded here too. Also out of scope for this plan specifically: publishing under an npm organization/scope, multi-package/monorepo release orchestration, and any release cadence automation beyond "a merged Version Packages PR publishes" (e.g. scheduled or nightly releases) — `dockdi` is a single unscoped package with a single release path.

---

References: [npm Trusted Publishing docs](https://docs.npmjs.com/trusted-publishers/), [npm Trusted Publishing with OIDC GA announcement](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/), [changesets/action](https://github.com/changesets/action).
