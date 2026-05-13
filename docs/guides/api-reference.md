# API Reference

## `mount(target, Component)`

Mounts a component to a target DOM element.

- `target`: The DOM element to mount the component to.
- `Component`: The root component to render.

## `Cortex<Memory, Synapses>({ memory, synapses })`

Creates a strongly-typed `Cortex` instance for state management.

- **Generics**:
  - `Memory`: The shape of your state object.
  - `Synapses`: The shape of your actions object.
- **Arguments**:
  - `memory`: The initial state. Values can be raw or wrapped in `persist()`.
  - `synapses`: A builder function `(set, get) => Synapses`.

### The `set` function

When typing is applied, `set` supports two modes:

1. **Partial Update**: `set({ count: 1 })` — validated against `Memory`.
2. **Functional Update**: `set(state => { state.count++ })` — `state` is inferred as `Memory`.

### `persist(initial, config)`

Marks a section of the state for persistence in localStorage.

- `initial`: The initial value of the state.
- `config`: (Optional) The configuration for persistence.
  - `key`: A custom key to use in `localStorage`.

## `onMount(callback)`

Registers a callback to be called after a component is mounted.

- `callback`: The function to be called.

## `onCleanup(callback)`

Registers a callback to be called when a component is unmounted.

- `callback`: The function to be called.

## Interaction Helper Props

Interaction helpers are optional props for common DOM interaction boilerplate. Existing event behavior is unchanged when these props are not used. See the [Interaction Helpers guide](./interaction-helpers.md) for examples and edge-case details.

### Keyboard Helpers

- `onenter(event)`: runs when `Enter` is pressed.
- `onescape(event)`: runs when `Escape` is pressed.
- `onkeys`: object map of key combinations to handlers, such as `{ 'Mod+Enter': save, Escape: close }`.

Keyboard helpers are composition-aware and ignore key handling while IME composition is active. `Mod` maps to `Meta` on macOS and `Ctrl` elsewhere.

### Debounced Input

- `debounce={number}`: debounce delay in milliseconds. Defaults to `250` when omitted or invalid.
- `oninputdebounced(event)`: runs once input settles for the configured delay.

Each input event clears the previous pending timer. The callback receives an event-like object with `target` and `currentTarget` set to the element, so `event.target.value` reflects the latest value when the timer fires.

### Commit Semantics

- `oncommit(event)`: runs when a field is committed by `Enter` or blur.

If pressing `Enter` causes blur, `oncommit` fires once for that user intent instead of firing for both events. The Enter path is IME-safe.

### Async Click Helpers

- `onclickasync(event)`: async click handler.
- `disabledwhilepending`: when true, disables the element and blocks repeated clicks while `onclickasync` is pending.

The element is re-enabled after the async handler settles, including rejection. Without `disabledwhilepending`, repeated async clicks are allowed.

### Event Modifiers

Use pipe syntax on event prop keys for explicit modifiers:

- `'onclick|prevent'`
- `'onclick|stop'`
- `'onsubmit|prevent|stop'`
- `'onclick|once'`
- `'onclick|capture'`
- `'onscroll|passive'`

`prevent` and `stop` run before the handler. `once`, `capture`, and `passive` are passed as listener options. Modifiers are opt-in and local to the specific handler prop.
