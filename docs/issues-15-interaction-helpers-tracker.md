# Issue #15 Interaction Helpers Tracker

## Requirements Traceability

- Keyboard helpers: `onenter`, `onescape`, `onkeys` with IME safety.
- Debounced input: `debounce` + `oninputdebounced` using latest value and safe timer handling.
- Commit semantics: `oncommit` on Enter/blur with no Enter+blur double-fire.
- Async click handling: `onclickasync` + `disabledwhilepending` to block repeated submits.
- Event modifiers: explicit, opt-in handler modifiers for common `preventDefault`/`stopPropagation` use.

## Implementation Plan

1. Extend runtime prop patching to recognize helper props and install wrapped listeners.
2. Add IME/composition guards for keyboard-driven helpers.
3. Add debounce and async pending state using per-element runtime state.
4. Add event-modifier parsing for handler props with `|` syntax.
5. Add behavior tests for keyboard, debounce, commit, async click, and modifiers.
6. Document usage and edge-case semantics in docs.

## Running TODO List

- [x] **[Plan 1]** Wire helper prop handling into runtime patching path.
- [x] **[Plan 2]** Add composition-aware keyboard behavior for `onenter`/`onkeys`/`oncommit`.
- [x] **[Plan 3]** Implement debounced input and async click pending-lock behavior.
- [x] **[Plan 4]** Support explicit handler modifiers using `on<Event>|modifier` syntax.
- [x] **[Plan 5]** Add runtime behavior tests for all helper categories.
- [x] **[Plan 6]** Document helper APIs and expectations.
