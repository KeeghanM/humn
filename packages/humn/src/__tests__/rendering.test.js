import { describe, expect, it } from 'vitest'

import { Cortex, css, h, mount } from '../index'

describe('Rendering & Reactivity', () => {
  it('should render a simple component', () => {
    const App = () => h('div', {}, 'Hello, World!')
    const target = document.createElement('div')
    mount(target, App)
    expect(target.innerHTML).toBe('<div>Hello, World!</div>')
  })

  it('should update DOM text when cortex changes', () => {
    const user = new Cortex({
      memory: { name: 'Keeghan' },
      synapses: (set) => ({
        changeName: (newName) => set({ name: newName }),
      }),
    })

    const App = () => h('div', {}, `Hello, ${user.memory.name}!`)
    const target = document.createElement('div')
    mount(target, App)

    expect(target.innerHTML).toBe('<div>Hello, Keeghan!</div>')
    user.synapses.changeName('McGarry')
    expect(target.innerHTML).toBe('<div>Hello, McGarry!</div>')
  })

  it('should reorder keyed elements (Keyed Diffing)', () => {
    const store = new Cortex({
      memory: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      synapses: (set) => ({
        reverse: () => set((s) => ({ items: [...s.items].reverse() })),
      }),
    })

    const App = () => {
      const { items } = store.memory
      return h(
        'ul',
        {},
        items.map((item) =>
          h('li', { key: item.id, id: `li-${item.id}` }, item.id),
        ),
      )
    }

    const target = document.createElement('div')
    mount(target, App)

    // Capture element identity
    const item1_DOM = target.querySelector('#li-1')
    const item3_DOM = target.querySelector('#li-3')

    expect(target.firstChild.firstChild.id).toBe('li-1')

    store.synapses.reverse()

    expect(target.firstChild.firstChild.id).toBe('li-3')

    // Verify DOM reuse (Identity Check)
    const newItem1_DOM = target.querySelector('#li-1')
    expect(newItem1_DOM).toBe(item1_DOM)
    expect(newItem1_DOM).not.toBe(item3_DOM)
  })

  // --- EDGE CASES ---

  it('should handle conditional rendering', () => {
    const ui = new Cortex({
      memory: { show: false },
      synapses: (set) => ({ toggle: () => set((s) => ({ show: !s.show })) }),
    })

    const App = () => {
      const { show } = ui.memory
      return h('div', {}, [
        h('h1', {}, 'Title'),
        show ? h('p', { id: 'msg' }, 'Visible') : null,
      ])
    }

    const target = document.createElement('div')
    mount(target, App)

    expect(target.querySelector('#msg')).toBeNull()
    ui.synapses.toggle()
    expect(target.querySelector('#msg').innerHTML).toBe('Visible')
    ui.synapses.toggle()
    expect(target.querySelector('#msg')).toBeNull()
  })

  it('should sync input values even if DOM is dirty', () => {
    const store = new Cortex({
      memory: { text: '' },
      synapses: (set) => ({
        reset: () => set({ text: '' }),
      }),
    })

    const App = () => h('input', { value: store.memory.text, id: 'my-input' })
    const target = document.createElement('div')
    mount(target, App)
    const input = target.querySelector('input')

    // Simulate user typing (Dirty DOM)
    input.value = 'Hello'

    // Force reset from State
    store.synapses.reset()

    expect(input.value).toBe('')
  })

  it('should update styles on state change', () => {
    // This also tests "Deep Nested Updates" but verifies via CSS class application
    const store = new Cortex({
      memory: { user: { profile: { theme: 'light' } } },
      synapses: (set) => ({
        goDark: () =>
          set((state) => {
            state.user.profile.theme = 'dark'
          }),
      }),
    })

    const App = () => {
      const { user } = store.memory
      return h('div', { class: user.profile.theme }, 'Content')
    }

    const target = document.createElement('div')
    mount(target, App)

    expect(target.firstChild.className).toBe('light')
    store.synapses.goDark()
    expect(target.firstChild.className).toBe('dark')
  })

  it('should render components with scoped styles', () => {
    const alertStyle = css`
      background: red;
      color: white;
    `
    const AlertComponent = () => h('div', { class: alertStyle }, 'Warning!')
    const target = document.createElement('div')
    mount(target, AlertComponent)

    const el = target.firstChild
    expect(el.className).toBe(alertStyle)

    const styleTag = document.getElementById('humn-styles')
    expect(styleTag.textContent).toContain(`.${alertStyle} {`)
    expect(styleTag.textContent).toContain('background: red;')
  })
})
