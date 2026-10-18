---
"dockdi": patch
---

Honor child-local dependency overrides when an inherited singleton was already resolved in its parent. Inspect the dependency graph before sharing the parent's cached instance, preserving unaffected sharing without executing factories during the check.
