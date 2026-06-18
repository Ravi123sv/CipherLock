---
name: esbuild CJS module interop
description: How to safely import CJS-only modules (like archiver) in an ESM bundle built by esbuild
---

# esbuild CJS Interop Problem

When the api-server is bundled as `dist/index.mjs` by esbuild:
- `import defaultExport from "cjs-module"` fails typecheck if `@types/*` has no `export =` or `export default`
- `require("cjs-module")` at module level returns a namespace-wrapped object; calling it as a function crashes at runtime

**Why:** esbuild wraps CJS `module.exports = fn` into a namespace object; the callable is at `.default` inside the bundle but the raw `module.exports` at the top level.

**How to apply:**
- For CJS modules with bad typings, use `tar`/system utilities via `child_process.spawn` instead where possible (no import drama).
- If you must `require()` a CJS function module, do: `const mod = require("pkg"); const fn = (mod.default ?? mod) as TypedFn;`
- Add `esModuleInterop: true` to the artifact's tsconfig to unlock `import * as` and type-level interop.
- Avoid `import default` for modules whose `@types` has only named exports (TS1192 error).
