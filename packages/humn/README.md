# humn

Humn is a minimal, human-centric reactive UI library with built-in state management. It's designed to be simple, intuitive, and powerful.

This package is the core `humn` library.

## Installation

```bash
npm install humn
# or
yarn add humn
```

## Quick Start

Here's a simple counter example to get you started.

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

Components are just JavaScript functions that return virtual DOM nodes using the `h` function. They automatically re-render when the `Cortex` memory they use changes.

```javascript
// App.js
import { h, mount } from 'humn'

import { counterStore } from './store'

const App = () => {
  const { count } = counterStore.memory
  const { increment, decrement } = counterStore.synapses

  return h('div', {}, [
    h('h1', {}, `Count: ${count}`),
    h('button', { onclick: increment }, '+'),
    h('button', { onclick: decrement }, '-'),
  ])
}

mount(document.getElementById('root'), App)
```

## Learn More

For a complete guide, including information on lifecycle hooks, scoped CSS, `.humn` files, and more, please see the [**full documentation in the main project README**](https://github.com/KeeghanM/humn).
