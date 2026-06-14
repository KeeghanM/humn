# Runtime

The Humn runtime is responsible for bootstrapping the application, rendering components, patching the DOM, and managing component lifecycle hooks.

## The Mount Process (`mount.js`)

The entry point for any Humn application is the `mount()` function. It creates a root VNode and patches it into the target element.

```javascript
export const mount = (target, Component) => {
  let prevVNode = null

  const lifecycle = () => {
    const nextVNode = {
      tag: Component,
      props: {},
      children: [],
    }

    patch(target, nextVNode, prevVNode)
    prevVNode = nextVNode
  }

  lifecycle()
}
```

### How Reactivity Connects to the Runtime

Each component instance owns an update observer. Before a component renders, Humn clears that observer's previous Cortex dependencies, sets it as the current observer, and then runs the component function.

Any Cortex state read during that render is registered against that component observer. When a later state update changes a related path, Cortex queues that observer in a microtask. Multiple state updates in the same tick collapse into one render for each affected component.

The queued component update creates a fresh child VNode for that component and patches only that component's subtree against its previous child VNode.

### Lifecycle Hooks

`onMount` callbacks run once after the component is first inserted. `onCleanup` callbacks run when the component is removed. Updating a mounted component does not run cleanup and remount hooks.
