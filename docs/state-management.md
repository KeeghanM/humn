# State Management

Humn's state management system is called `Cortex`. It is a simple yet powerful way to manage the state of your application.

To create a `Cortex` instance, you need to provide an initial `memory` (state) and a `synapses` function. The `synapses` function receives `set` and `get` functions that you can use to interact with the state.

Here's an example of a simple counter:

```javascript
import { Cortex, h, mount } from "humn";

const counterStore = new Cortex({
  memory: {
    count: 0,
  },
  synapses: (set) => ({
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
  }),
});

const App = () => {
  const { count } = counterStore.memory;
  const { increment, decrement } = counterStore.synapses;

  return h("div", {}, [
    h("h1", {}, count),
    h("button", { onclick: increment }, "Increment"),
    h("button", { onclick: decrement }, "Decrement"),
  ]);
};

mount(document.getElementById("app"), App);
```

In this example, we're creating a `Cortex` instance called `counterStore` with an initial count of 0. We're also defining two synapses, `increment` and `decrement`, that update the count.

The `App` component gets the `count` from the `counterStore.memory` and the `increment` and `decrement` functions from the `counterStore.synapses`. It then renders the count and two buttons to increment and decrement the count.
