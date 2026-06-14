# humn

This package is the core `humn` library. It provides the rendering engine and state management capabilities.

While you can use `humn` standalone with the `h()` syntax, we recommend using it with the `vite-plugin-humn` for the best experience with `.humn` single-file components. For more information, please see the [**root README**](../../README.md).

## Installation

```bash
npm install humn
```

## AI & Agent Support

Humn includes built-in instructions to help AI coding agents (like Cursor, Claude Code, GitHub Copilot) understand its conventions and write idiomatic code.

To initialize the AI instructions in your project, run:

```bash
npx humn init-ai
```

This will create `AGENTS.md`, `CLAUDE.md`, and `.cursor/rules/humn.mdc` in your workspace, ensuring coding agents don't confuse Humn with React or Svelte.

## Quick Start with `h()`

Here's a simple counter example using the `h()` syntax.

### 1. Create a Cortex (Cortex)

The `Cortex` holds your application's state (`memory`) and the actions that can modify it (`synapses`).

```javascript
// cortex.js
import { Cortex } from 'humn'

export const counterCortex = new Cortex({
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
import { counterCortex } from './cortex'

export function App() {
  const { count } = counterCortex.memory
  const { increment, decrement } = counterCortex.synapses

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
