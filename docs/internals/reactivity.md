# Reactivity System

Humn's reactivity system is built on the **Observer Pattern** and JavaScript **Proxies**. It allows components to automatically subscribe to the specific pieces of state they use.

## Core Components

### 1. The Observer (`observer.js`)

The `observer.js` module is a singleton that tracks the "currently executing" function. This is usually a component's render function.

```javascript
let currentObserver = null

export const setObserver = (obs) => {
  currentObserver = obs
}
```

### 2. Cortex Proxies (`cortex.js`)

When you create a `Cortex` store, the `memory` object is wrapped in a Proxy. This Proxy intercepts all property access (get) and mutation (set).

## The Dependency Tracking Cycle

### Step 1: Render Begins

When a component needs to render, Humn sets `currentObserver` to that component's update function.

### Step 2: Property Access (Get)

As the component renders, it reads values from the store (e.g., `store.memory.count`).
The Proxy intercepts this access. It checks if `currentObserver` is set. If so, it adds the observer to a dependency list for that specific property.

```javascript
// Simplified Logic
get(target, prop) {
  if (currentObserver) {
    dependencies.get(prop).add(currentObserver);
  }
  return target[prop];
}
```

### Step 3: Render Ends

Humn clears `currentObserver`. The component is now subscribed to exactly the properties it read.

### Step 4: Mutation (Set)

When you update state (e.g., `store.synapses.increment()`), the Proxy intercepts the change.
It looks up the dependency list for the changed property and calls all subscribed observers.

```javascript
// Simplified Logic
set(target, prop, value) {
  target[prop] = value;
  dependencies.get(prop).forEach(observer => observer());
  return true;
}
```

## Why Proxies?

We use Proxies instead of `get()`/`set()` accessors or dirty checking because:

1.  **Granularity**: We can track access to nested properties dynamically.
2.  **Transparency**: You work with plain objects. No `.value` or special syntax needed.
3.  **Performance**: Only components that actually _use_ a changed property are re-rendered.

## Deep Reactivity

Cortex handles deep reactivity by recursively wrapping nested objects in Proxies when they are accessed. This ensures that even changes deep within your state tree trigger the correct updates.
