# Scoped CSS

In `.humn` files, you can simply use the `<style>` tag. Humn automatically scopes these styles to your component.

```humn
<script>
  // MyComponent.humn
  // ... logic
</script>

<p>This component has scoped styles, no need for classes!</p>
<div>Both elements are styled by top level, unwrapped, CSS</div>

<style>
  background: red; /* This applies to both the <p> and the <div> */

  p {
    color: blue;
    font-size: 20px;
  }
</style>
```
