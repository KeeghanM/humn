# Humn Documentation

Welcome to the documentation for **Humn**, a modern, lightweight JavaScript framework for building user interfaces.

Humn is designed with a clear separation between the **user experience** (how you build apps) and the **underlying mechanics** (how the framework works).

## 📚 Documentation Sections

### [User Guides](./guides/getting-started.md)

This section is for you if you want to build applications with Humn. It covers the `.humn` file format, component syntax, state management, and best practices.

- **[Getting Started](./guides/getting-started.md)**: Install Humn and build your first app.
- **[Humn Files](./guides/humn-files.md)**: Learn about the `.humn` single-file component format.
- **[State Management](./guides/state-management.md)**: Manage application state with Cortex.
- **[TypeScript Support](./guides/typescript.md)**: Using Humn with TypeScript and JSDoc.
- **[Scoped CSS](./guides/scoped-css.md)**: How to use the scoped styles.
- **[Lifecycle Hooks](./guides/lifecycle-hooks.md)**: onMount() & onCleanup()
- **[API Reference](./guides/api-reference.md)**: Public API documentation.

### [Underlying Mechanics](./internals/cortex-deep-dive.md)

This section explains how Humn works under the hood. It covers the Virtual DOM, the Compiler, and the Reactivity system. Read this if you want to understand the magic or contribute to the framework.

- **[Cortex Deep Dive](./internals/cortex-deep-dive.md)**: How the state management system works.
- **[Virtual DOM](./internals/virtual-dom.md)**: Understanding the diffing and patching algorithm.
- **[The Compiler](./internals/compiler.md)**: How `.humn` files are transformed into JavaScript.
- **[Reactivity System](./internals/reactivity.md)**: The Observer pattern and dependency tracking.
- **[Scoped CSS](./internals/css.md)**: How the scoped CSS and hashing works.
- **[Runtime & Metrics](./internals/runtime.md)**: Component instantiation and performance monitoring.

## Philosophy

Humn believes in:

1. **Simplicity**: A small API surface area that is easy to learn.
2. **Transparency**: Clear separation between user code and framework internals.
3. **Performance**: Efficient updates via a lightweight Virtual DOM and granular reactivity.
