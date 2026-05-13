import { describe, expect, it, vi } from 'vitest'

import { Cortex, h, mount, onCleanup, onMount } from '../index'

describe('lifecycle', () => {
  it('should fire onMount when component appears', async () => {
    const onMountSpy = vi.fn()

    const Child = () => {
      onMount(onMountSpy)
      return h('div', {}, 'Child')
    }

    const target = document.createElement('div')
    mount(target, Child)

    // Wait for next tick (since onMount is async/setTimeout)
    await new Promise((r) => setTimeout(r, 0))

    expect(onMountSpy).toHaveBeenCalledTimes(1)
  })

  it('should fire onCleanup when component is removed', async () => {
    const onCleanupSpy = vi.fn()
    const store = new Cortex({
      memory: { show: true },
      synapses: (set) => ({ toggle: () => set((s) => ({ show: !s.show })) }),
    })

    const Child = () => {
      onCleanup(onCleanupSpy)
      return h('div', {}, 'Child')
    }

    const App = () => {
      const { show } = store.memory
      return h('div', {}, [show ? h(Child) : null])
    }

    const target = document.createElement('div')
    mount(target, App)

    // 1. Initial Render
    expect(target.innerHTML).toContain('Child')
    expect(onCleanupSpy).not.toHaveBeenCalled()

    // 2. Remove Child
    store.synapses.toggle()

    expect(target.innerHTML).not.toContain('Child')
    expect(onCleanupSpy).toHaveBeenCalledTimes(1)
  })

  it('should fire cleanup and remount hooks when a component updates', async () => {
    const cleanupSpy = vi.fn()
    const mountSpy = vi.fn()
    const store = new Cortex({
      memory: { count: 0 },
      synapses: (set) => ({
        increment: () =>
          set((state) => {
            state.count += 1
          }),
      }),
    })

    const Counter = () => {
      const { count } = store.memory
      onMount(mountSpy)
      onCleanup(cleanupSpy)
      return h('div', {}, String(count))
    }

    const target = document.createElement('div')
    mount(target, Counter)

    await new Promise((r) => setTimeout(r, 0))
    expect(mountSpy).toHaveBeenCalledTimes(1)
    expect(cleanupSpy).toHaveBeenCalledTimes(0)

    store.synapses.increment()

    await new Promise((r) => setTimeout(r, 0))
    expect(target.textContent).toBe('1')
    expect(cleanupSpy).toHaveBeenCalledTimes(1)
    expect(mountSpy).toHaveBeenCalledTimes(2)
  })
})
