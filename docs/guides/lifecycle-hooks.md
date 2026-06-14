# Lifecycle Hooks

Humn provides two lifecycle hooks: `onMount` and `onCleanup`.

## Side Effects & Data Fetching (Important)

**Do not start fetches, timers, subscriptions or DOM listeners directly in a `.humn` script block.** The `<script>` block is part of the component's render logic, which means it may run multiple times (on every re-render).

Always use `onMount` for component-owned side effects to ensure they run only once when the component appears in the DOM.

```humn
<script>
  import { onMount } from 'humn'
  import { api } from '../api.js'

  // ❌ BAD: This will trigger an infinite loop of fetches and re-renders!
  // api.fetchData()

  // ✅ GOOD: Runs only once when the component mounts
  onMount(() => {
    api.fetchData()
  })
</script>
```

_(Note: For robust data fetching, we recommend using Cortex's built-in `resource` primitives instead of manual API calls. See the [Data Fetching guide](./state-management.md#data-fetching) for the best practices.)_

## Overview

The `onMount` hook is called after a component is mounted to the DOM. You can use it to perform any setup that you need to do.

The `onCleanup` hook is called when a component is unmounted from the DOM. You can use it to perform any cleanup that you need to do, such as removing event listeners.

Here's an example of how to use the lifecycle hooks:

```humn
<script>
  // MyComponent.humn
  import { onMount, onCleanup } from 'humn'

  onMount(() => {
    console.log('Component mounted!')
  })

  onCleanup(() => {
    console.log('Component unmounted!')
  })
</script>

<p>My component</p>
```
