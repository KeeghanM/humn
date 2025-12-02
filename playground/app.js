import { h, mount } from '../src/index.js'
import { todoStore } from './todo-store.js'
import { todoStyles } from './todo-styles.js'

const App = () => {
  const { items, inputValue, errorMessage, isLoading } = todoStore.memory
  const { addTodo, toggle, updateInput, fetchRandom } = todoStore.synapses

  return h('div', { class: todoStyles }, [
    h('h1', { key: 'title' }, 'Humn Todo'),

    h('div', { key: 'inputs', class: 'input-group' }, [
      h('input', {
        value: inputValue,
        oninput: (e) => updateInput(e.target.value),
        placeholder: 'What needs doing?',
        onkeydown: (e) => e.key === 'Enter' && addTodo(),
        disabled: isLoading,
      }),
      h('button', { onclick: addTodo }, 'Add'),
      h(
        'button',
        {
          class: 'secondary',
          onclick: fetchRandom,
          disabled: isLoading,
        },
        '🎲',
      ),
    ]),

    isLoading
      ? h('div', { key: 'loader', class: 'loading' }, 'Fetching task...')
      : null,

    errorMessage
      ? h('p', { key: 'error', class: 'error' }, errorMessage)
      : null,

    h(
      'div',
      { key: 'items-list' },
      items.map((item) =>
        h(
          'div',
          {
            key: item.id,
            class: `card ${item.done ? 'done' : ''}`,
            onclick: () => toggle(item.id),
          },
          item.text,
        ),
      ),
    ),
  ])
}

// --- MOUNT ---
mount(document.getElementById('app'), App)
