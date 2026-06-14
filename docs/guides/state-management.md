# State Management

Humn's state management system is called `Cortex`. It is a simple yet powerful way to manage the state of your application.

To create a `Cortex` instance, you need to provide an initial `memory` (state) and a `synapses` function. The `synapses` function receives `set` and `get` functions that you can use to interact with the state.

Here's an example of a simple counter:

```javascript
// cortex.js
import { Cortex } from 'humn'

export const counterCortex = new Cortex({
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
  import { counterCortex } from './cortex.js'

  const { count } = counterCortex.memory
  const { increment, decrement } = counterCortex.synapses
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

In this example, we're creating a `Cortex` instance called `counterCortex` with an initial count of 0. We're also defining two synapses, `increment` and `decrement`, that update the count.

The `App` component gets the `count` from the `counterCortex.memory` and the `increment` and `decrement` functions from the `counterCortex.synapses`. It then renders the count and two buttons to increment and decrement the count.

## State Persistence

You can persist the state of your application to `localStorage` using the `persist` utility. This is useful for keeping the state of your application across page reloads.

To use it, wrap the value you want to persist with the `persist` function.

```javascript
import { Cortex, persist } from 'humn'

const todoCortex = new Cortex({
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
const todoCortex = new Cortex({
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

> For a detailed guide on how to type your cortex using TypeScript or JSDoc, see the **[TypeScript Support](./typescript.md)** guide.

## Data Fetching

Do not start fetches directly in a `.humn` script block. The script block runs during render and may run many times.

Use `onMount` to trigger component-owned loading, and use a Cortex resource synapse to own the async workflow.

Components should read resource state and render the right UI. They should not manage request lifecycle manually.

### The `resource` primitive

Humn comes with built-in primitives to handle server state, similar to React Query or Solid's resources: `resource` and `resourceSynapse`.

```javascript
// cortexes/crmCortex.js
import { Cortex, resource, resourceSynapse } from 'humn'
import { api } from '../api/api.js'

export const crmCortex = new Cortex({
  memory: {
    // Automatically creates { data: [], status: 'idle', loading: false, error: null }
    accounts: resource([]),
  },

  synapses: (set, get) => ({
    // Automatically manages loading/error states, race conditions, and deduplication
    loadAccounts: resourceSynapse(set, get, 'accounts', async (params) => {
      return api.accounts.list(params)
    }),
  }),
})
```

Usage in a component:

```humn
<script>
  import { onMount } from 'humn'
  import { crmCortex } from '../cortexes/crmCortex.js'

  const { accounts } = crmCortex.memory
  const { loadAccounts } = crmCortex.synapses

  // Trigger the fetch safely on mount
  onMount(() => loadAccounts())
</script>

<div>
  {#if accounts.loading}
    <p>Loading accounts...</p>
  {/if}
  
  {#if accounts.error}
    <p>Could not load accounts: {accounts.error.message}</p>
  {/if}

  {#if accounts.status === 'success'}
    <ul>
      {accounts.data.map(acc => <li>{acc.name}</li>)}
    </ul>
  {/if}
</div>
```

`resourceSynapse` supports fetching options like `force`:

```javascript
crmCortex.synapses.loadAccounts(null, { force: true })
```
