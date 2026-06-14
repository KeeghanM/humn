import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Cortex, persist } from '../index'

describe('Cortex (State Management)', () => {
  // Clear storage before each test to ensure isolation
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('should initialize memory and synapses', () => {
    const cortex = new Cortex({
      memory: { count: 0 },
      synapses: (set) => ({
        increment: () => set((state) => ({ count: state.count + 1 })),
      }),
    })

    expect(cortex.memory.count).toBe(0)
    cortex.synapses.increment()
    expect(cortex.memory.count).toBe(1)
  })

  it('should handle deep nested updates (State only)', () => {
    // This verifies the Proxy logic works without needing to mount a component
    const cortex = new Cortex({
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

    expect(cortex.memory.user.profile.theme).toBe('light')
    cortex.synapses.goDark()
    expect(cortex.memory.user.profile.theme).toBe('dark')
  })

  it('should preserve unchanged references during mutative updates', () => {
    const cortex = new Cortex({
      memory: {
        settings: { locale: 'en' },
        user: { profile: { theme: 'light' } },
      },
      synapses: (set) => ({
        goDark: () =>
          set((state) => {
            state.user.profile.theme = 'dark'
          }),
      }),
    })

    const settings = cortex.memory.settings
    const user = cortex.memory.user
    const profile = cortex.memory.user.profile

    cortex.synapses.goDark()

    expect(cortex.memory.settings).toBe(settings)
    expect(cortex.memory.user).not.toBe(user)
    expect(cortex.memory.user.profile).not.toBe(profile)
    expect(cortex.memory.user.profile.theme).toBe('dark')
  })

  it('should handle array mutation and delete operations in mutative updates', () => {
    const cortex = new Cortex({
      memory: {
        items: [
          { id: 1, name: 'One' },
          { id: 2, name: 'Two' },
        ],
        user: { profile: { avatar: 'avatar.png', name: 'Keeghan' } },
      },
      synapses: (set) => ({
        update: () =>
          set((state) => {
            state.items.push({ id: 3, name: 'Three' })
            state.items.splice(1, 1)
            state.items[0].name = 'Changed'
            delete state.user.profile.avatar
          }),
      }),
    })

    cortex.synapses.update()

    expect(cortex.memory.items).toEqual([
      { id: 1, name: 'Changed' },
      { id: 3, name: 'Three' },
    ])
    expect(cortex.memory.user.profile).toEqual({ name: 'Keeghan' })
  })

  it('should use initial value if storage is empty', () => {
    const cortex = new Cortex({
      memory: {
        count: persist(10, { key: 'my-count' }),
      },
      synapses: () => ({}),
    })

    expect(cortex.memory.count).toBe(10)
  })

  it('should hydrate from local storage if data exists', () => {
    // Simulate existing data
    localStorage.setItem('my-count', JSON.stringify(99))

    const cortex = new Cortex({
      memory: {
        count: persist(0, { key: 'my-count' }),
      },
      synapses: () => ({}),
    })

    // Should ignore '0' and use '99'
    expect(cortex.memory.count).toBe(99)
  })

  it('should update local storage when persisted state changes', () => {
    const cortex = new Cortex({
      memory: {
        count: persist(0),
      },
      synapses: (set) => ({
        inc: () => set((s) => ({ count: s.count + 1 })),
      }),
    })

    cortex.synapses.inc()

    expect(localStorage.getItem('count')).toBe('1')
  })

  it('should NOT update local storage for non-persisted keys', () => {
    const cortex = new Cortex({
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

    cortex.synapses.changeTemp()

    expect(spy).not.toHaveBeenCalled()
  })
})
