# ![Humn Logo](./packages/humn-vscode/icons/humn-dark.svg) Humn (/ˈhjuː.mən/)

[![NPM version](https://img.shields.io/npm/v/humn.svg)](https://www.npmjs.com/package/humn)

> **The organic, human-centric UI library for the modern web.**

**Humn** is a complete, reactive frontend library with built in state management designed to replace the likes of React/Svelte/Solid AND Zustand/Kea/Redux in your stack.

It rejects the complexity of modern frameworks **no stale closures, no "Hook Rules", and no heavy compilers**. Humn decouples your application's **Cortex** (Logic/State) from its **Body** (View), creating applications that are easy to reason about, simple to test, and naturally reactive.

## Core Features

- **🧬 Biological Architecture:** A strict separation of concerns. Your data lives in the `Cortex`; your UI is just a dumb projection of that memory.
- **🧠 Built-in Global State:** No need for Redux or Zustand. The `Cortex` is built-in, handling deep updates, async actions, and side effects out of the box.
- **mutative syntax, immutable updates:** Write `state.count++`. We handle the immutability and render triggers for you.
- **🎨 Scoped Styles:** Encapsulated CSS that lives alongside your components.
- **Logical File Structure:** The `.humn` files read like straightforward Javascript and HTML. If you can write those, you can write Humn.

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

## The "Hello World" (That actually scales)

Humn uses Single File Components (`.humn`) to keep your logic, view, and styles together.

### 1. The Cortex (Logic)

```javascript
// store.js
import { Cortex } from 'humn'

export const appStore = new Cortex({
  memory: {
    count: 0,
    user: 'Guest',
  },
  synapses: (set, get) => ({
    increment: () =>
      set((state) => {
        state.count++
      }),
    login: (name) => set({ user: name }),
  }),
})
```

### 2. The Body (Component)

```html
<!-- app.humn -->
<script>
  import { appStore } from './store'

  // Access the Cortex
  const { count, user } = appStore.memory
  const { increment } = appStore.synapses
</script>

<div>
  <h1>Hello, {user}</h1>
  <p>Vital Signs: {count}</p>
  <button onclick="{increment}">Pulse</button>
</div>

<style>
  /* We don't need to wrap this in div {...} but we could if we wanted */
  padding: 2rem;
  text-align: center;
</style>
```

### 3. Mount

```javascript
// main.js
import { mount } from 'humn'
import App from './app.humn'

mount(document.getElementById('app'), App)
```

## Contributing

We are building a library for humans, by humans. Please read CODING_STANDARDS.md before pushing code.

## Packages

This monorepo contains the following packages:

- [`humn`](/packages/humn): The core Humn library.
- [`humn-vscode`](/packages/humn-vscode): VSCode language support for `.humn` files.
- [`prettier-plugin-humn`](/packages/prettier-plugin-humn): Prettier plugin for formatting `.humn` files.
- [`vite-plugin-humn`](/packages/vite-plugin-humn): Vite plugin for compiling `.humn` files.
