import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Cortex, persist } from '../index'

describe('Cortex (State Management)', () => {
  // Clear storage before each test to ensure isolation
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('should initialize memory and synapses', () => {
    const store = new Cortex({
      memory: { count: 0 },
      synapses: (set) => ({
        increment: () => set((state) => ({ count: state.count + 1 })),
      }),
    })

    expect(store.memory.count).toBe(0)
    store.synapses.increment()
    expect(store.memory.count).toBe(1)
  })

  it('should handle deep nested updates (State only)', () => {
    // This verifies the Proxy logic works without needing to mount a component
    const store = new Cortex({
      memory: {
        user: { profile: { theme: 'light' } },
      },
      synapses: (set) => ({
        goDark: () =>
          set((state) => {
            state.user.profile.theme = 'dark'
          }),
      }),
    })

    expect(store.memory.user.profile.theme).toBe('light')
    store.synapses.goDark()
    expect(store.memory.user.profile.theme).toBe('dark')
  })

  it('should use initial value if storage is empty', () => {
    const store = new Cortex({
      memory: {
        count: persist(10, { key: 'my-count' }),
      },
      synapses: () => ({}),
    })

    expect(store.memory.count).toBe(10)
  })

  it('should hydrate from local storage if data exists', () => {
    // Simulate existing data
    localStorage.setItem('my-count', JSON.stringify(99))

    const store = new Cortex({
      memory: {
        count: persist(0, { key: 'my-count' }),
      },
      synapses: () => ({}),
    })

    // Should ignore '0' and use '99'
    expect(store.memory.count).toBe(99)
  })

  it('should update local storage when persisted state changes', () => {
    const store = new Cortex({
      memory: {
        count: persist(0),
      },
      synapses: (set) => ({
        inc: () => set((s) => ({ count: s.count + 1 })),
      }),
    })

    store.synapses.inc()

    expect(localStorage.getItem('count')).toBe('1')
  })

  it('should NOT update local storage for non-persisted keys', () => {
    const store = new Cortex({
      memory: {
        count: persist(0),
        temp: 'transient',
      },
      synapses: (set) => ({
        changeTemp: () => set({ temp: 'changed' }),
      }),
    })

    // Spy on setItem to prove it wasn't called
    const spy = vi.spyOn(Storage.prototype, 'setItem')

    store.synapses.changeTemp()

    expect(spy).not.toHaveBeenCalled()
  })
})
