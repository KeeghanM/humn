import { describe, expect, it } from 'vitest'

import { Cortex, css, h, mount } from '../index'

async function flushUpdates() {
  await Promise.resolve()
}

describe('Rendering & Reactivity', () => {
  it('should render a simple component', () => {
    const App = () => h('div', {}, 'Hello, World!')
    const target = document.createElement('div')
    mount(target, App)
    expect(target.innerHTML).toBe('<div>Hello, World!</div>')
  })

  it('should update DOM text when cortex changes', async () => {
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
    await flushUpdates()
    expect(target.innerHTML).toBe('<div>Hello, McGarry!</div>')
  })

  it('should reorder keyed elements (Keyed Diffing)', async () => {
    const cortex = new Cortex({
      memory: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] },
      synapses: (set) => ({
        reverse: () => set((s) => ({ items: [...s.items].reverse() })),
      }),
    })

    const App = () => {
      const { items } = cortex.memory
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

    cortex.synapses.reverse()
    await flushUpdates()

    expect(target.firstChild.firstChild.id).toBe('li-3')

    // Verify DOM reuse (Identity Check)
    const newItem1_DOM = target.querySelector('#li-1')
    expect(newItem1_DOM).toBe(item1_DOM)
    expect(newItem1_DOM).not.toBe(item3_DOM)
  })

  // --- EDGE CASES ---

  it('should handle conditional rendering', async () => {
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
    await flushUpdates()
    expect(target.querySelector('#msg').innerHTML).toBe('Visible')
    ui.synapses.toggle()
    await flushUpdates()
    expect(target.querySelector('#msg')).toBeNull()
  })

  it('should sync input values even if DOM is dirty', async () => {
    const cortex = new Cortex({
      memory: { text: '' },
      synapses: (set) => ({
        reset: () => set({ text: '' }),
      }),
    })

    const App = () => h('input', { value: cortex.memory.text, id: 'my-input' })
    const target = document.createElement('div')
    mount(target, App)
    const input = target.querySelector('input')

    // Simulate user typing (Dirty DOM)
    input.value = 'Hello'

    // Force reset from State
    cortex.synapses.reset()
    await flushUpdates()

    expect(input.value).toBe('')
  })

  it('should update styles on state change', async () => {
    // This also tests "Deep Nested Updates" but verifies via CSS class application
    const cortex = new Cortex({
      memory: { user: { profile: { theme: 'light' } } },
      synapses: (set) => ({
        goDark: () =>
          set((state) => {
            state.user.profile.theme = 'dark'
          }),
      }),
    })

    const App = () => {
      const { user } = cortex.memory
      return h('div', { class: user.profile.theme }, 'Content')
    }

    const target = document.createElement('div')
    mount(target, App)

    expect(target.firstChild.className).toBe('light')
    cortex.synapses.goDark()
    await flushUpdates()
    expect(target.firstChild.className).toBe('dark')
  })

  it('should update nested components created during initial DOM creation', async () => {
    const cortex = new Cortex({
      memory: { count: 0 },
      synapses: (set) => ({
        increment: () => set((state) => ({ count: state.count + 1 })),
      }),
    })
    const Child = () => h('span', {}, String(cortex.memory.count))
    const App = () => h('div', {}, [h(Child)])
    const target = document.createElement('div')

    mount(target, App)
    cortex.synapses.increment()
    await flushUpdates()

    expect(target.textContent).toBe('1')
  })

  it('should update keyed components after reorder', async () => {
    const cortex = new Cortex({
      memory: {
        items: [
          { id: 1, label: 'One' },
          { id: 2, label: 'Two' },
          { id: 3, label: 'Three' },
        ],
      },
      synapses: (set) => ({
        rename: (id, label) =>
          set((state) => {
            const item = state.items.find((candidate) => candidate.id === id)
            if (item) item.label = label
          }),
        reverse: () => set((state) => ({ items: [...state.items].reverse() })),
      }),
    })
    const Row = ({ id }) => {
      const item = cortex.memory.items.find((candidate) => candidate.id === id)
      return h('li', { 'data-id': String(id) }, item.label)
    }
    const App = () =>
      h(
        'ul',
        {},
        cortex.memory.items.map((item) =>
          h(Row, { id: item.id, key: item.id }),
        ),
      )
    const target = document.createElement('div')

    mount(target, App)
    cortex.synapses.reverse()
    await flushUpdates()
    cortex.synapses.rename(1, 'Moved')
    await flushUpdates()

    expect(target.querySelector('[data-id="1"]').textContent).toBe('Moved')
    expect(target.firstChild.lastChild.dataset.id).toBe('1')
  })

  it('should ignore queued updates for components removed in the same tick', async () => {
    const cortex = new Cortex({
      memory: { mode: 'span', show: true },
      synapses: (set) => ({
        hide: () => set({ show: false }),
        switchMode: () => set({ mode: 'strong' }),
      }),
    })
    const Child = () =>
      cortex.memory.mode === 'span'
        ? h('span', {}, 'child')
        : h('strong', {}, 'child')
    const App = () => h('div', {}, [cortex.memory.show ? h(Child) : null])
    const target = document.createElement('div')

    mount(target, App)
    cortex.synapses.hide()
    cortex.synapses.switchMode()
    await flushUpdates()

    expect(target.innerHTML).toBe('<div></div>')
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

  describe('Scoped CSS Runtime', () => {
    it('should transform selectors for single-root components (Union Strategy)', () => {
      // 1. Simulate the Compiler passing `true` for isSingleRoot
      const className = css(
        `
      div { color: red; }
      .card { background: blue; }
      :hover { opacity: 0.8; }
    `,
        true,
      )

      const styleTag = document.getElementById('humn-styles')
      const content = styleTag.textContent

      // 1. Verify "div" became "div&, div"
      expect(content).toContain('div&, div')

      // 2. Verify ".card" became ".card&, .card"
      expect(content).toContain('.card&, .card')

      // 3. Verify ":hover" became ":hover&, :hover"
      expect(content).toContain(':hover&, :hover')

      // 4. Verify the class wrapper exists (roughly)
      expect(content).toContain(`.${className} {`)
    })

    it('should handle compound selectors and attributes', () => {
      const className = css(
        `
      .card.active { color: green; }
      input[type="text"] { border: none; }
    `,
        true,
      )

      const styleTag = document.getElementById('humn-styles')

      expect(styleTag.textContent).toContain('.card.active&, .card.active')
      expect(styleTag.textContent).toContain(
        'input[type="text"]&, input[type="text"]',
      )
    })

    it('should protect descendant selectors and keyframes', () => {
      const className = css(
        `
      /* Descendant selector should NOT match root */
      header .logo { height: 50px; } 

      @keyframes fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `,
        true,
      )

      const styleTag = document.getElementById('humn-styles')

      // "header .logo" starts with "header", but ".logo" is preceded by a space.
      // The regex hard-start (^|[{};,]) prevents transforming .logo
      expect(styleTag.textContent).toContain(`header .logo`)
      expect(styleTag.textContent).not.toContain(`.logo.${className}`) // Should NOT apply to root

      // Keyframes should be untouched
      expect(styleTag.textContent).toContain('from { opacity: 0; }')
      expect(styleTag.textContent).not.toContain(`from&`)
    })
  })
})
