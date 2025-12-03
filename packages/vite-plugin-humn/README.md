# Vite Plugin for Humn

This package provides a Vite plugin for compiling `.humn` files into JavaScript functions that return virtual DOM nodes.

## Installation

```bash
npm install vite-plugin-humn --save-dev
# or
yarn add vite-plugin-humn --dev
```

## Usage

In your `vite.config.js` or `vite.config.ts` file, add the Humn plugin:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import humn from 'vite-plugin-humn';

export default defineConfig({
  plugins: [humn()],
});
```

Now you can import `.humn` files directly in your JavaScript or TypeScript files.

```javascript
import MyComponent from './MyComponent.humn';

// MyComponent is now a standard Humn component function
```

For more information, please see the [main project README](https://github.com/KeeghanM/humn).