# TypeScript & JSDoc Support

Humn is built to be type-safe by default. Whether you use `.ts` files or standard `.js`, you can get full autocompletion and error checking for your Cortex state.

## Typing a Cortex

To get full type safety, you need to define two shapes:

1. **Memory**: The structure of your state.
2. **Synapses**: The function signatures of your actions.

### In TypeScript

Pass your types as Generics to the `Cortex` class.

```typescript
import { Cortex, persist } from 'humn'

type AppMemory = {
  count: number
  user: { name: string } | null
}

type AppSynapses = {
  increment: () => void
  login: (name: string) => void
}

export const store = new Cortex<AppMemory, AppSynapses>({
  memory: {
    count: persist(0), // Types are automatically unwrapped!
    user: null,
  },
  synapses: (set, get) => ({
    increment: () =>
      set((state) => {
        state.count++
      }),
    login: (name) => set({ user: { name } }),
  }),
})
```

### In JavaScript (JSDoc)

You can achieve the exact same result using JSDoc @typedef and @type.

```javascript
/**
 * @typedef {object} AppMemory
 * @property {number} count
 * @property {{ name: string } | null} user
 */

/**
 * @typedef {object} AppSynapses
 * @property {() => void} increment
 * @property {(name: string) => void} login
 */

/** @type {import('humn').Cortex<AppMemory, AppSynapses>} */
export const store = new Cortex({
  memory: {
    count: persist(0),
    user: null,
  },
  synapses: (set, get) => ({
    increment: () =>
      set((state) => {
        state.count++
      }),
    login: (name) => set({ user: { name } }),
  }),
})
```

Automatic Inference
Once typed, your store will provide intellisense everywhere:

```javascript
// ✅ Autocomplete works here
store.synapses.login('Keeghan')

// ❌ Type Error: Argument of type 'number' is not assignable to parameter of type 'string'.
store.synapses.login(123)

// ✅ Correctly typed as 'number' (persistence is hidden)
const count = store.memory.count
```
