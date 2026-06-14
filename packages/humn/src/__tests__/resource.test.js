import { describe, expect, it, vi } from 'vitest'

import { Cortex, resource, resourceSynapse } from '../index.js'

describe('resource', () => {
  it('should initialize with correct default shape', () => {
    const res = resource([])
    expect(res).toEqual({
      __humn_resource: true,
      data: [],
      status: 'idle',
      loading: false,
      error: null,
      updatedAt: null,
      requestId: 0,
    })
  })
})

describe('resourceSynapse', () => {
  it('should handle successful fetch flow', async () => {
    const cortex = new Cortex({
      memory: {
        users: resource(null),
      },
      synapses: (set, get) => ({
        loadUsers: resourceSynapse(set, get, 'users', async () => {
          return [{ id: 1, name: 'Alice' }]
        }),
      }),
    })

    const fetchPromise = cortex.synapses.loadUsers()

    // Check loading state immediately
    expect(cortex.memory.users.loading).toBe(true)
    expect(cortex.memory.users.status).toBe('loading')

    await fetchPromise

    // Check success state
    expect(cortex.memory.users.loading).toBe(false)
    expect(cortex.memory.users.status).toBe('success')
    expect(cortex.memory.users.data).toEqual([{ id: 1, name: 'Alice' }])
    expect(cortex.memory.users.updatedAt).toBeTypeOf('number')
  })

  it('should handle fetch errors', async () => {
    const cortex = new Cortex({
      memory: {
        users: resource(null),
      },
      synapses: (set, get) => ({
        loadUsers: resourceSynapse(set, get, 'users', async () => {
          throw new Error('Network fail')
        }),
      }),
    })

    await cortex.synapses.loadUsers()

    expect(cortex.memory.users.loading).toBe(false)
    expect(cortex.memory.users.status).toBe('error')
    expect(cortex.memory.users.error.message).toBe('Network fail')
  })

  it('should skip fetching if already loading', async () => {
    let fetchCount = 0
    const cortex = new Cortex({
      memory: {
        users: resource(null),
      },
      synapses: (set, get) => ({
        loadUsers: resourceSynapse(set, get, 'users', async () => {
          fetchCount++
          await new Promise((r) => setTimeout(r, 10))
          return true
        }),
      }),
    })

    const p1 = cortex.synapses.loadUsers()
    const p2 = cortex.synapses.loadUsers()

    await Promise.all([p1, p2])

    expect(fetchCount).toBe(1)
  })

  it('should skip fetching if already success unless forced', async () => {
    let fetchCount = 0
    const cortex = new Cortex({
      memory: {
        users: resource(null),
      },
      synapses: (set, get) => ({
        loadUsers: resourceSynapse(set, get, 'users', async () => {
          fetchCount++
          return true
        }),
      }),
    })

    await cortex.synapses.loadUsers() // Fetches
    await cortex.synapses.loadUsers() // Skips

    expect(fetchCount).toBe(1)

    await cortex.synapses.loadUsers(null, { force: true }) // Fetches again

    expect(fetchCount).toBe(2)
  })

  it('should ignore stale responses due to race conditions', async () => {
    let resolveFirst, resolveSecond

    const cortex = new Cortex({
      memory: {
        users: resource(null),
      },
      synapses: (set, get) => ({
        loadUsers: resourceSynapse(set, get, 'users', async (id) => {
          return new Promise((resolve) => {
            if (id === 1) resolveFirst = resolve
            if (id === 2) resolveSecond = resolve
          })
        }),
      }),
    })

    // Start request 1
    cortex.synapses.loadUsers(1, { force: true })

    // Start request 2 immediately (forces new request id)
    cortex.synapses.loadUsers(2, { force: true })

    // Resolve 2 first
    resolveSecond('data2')
    await new Promise((r) => setTimeout(r, 0)) // wait tick

    expect(cortex.memory.users.data).toBe('data2')

    // Resolve 1 later (stale)
    resolveFirst('data1')
    await new Promise((r) => setTimeout(r, 0)) // wait tick

    // Should still be data2
    expect(cortex.memory.users.data).toBe('data2')
  })
})
