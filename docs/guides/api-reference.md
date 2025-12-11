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
