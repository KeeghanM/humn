# Getting Started

This guide will walk you through the process of creating a simple "Hello, World!" application with Humn.

## Installation

### Humn Core

You can install Humn using npm or yarn:

```bash
npm install humn
# or
yarn add humn
```

### The Vite Plugin

To use `.humn` files, you need to use the `vite-plugin-humn` in your Vite configuration.

```bash
npm install --save-dev vite-plugin-humn
# or
yarn add vite-plugin-humn -D
```

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import humn from 'vite-plugin-humn'

export default defineConfig({
  plugins: [humn()],
})
```

### Prettier

We also have, and recommend, a Prettier Plugin which can be installed like any other

```bash
npm install --save-dev prettier-plugin-humn
# or
yarn add prettier-plugin-humn -D
```

```javascript
// prettier.config.js
import humn from 'prettier-plugin-humn'

const config = {
  plugins: [humn],
}

export default config
```

## Hello, World

Here's a simple "Hello, World!" example to get you started:

```html
// App.humn
<script>
  const message = 'Hello, World!'
</script>

<h1>{message}</h1>
```

In this example, we're creating a simple component that renders an `h1` element with the text "Hello, World!".

To mount this application, you would typically have an entry point like `main.js`:

```javascript
// main.js
import { mount } from 'humn'
import App from './App.humn'

mount(document.getElementById('root'), App)
```

In this example, we're creating a simple component called `App` that renders an `h1` element with the text "Hello, World!". We then mount the `App` component to the `div` with the id `root`.
