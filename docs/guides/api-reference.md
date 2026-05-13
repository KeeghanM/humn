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

## Interaction helper props (base elements)

These are optional props for common interaction boilerplate. Existing behavior is unchanged when these props are not used.

### Keyboard helpers

- `onenter`: called when `Enter` is pressed.
- `onescape`: called when `Escape` is pressed.
- `onkeys`: object map of key combos to handlers (e.g. `{ 'Mod+Enter': save, Escape: close }`).

Keyboard helpers are composition-aware and ignore key handling while IME composition is active.

### Debounced input

- `debounce={number}`: debounce delay in milliseconds (default `250`).
- `oninputdebounced`: called once input settles for the configured delay.

The debounced callback receives the latest element value and clears previous pending timer work.

### Commit semantics

- `oncommit`: called when a field is committed by Enter and/or blur.

If Enter causes blur, `oncommit` fires once for that user intent (no double fire).

### Async click helpers

- `onclickasync`: async click handler.
- `disabledwhilepending`: when true, disables interaction while `onclickasync` is pending.

This prevents accidental double submits/double clicks.

### Event modifiers

Use pipe syntax on event props for explicit modifiers:

- `'onclick|prevent'`
- `'onclick|stop'`
- `'onsubmit|prevent|stop'`
- `'onclick|once'`
- `'onclick|capture'`
- `'onscroll|passive'`

Modifiers are opt-in and local to the specific handler prop.
