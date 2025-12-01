# API Reference

## `mount(target, Component)`

Mounts a component to a target DOM element.

- `target`: The DOM element to mount the component to.
- `Component`: The root component to render.

## `h(tag, props, children)`

Creates a virtual DOM node.

- `tag`: The tag name of the element or a component function.
- `props`: An object of properties to apply to the element.
- `children`: An array of child nodes.

## `Cortex({ memory, synapses })`

Creates a `Cortex` instance for state management.

- `memory`: The initial state of your application.
- `synapses`: A function that receives `set` and `get` functions to interact with the state.

## `onMount(callback)`

Registers a callback to be called after a component is mounted.

- `callback`: The function to be called.

## `onCleanup(callback)`

Registers a callback to be called when a component is unmounted.

- `callback`: The function to be called.

## `css`

A template literal tag for writing scoped CSS.
