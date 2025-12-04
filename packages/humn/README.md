# humn

This package is the core `humn` library. It provides the rendering engine and state management capabilities.

While you can use `humn` standalone with the `h()` syntax, we recommend using it with the `vite-plugin-humn` for the best experience with `.humn` single-file components. For more information, please see the [**root README**](../../README.md).

## Installation

```bash
npm install humn
```

## Quick Start with `h()`

Here's a simple counter example using the `h()` syntax.

### 1. Create a Cortex (Store)

The `Cortex` holds your application's state (`memory`) and the actions that can modify it (`synapses`).

```javascript
// store.js
import { Cortex } from 'humn'

export const counterStore = new Cortex({
  memory: {
    count: 0,
  },
  synapses: (set) => ({
    increment: () =>
      set((state) => {
        state.count++
      }),
    decrement: () =>
      set((state) => {
        state.count--
      }),
  }),
})
```

### 2. Create a Component

Components are functions that return a tree of `h()` calls.

```javascript
// App.js
import { h } from 'humn'
import { counterStore } from './store'

export function App() {
  const { count } = counterStore.memory
  const { increment, decrement } = counterStore.synapses

  return h('div', {}, [
    h('h1', {}, `Count: ${count}`),
    h('button', { onclick: increment }, '+'),
    h('button', { onclick: decrement }, '-'),
  ])
}
```

### 3. Mount

```javascript
// main.js
import { mount } from 'humn'
import { App } from './App.js'

mount(document.getElementById('root'), App)
```

## Learn More

For a complete guide, including information on lifecycle hooks, scoped CSS, `.humn` files, and more, please see the [**full documentation in the docs**](../../docs/guides/getting-started.md).
