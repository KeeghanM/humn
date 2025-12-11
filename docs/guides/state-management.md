# State Management

Humn's state management system is called `Cortex`. It is a simple yet powerful way to manage the state of your application.

To create a `Cortex` instance, you need to provide an initial `memory` (state) and a `synapses` function. The `synapses` function receives `set` and `get` functions that you can use to interact with the state.

Here's an example of a simple counter:

```javascript
// store.js
import { Cortex } from 'humn'

export const counterStore = new Cortex({
  memory: {
    count: 0,
  },
  synapses: (set) => ({
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
  }),
})
```

```humn
<script>
  // App.humn
  import { counterStore } from './store.js'

  const { count } = counterStore.memory
  const { increment, decrement } = counterStore.synapses
</script>

<div>
  <h1>{count}</h1>
  <button onclick={increment}>Increment</button>
  <button onclick={decrement}>Decrement</button>
</div>
```

To mount the app:

```javascript
// main.js
import { mount } from 'humn'
import App from './App.humn'

mount(document.getElementById('app'), App)
```

In this example, we're creating a `Cortex` instance called `counterStore` with an initial count of 0. We're also defining two synapses, `increment` and `decrement`, that update the count.

The `App` component gets the `count` from the `counterStore.memory` and the `increment` and `decrement` functions from the `counterStore.synapses`. It then renders the count and two buttons to increment and decrement the count.

## State Persistence

You can persist the state of your application to `localStorage` using the `persist` utility. This is useful for keeping the state of your application across page reloads.

To use it, wrap the value you want to persist with the `persist` function.

```javascript
import { Cortex, persist } from 'humn'

const todoStore = new Cortex({
  memory: {
    items: persist([
      { id: 1, text: 'Create Humn Library', done: true },
      { id: 2, text: 'Write first app', done: false },
    ]),
    inputValue: '',
    errorMessage: '',
    isLoading: false,
  },
  // ...
})
```

By default, the key used in `localStorage` will be the same as the key in the `memory` object. In the example above, the key will be `items`.

You can also provide a custom key by passing a configuration object to the `persist` function:

```javascript
const todoStore = new Cortex({
  memory: {
    items: persist(
      [
        { id: 1, text: 'Create Humn Library', done: true },
        { id: 2, text: 'Write first app', done: false },
      ],
      { key: 'my-custom-key' },
    ),
    // ...
  },
  // ...
})
```

## Type Safety (TS & JSDoc)

Cortex supports strong typing out of the box. By defining your Memory and Synapse types, you ensure that your `set` updates are valid and your components receive the correct data types.

Cortex automatically handles the complexity of unwrapping `persist()` values in your types, so your API remains clean.

> For a detailed guide on how to type your store using TypeScript or JSDoc, see the **[TypeScript Support](./typescript.md)** guide.
