# Issues #10, #13, #16 Implementation Tracker

## Requirements Traceability

- Issue #16: top-level template expressions (like `messages.map(...)`) should compile without requiring a wrapper `<div>`.
- Issue #13: VS Code support should provide meaningful embedded language behavior for IntelliSense/autocomplete and language services.
- Issue #10: `Ctrl-/` comments in template regions should use HTML-style comments rather than JavaScript comments.
- PR review follow-up: lifecycle hook execution must be resilient so one failing hook cannot prevent remaining hooks.

## Concise Implementation Plan

1. Update compiler transform to normalize single-root expression results that return arrays.
2. Add tests proving top-level mapped template output is wrapped into a root vnode at compile time.
3. Improve VS Code grammar language embedding to correctly map TS/TSX/HTML/CSS scopes for editor language services.
4. Adjust `.humn` language comments configuration so template-region comment behavior aligns with HTML comments.
5. Tighten lifecycle update predicate intent and make all hook invocation paths fault-tolerant.
6. Run full monorepo tests.

## Running TODO List

- [x] **[Plan 1]** Update `vite-plugin-humn` transform to normalize array-returning root expressions.
- [x] **[Plan 2]** Add/verify compiler tests for map-expression templates without explicit wrappers.
- [x] **[Plan 3]** Extend VS Code extension embedded language mapping for TS/TSX/html/css scopes.
- [x] **[Plan 4]** Update language comment configuration for template-compatible comment behavior.
- [x] **[Plan 5]** Refine lifecycle update hook predicate to match cleanup-only execution intent.
- [x] **[Plan 5]** Wrap mount/cleanup hook execution in safe per-hook guards with error logging.
- [x] **[Plan 6]** Execute monorepo QA test suite.
