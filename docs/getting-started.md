# Getting Started

This guide will walk you through the process of creating a simple "Hello, World!" application with Humn.

## Installation

You can install Humn using npm or yarn:

```bash
npm install humn
# or
yarn add humn
```

## Hello, World!

Here's a simple "Hello, World!" example to get you started:

```javascript
import { h, mount } from "humn";

const App = () => {
  return h("h1", {}, "Hello, World!");
};

mount(document.getElementById("app"), App);
```

In this example, we're creating a simple component called `App` that renders an `h1` element with the text "Hello, World!". We then mount the `App` component to the `div` with the id `app`.
