import { beforeEach, describe, expect, it } from 'vitest'
import humnPlugin from '../../../vite-plugin-humn/src/index.js'
import { Cortex, css, h, mount } from '../index.js'

/**
 * Compiles and executes a .humn component string in the test environment.
 * * @param {string} source - The .humn file content
 * @param {object} imports - A map of dependencies to inject (e.g. { todoStore, TodoItem })
 * @returns {function} - The compiled Component function
 */
const compile = (source, imports = {}) => {
  const plugin = humnPlugin()

  // This runs compileTemplate, extracts script/styles, and generates the ESM code
  const { code } = plugin.transform(source, 'test.humn')

  // The compiler outputs ES Modules (import/export).
  // We need to convert this to something runnable in a Function constructor.

  const runnableCode = code
    // Remove "import { h, css } from 'humn';" (We inject these)
    .replace(/import\s+{.*?}\s+from\s+['"]humn['"];?/g, '')
    // Remove user imports (We inject these too)
    .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
    // Change "export default function" to "return function" so the factory returns it
    .replace('export default function', 'return function')

  // We inject 'h' and 'css' (core) + any user provided imports (store, sub-components)
  const dependencyNames = ['h', 'css', ...Object.keys(imports)]
  const dependencyValues = [h, css, ...Object.values(imports)]

  // new Function(deps..., body)(values...)
  const factory = new Function(...dependencyNames, runnableCode)
  return factory(...dependencyValues)
}

// Mock Store Logic
const createStore = () =>
  new Cortex({
    memory: {
      items: [
        { id: 1, text: 'Test Humn', done: false },
        { id: 2, text: 'Write Tests', done: true },
      ],
      inputValue: '',
    },
    synapses: (set) => ({
      updateInput: (val) => set({ inputValue: val }),
      addTodo: () =>
        set((state) => {
          if (!state.inputValue) return
          state.items.push({
            id: Date.now(),
            text: state.inputValue,
            done: false,
          })
          state.inputValue = ''
        }),
      toggle: (id) =>
        set((state) => {
          const item = state.items.find((i) => i.id === id)
          if (item) item.done = !item.done
        }),
    }),
  })

// Raw Source: Item.humn
const itemSource = `
<script>
  import { todoStore } from './todo-store.js'
  const { item } = props
  const { toggle } = todoStore.synapses
</script>

<div 
  key={item.id} 
  class={item.done ? 'done' : ''} 
  onclick={() => toggle(item.id)}
  data-testid="item" 
>
  {item.text}
</div>

<style>
  padding: 10px;
  cursor: pointer;

  :hover { background: #eee; }
  .done { text-decoration: line-through; opacity: 0.5; }
</style>
`

// Raw Source: App.humn
const appSource = `
<script>
  import { todoStore } from './todo-store.js'
  import TodoItem from './item.humn'

  const { items, inputValue } = todoStore.memory
  const { updateInput, addTodo } = todoStore.synapses
</script>

<div id="app-root">
  <h1>Humn Todo</h1>
  
  <div class="input-group">
    <input 
      value={inputValue} 
      oninput={(e) => updateInput(e.target.value)} 
      data-testid="input"
    />
    <button onclick={addTodo} data-testid="add-btn">Add</button>
  </div>

  <div class="list">
    {items.map(item => (
      <TodoItem item={item} />
    ))}
  </div>
</div>

<style>
  /* Single Root Scoping Test */
  div { font-family: sans-serif; }
  h1 { color: blue; }
  .list { margin-top: 20px; }
</style>
`

describe('Integration: Compiler + Runtime', () => {
  let store
  let container
  let App

  beforeEach(() => {
    document.head.innerHTML = '' // Clear styles
    container = document.createElement('div')
    store = createStore()

    // 1. Compile Dependencies first
    const TodoItem = compile(itemSource, { todoStore: store })

    // 2. Compile Root (Injecting the compiled dependency)
    App = compile(appSource, {
      todoStore: store,
      TodoItem: TodoItem,
    })
  })

  it('should render the full application with styles', () => {
    mount(container, App)

    // Verify HTML Structure
    expect(container.querySelector('h1').innerHTML).toBe('Humn Todo')
    expect(container.querySelectorAll('[data-testid="item"]').length).toBe(2)

    // Verify CSS Injection
    const styleTag = document.getElementById('humn-styles')
    expect(styleTag).not.toBeNull()
    expect(styleTag.textContent).toContain('div&, div')
    expect(styleTag.textContent).toMatch(/\.humn-\w+ \{/)
  })

  it('should handle reactivity and event loops', async () => {
    mount(container, App)

    const input = container.querySelector('[data-testid="input"]')
    const btn = container.querySelector('[data-testid="add-btn"]')

    // 1. Type
    input.value = 'New Integration Task'
    input.dispatchEvent(new Event('input'))
    expect(store.memory.inputValue).toBe('New Integration Task')

    // 2. Click Add
    btn.click()

    // 3. Verify Update
    // Reactivity should trigger a re-render of App
    expect(container.innerHTML).toContain('New Integration Task')
    expect(input.value).toBe('')
  })

  it('should apply scoped styles correctly to sub-components', () => {
    mount(container, App)

    const item = container.querySelector('[data-testid="item"]')

    // The item should have a class generated by its OWN style block
    // We can check this by seeing if it has a humn- class
    expect(item.className).toMatch(/humn-\w+/)

    // Trigger toggle (tests interactivity passed down to children)
    item.click()
    expect(item.className).toContain('done')
  })
})
