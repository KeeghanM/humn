# Humn (/ˈhjuː.mən/)

[![NPM version](https://img.shields.io/npm/v/humn.svg)](https://www.npmjs.com/package/humn)

> **The organic, human-centric UI library for the modern web.**

**Humn** is a complete, reactive frontend library with built in state management designed to replace the likes of React/Svelte/Solid AND Zustand/Kea/Redux in your stack.

It rejects the complexity of modern frameworks **no stale closures, no "Hook Rules", and no heavy compilers**. Humn decouples your application's **Cortex** (Logic/State) from its **Body** (View), creating applications that are easy to reason about, simple to test, and naturally reactive.

## Core Features

- **🧬 Biological Architecture:** A strict separation of concerns. Your data lives in the `Cortex`; your UI is just a dumb projection of that memory.
- **⚡ Zero-Build Reactive View:** Write standard JavaScript. Components are just functions that return virtual DOM nodes. No compilation required (unless you want it).
- **🧠 Built-in Global State:** No need for Redux or Zustand. The `Cortex` is built-in, handling deep updates, async actions, and side effects out of the box.
- **mutative syntax, immutable updates:** Write `state.count++`. We handle the immutability and render triggers for you.
- **🎨 Scoped Styles:** Encapsulated CSS that lives alongside your components.

## Installation

```bash
npm install humn
# or yarn add humn
# or pnpm install humn
```

## The "Hello World" (That actually scales)

Unlike other libraries, Humn encourages separating logic from the start.

### The Cortex (Logic)

```JavaScript

import { Cortex } from 'humn';

export const appStore = new Cortex({
  memory: {
    count: 0,
    user: 'Guest'
  },
  synapses: (set, get) => ({
    increment: () => set(state => { state.count++ }),
    login: (name) => set({ user: name })
  })
});
```

### The View (UI)

```JavaScript

import { h, mount } from 'humn-js';
import { appStore } from './store';

const App = () => {
  // 1. Read Memory (Auto-subscribes)
  const { count, user } = appStore.memory;
  const { increment } = appStore.synapses;

  // 2. Return V-DOM
  return h('div', { class: 'container' }, [
    h('h1', {}, `Hello, ${user}`),
    h('p', {}, `Vital Signs: ${count}`),
    h('button', { onclick: increment }, 'Pulse')
  ]);
};

// 3. Mount
mount(document.getElementById('root'), App);
```

## Roadmap

- [x] **Cortex:** State management with dependency tracking.
- [x] **Virtual DOM:** Lightweight `h()` function.
- [x] **Reconciliation:** Keyed Diffing Algorithm.
- [x] **Scoped Styles:** Runtime CSS-in-JS with `css` tag.
- [x] **Lifecycle Hooks:** `onMount` and `onCleanup` for components (Needed for API calls/Timers).
- [ ] **Global Store Persist:** Middleware to save Cortex state to `localStorage`.
- [ ] **Humn Compiler:** `.humn` files for Svelte-like syntax.
- [ ] **Async Components:** Handling `Promise` rendering (Suspense).
- [ ] **DevTools:** Browser extension to inspect the Cortex Memory.

## Contributing

We are building a library for humans, by humans. Please read CODING_STANDARDS.md before pushing code.
