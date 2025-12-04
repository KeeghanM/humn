# humn

Humn is a minimal, human-centric reactive UI library with built-in state management. It's designed to be simple, intuitive, and powerful.

This package is the core `humn` library.

## Installation

```bash
npm install humn
npm install -D vite-plugin-humn
```

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import humn from 'vite-plugin-humn'

export default defineConfig({
  plugins: [humn()],
})
```

## Quick Start

Here's a simple counter example using `.humn` files.

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

Components are defined in `.humn` files, which combine logic, template, and styles.

```humn
<script>
  // App.humn
  import { counterStore } from './store'

  const { count } = counterStore.memory
  const { increment, decrement } = counterStore.synapses
</script>

<div>
  <h1>Count: {count}</h1>
  <button onclick={increment}>+</button>
  <button onclick={decrement}>-</button>
</div>
```

### 3. Mount

```javascript
// main.js
import { mount } from 'humn'
import App from './App.humn'

mount(document.getElementById('root'), App)
```

## Learn More

For a complete guide, including information on lifecycle hooks, scoped CSS, `.humn` files, and more, please see the [**full documentation in the docs**](../../docs/guides/getting-started.md).
