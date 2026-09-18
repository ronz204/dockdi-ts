---
"dockdi": patch
---

Fix published package shipping without `dist/`. The build hook was named `prepublish`, which npm (7+) no longer runs before `npm publish` — only before a local `npm install`. Renamed it to `prepublishOnly` and added an explicit build step to the release workflow so `dist/` is always generated before packing.
