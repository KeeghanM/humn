# The Compiler

Humn uses a Vite plugin (`vite-plugin-humn`) to transform `.humn` files into standard JavaScript modules. This compilation step is what allows you to use the convenient Single File Component (SFC) format.

## Overview

The compiler performs three main tasks:

1.  **Extraction**: Separates the `<script>`, `<template>`, and `<style>` blocks.
2.  **Transformation**: Converts the HTML template into Virtual DOM render logic.
3.  **Assembly**: Combines everything into a JavaScript module that exports a component function.

## The Transformation Pipeline

### 1. Parsing

When Vite requests a `.humn` file, the plugin intercepts the request. It uses regex to extract the content of the three main blocks.

```javascript
// Input
<script>
  let count = 0;
</script>

<button>Count: {count}</button>
```

### 2. Template Compilation

The HTML template is passed to `compileTemplate()`. This function parses the HTML and converts it into nested `h()` calls.

- **Components**: Tags starting with an uppercase letter (e.g., `<MyComponent>`) are treated as variables, not strings.
- **Expressions**: Text inside curly braces `{}` is treated as JavaScript expressions.
- **Props**: Attributes are converted into a props object.

**Example Transformation:**

```humn
<div class="card">
  <h1>{title}</h1>
  <button onclick={handleClick} />
</div>
```

Becomes:

```javascript
h('div', { class: 'card' }, [
  h('h1', {}, title),
  h(Button, { onclick: handleClick }),
])
```

### 3. CSS Scoping

If a `<style>` block is present, the compiler:

1. **Analyses the Template:** Determines if the component has a single root element.
2. **Generates Style Logic:** Calls the css() function with the raw styles and the isSingleRoot flag. This allows the runtime to intelligently scope selectors (using the "Union Strategy") so they apply to both the root and its descendants.
3. **Injects Class Application:** Automatically appends the generated scoped class to the root element of the template.

```javascript
// Generated Logic
const __styles = css(`...css content...`, true) // true if single root

// Injected DOM Application
if (typeof __styles !== 'undefined' && __vdom && __vdom.props) {
  __vdom.props.class =
    (__vdom.props.class ? __vdom.props.class + ' ' : '') + __styles
}
```

### 4. Module Assembly

Finally, the compiler assembles the JavaScript module:

1.  Imports `h` (and `css` if needed) from `humn`.
2.  Adds the user's `<script>` content.
3.  Adds the compiled template logic.
4.  Exports the component function.

## Compiler Internals

The compiler is located in `packages/vite-plugin-humn`.

- **`index.js`**: The main Vite plugin definition. Handles the `transform` hook.
- **`compile-template.js`**: Recursive function that traverses the HTML AST and generates code.
- **`protect-attributes.js`**: Helper to safely handle JavaScript expressions inside HTML attributes during parsing.
