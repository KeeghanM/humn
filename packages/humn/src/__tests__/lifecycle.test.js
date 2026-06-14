import { describe, expect, it, vi } from 'vitest'

import { Cortex, h, mount, onCleanup, onMount } from '../index'

async function flushUpdates() {
  await Promise.resolve()
}

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
    const cortex = new Cortex({
      memory: { show: true },
      synapses: (set) => ({ toggle: () => set((s) => ({ show: !s.show })) }),
    })

    const Child = () => {
      onCleanup(onCleanupSpy)
      return h('div', {}, 'Child')
    }

    const App = () => {
      const { show } = cortex.memory
      return h('div', {}, [show ? h(Child) : null])
    }

    const target = document.createElement('div')
    mount(target, App)

    // 1. Initial Render
    expect(target.innerHTML).toContain('Child')
    expect(onCleanupSpy).not.toHaveBeenCalled()

    // 2. Remove Child
    cortex.synapses.toggle()
    await flushUpdates()

    expect(target.innerHTML).not.toContain('Child')
    expect(onCleanupSpy).toHaveBeenCalledTimes(1)
  })

  it('should not fire mount or cleanup hooks when a component updates', async () => {
    const cleanupSpy = vi.fn()
    const mountSpy = vi.fn()
    const cortex = new Cortex({
      memory: { count: 0 },
      synapses: (set) => ({
        increment: () =>
          set((state) => {
            state.count += 1
          }),
      }),
    })

    const Counter = () => {
      const { count } = cortex.memory
      onMount(mountSpy)
      onCleanup(cleanupSpy)
      return h('div', {}, String(count))
    }

    const target = document.createElement('div')
    mount(target, Counter)

    await new Promise((r) => setTimeout(r, 0))
    expect(mountSpy).toHaveBeenCalledTimes(1)
    expect(cleanupSpy).toHaveBeenCalledTimes(0)

    cortex.synapses.increment()
    await flushUpdates()

    await new Promise((r) => setTimeout(r, 0))
    expect(target.textContent).toBe('1')
    expect(cleanupSpy).toHaveBeenCalledTimes(0)
    expect(mountSpy).toHaveBeenCalledTimes(1)
  })

  it('should preserve original cleanup hooks across updates', async () => {
    const cleanupSpy = vi.fn()
    const mountedResource = { id: 'mounted-resource' }
    const cortex = new Cortex({
      memory: { count: 0, show: true },
      synapses: (set) => ({
        hide: () => set({ show: false }),
        increment: () => set((state) => ({ count: state.count + 1 })),
      }),
    })

    const Child = () => {
      onMount(() => mountedResource)
      onCleanup(() => cleanupSpy(mountedResource))
      return h('span', {}, String(cortex.memory.count))
    }
    const App = () => h('div', {}, [cortex.memory.show ? h(Child) : null])
    const target = document.createElement('div')

    mount(target, App)
    cortex.synapses.increment()
    await flushUpdates()
    cortex.synapses.hide()
    await flushUpdates()

    expect(cleanupSpy).toHaveBeenCalledTimes(1)
    expect(cleanupSpy).toHaveBeenCalledWith(mountedResource)
  })

  it('should continue running cleanup hooks when one throws', async () => {
    const cleanupError = new Error('cleanup failed')
    const throwingCleanup = vi.fn(() => {
      throw cleanupError
    })
    const stableCleanup = vi.fn()
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const cortex = new Cortex({
      memory: { show: true },
      synapses: (set) => ({
        hide: () => set({ show: false }),
      }),
    })

    const Child = () => {
      onCleanup(throwingCleanup)
      onCleanup(stableCleanup)
      return h('div', {}, 'Child')
    }

    const App = () => {
      const { show } = cortex.memory
      return h('div', {}, [show ? h(Child) : null])
    }

    const target = document.createElement('div')
    mount(target, App)

    cortex.synapses.hide()
    await flushUpdates()

    expect(throwingCleanup).toHaveBeenCalledTimes(1)
    expect(stableCleanup).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error in cleanup hook:',
      cleanupError,
    )

    consoleErrorSpy.mockRestore()
  })

  it('should continue running mount hooks when one throws', async () => {
    const mountError = new Error('mount failed')
    const throwingMount = vi.fn(() => {
      throw mountError
    })
    const stableMount = vi.fn()
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const Child = () => {
      onMount(throwingMount)
      onMount(stableMount)
      return h('div', {}, 'Child')
    }

    const target = document.createElement('div')
    mount(target, Child)

    await new Promise((r) => setTimeout(r, 0))

    expect(throwingMount).toHaveBeenCalledTimes(1)
    expect(stableMount).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error in mount hook:',
      mountError,
    )

    consoleErrorSpy.mockRestore()
  })
})
