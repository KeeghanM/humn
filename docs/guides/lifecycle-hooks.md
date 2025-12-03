# Lifecycle Hooks

Humn provides two lifecycle hooks: `onMount` and `onCleanup`.

The `onMount` hook is called after a component is mounted to the DOM. You can use it to perform any setup that you need to do, such as fetching data from an API.

The `onCleanup` hook is called when a component is unmounted from the DOM. You can use it to perform any cleanup that you need to do, such as removing event listeners.

Here's an example of how to use the lifecycle hooks:

```html
<!-- MyComponent.humn -->
<script>
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
