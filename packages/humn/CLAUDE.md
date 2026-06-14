# Humn project instructions

This project uses Humn.

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Tests: `npm test` if present

## Humn conventions

- Components use `.humn` files.
- A `.humn` file may contain `<script>`, template markup and `<style>`.
- Component styles are scoped.
- Shared state should live in Cortexes.
- Read state from `cortex.memory`.
- Change state through `cortex.synapses`.
- Use `persist(initial, { key })` for localStorage-backed state.
- Do not use React hooks, JSX component files, Svelte stores or Solid signals unless the project explicitly adds those libraries.

## Cortex example

```js
import { Cortex, persist } from 'humn'

export const uiCortex = new Cortex({
  memory: {
    activeView: persist('accounts', { key: 'active-view' }),
  },

  synapses: (set) => ({
    setActiveView(view) {
      set((state) => {
        state.activeView = view
      })
    },
  }),
})
```

## Component example

```html
<script>
  import { uiCortex } from './cortexes/uiCortex.js'

  const { activeView } = uiCortex.memory
  const { setActiveView } = uiCortex.synapses
</script>

<button onclick="{()" ="">
  setActiveView('accounts')}> Current view: {activeView}
</button>

<style>
  button {
    border-radius: 8px;
  }
</style>
```
