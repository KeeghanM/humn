# Runtime & Metrics

The Humn runtime is responsible for bootstrapping the application, managing the component lifecycle, and monitoring performance.

## The Mount Process (`mount.js`)

The entry point for any Humn application is the `mount()` function. It establishes the reactive root of your application.

```javascript
export const mount = (target, Component) => {
  let prevVNode = null

  const lifecycle = () => {
    // 1. Set the current observer to this update function
    setObserver(lifecycle)

    // 2. Create the root VNode
    const nextVNode = {
      tag: Component,
      props: {},
      children: [],
    }

    // 3. Patch the DOM
    patch(target, nextVNode, prevVNode)

    // 4. Cleanup
    setObserver(null)
    prevVNode = nextVNode
  }

  // Initial render
  lifecycle()
}
```

### How Reactivity Connects to the Runtime

Because `lifecycle` sets itself as the observer before rendering, any reactive state accessed during the render (inside `Component` or its children) will register `lifecycle` as a dependency.

When that state changes, `lifecycle` is called again, triggering a re-render of the entire tree (which is then efficiently diffed by the Virtual DOM).

## Performance Metrics (`metrics.js`)

Humn includes a development-only metrics module to help you understand performance characteristics.

### Tracked Metrics

- **Diff Checks**: How many VNodes were compared.
- **DOM Updates**: How many actual DOM manipulations occurred.
- **Components Rendered**: How many component functions were executed.
- **Elements Created**: New DOM nodes created.
- **Elements Removed**: DOM nodes removed.

### Usage

In development mode (`import.meta.env.DEV` is true), metrics are automatically logged to the console once per animation frame if any activity occurred.

```javascript
import { track } from './metrics'

// Inside the runtime
track('diffs')
track('patches')
```
