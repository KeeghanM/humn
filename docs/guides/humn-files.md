# .humn Files

Humn introduces a dedicated file format `.humn` to make writing components even more intuitive. It feels a lot like Svelte, but with Humn's unique flavour.

A `.humn` file consists of three optional sections: `<script>`, `<template>` (implicit), and `<style>`.

## Structure

```html
<script>
  // Your JavaScript logic here
  import { store } from './store.js'

  // Props are available via the `props` variable
  const { name } = props

  // Access store state
  const { count } = store.memory
  const { increment } = store.synapses
</script>

<!-- The template is the main content of the file -->
<div>
  <h1>Hello, {name}!</h1>
  <p>Count: {count}</p>
  <button onclick="{increment}">Increment</button>
</div>

<style>
  /* Scoped CSS */
  div {
    padding: 20px;
    border: 1px solid #ccc;
  }

  h1 {
    color: blue;
  }
</style>
```

## The Script Section

The `<script>` block is where you define your component's logic.

- **Imports**: Import other components, stores, or utilities.
- **Props**: `props` is a magic variable available in the script scope containing the properties passed to the component.
- **Reactivity**: Destructuring from `Cortex` memory creates reactive subscriptions.

## The Template

Anything outside of `<script>` and `<style>` tags is considered the template.

- **JSX-like Syntax**: Use `{expression}` to embed JavaScript values.
- **Directives**: Use standard HTML attributes. Event listeners match the html format (e.g., `onclick`).
- **Control Flow**: Use JavaScript logic within curly braces for conditionals and loops.

```html
{isLoading &&
<div class="loader">Loading...</div>
}

<ul>
  {items.map(item => (
  <li>{item.name}</li>
  ))}
</ul>
```

## The Style Section

The `<style>` block contains CSS that is **scoped** to the component.

- **Isolation**: Styles defined here will not leak out to other components.
- **No Config**: It works out of the box with the Humn compiler.
