# Package Distribution — Spec

> Packaging and distribution surface for dockdi: the minified dual ESM/CJS build artifacts, the bundle-size budget, the samples suite demonstrating the public API, and the package metadata (license, dependency audit, publish-exclusion list) needed to hand the package to a consumer.

## Intent

Prepare dockdi's actual distributable artifacts and packaging metadata for npm: a minified dual ESM/CJS build within a documented size budget, a comprehensive English-language samples suite demonstrating every public capability, and correct package metadata (license, zero-runtime-dependency audit, documented publish-exclusion list) — everything short of the public-facing README, a CI/CD pipeline, and the actual `npm publish`, which are deliberately deferred to later work.

## Scope

- **Owns**:
  - The build tool's minification setting for the distributed artifacts (the ESM and CJS entry points must be built minified).
  - The bundle-size measurement methodology (raw bytes, no gzip, measured on the minified ESM entry point only) and its recorded result.
  - The full content and structure of the samples directory: one example area per capability, written in English, meant as a real adopter-facing usage guide rather than a minimal smoke test.
  - The root license file and its agreement with the package manifest's declared license.
  - The documented publish-exclusion list (the packaging tool's ignore file), kept as defense-in-depth documentation alongside the manifest's own publish whitelist.
  - Confirming — not owning — the zero-runtime-dependency invariant; that invariant itself is governed by this project's no-runtime-dependencies rule.
- **Non-goals**:
  - The public-facing root README (quick-start guide, usage docs for the npm listing) — deferred to later work.
  - Any CI/CD pipeline configuration for automated testing or publishing.
  - The actual `npm publish` of the `1.0.0` release.
  - Gzip-based size measurement, or automated/CI-enforced failure on exceeding the size budget — this round's verification is manual and documented only.
  - Re-describing container/resolver/binding/error/scope behavior already owned by this project's other slice specs — samples may *demonstrate* that behavior, but this slice's own contract is about packaging, not about re-stating those invariants.

## Contract

| Artifact | Requirement |
|---|---|
| Build output (ESM entry) | Built minified; raw (non-gzip) byte size under the documented budget (see Invariants) |
| Build output (CJS entry, declaration files) | Built alongside the ESM entry via the same build step; not subject to the size budget itself |
| Samples directory | One file (or small group of files) per capability area; every public export demonstrated at least once; English only |
| License file | Present at the repo root; text matches the manifest's declared license identifier and named copyright holder/year |
| Publish-exclusion list | Present and non-empty; lists every directory/file that must never ship, even though the manifest's own publish whitelist is the actual enforcing mechanism |
| Dependency manifest | No non-empty runtime-dependency entry |

## Invariants

- **Minified ESM bundle size**: the minified ESM entry point must measure under 3 KB, raw bytes, no gzip. The measured number must be recorded (in this spec or its plan) each time it's re-verified. Last measured: 443 B (2026-09-11).
- **Zero runtime dependencies**: the package manifest must never carry a non-empty runtime-dependency entry — this slice audits compliance; the invariant itself is owned by this project's no-runtime-dependencies rule.
- **Samples completeness**: every public export of the library's entry module must be exercised by at least one file under the samples directory, written in English, and kept in sync with the real public API — a sample referencing a renamed or removed export is a defect in this slice.
- **Samples exclusion from the published package**: nothing under the samples directory may ever ship in the published tarball. The package manifest's own publish whitelist is the actual enforcing mechanism; the publish-exclusion list documents that exclusion (along with the knowledge-base directories, the test suite, and coverage output) explicitly as defense-in-depth, not as the primary mechanism.
- **License agreement**: the root license file's declared license must match the package manifest's declared license identifier, with the named copyright holder and year kept in sync between the two.

## Deferred / Open questions

- Automating the size-budget check as a script that fails the build on overage — deferred until the CI/CD pipeline work begins.
- Whether to also track gzip size alongside the raw minified size — deferred, not needed this round.
- The public-facing root README, the CI/CD pipeline, and the actual npm publish of `1.0.0` — all explicitly deferred to later phases of the packaging effort.

## Acceptance criteria

- The build tool's minification setting is enabled; a full build succeeds and produces the ESM entry, the CJS entry, and both declaration files with no errors.
- The measured size of the minified ESM entry (raw bytes, no gzip) is under 3 KB, and that number is written down as of the date measured — 443 B as of 2026-09-11.
- The package manifest has no non-empty runtime-dependency entry.
- The samples directory contains runnable, English-language examples covering at minimum: basic binding (value, class, and factory providers); all three lifecycle scopes (transient default, singleton, resolution); child containers; testing overrides; module loading; and error handling for circular-dependency and missing-token failures, including their trace output. Each sample type-checks cleanly.
- A root license file exists containing the declared license's standard text, with the copyright holder and year matching the package manifest's declared license.
- The publish-exclusion list is non-empty and lists the directories/files that must never ship, as documented defense-in-depth alongside the manifest's publish whitelist.
- A dry-run package listing contains only the whitelisted build output plus the files always included regardless of that whitelist (the manifest itself, the license) — confirming the samples directory, the test suite, the delta specs, and the knowledge-base directories never leak into the published tarball.
- The full test suite, the typecheck, and the linter continue to pass with zero errors after all of the above changes.

---

Last updated: 2026-09-11.
