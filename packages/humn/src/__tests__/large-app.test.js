import { describe, expect, it } from 'vitest'

import { mount } from '../index.js'
import {
  createLargeAppComponents,
  createRenderCounters,
} from './fixtures/large-app-components.js'
import { createLargeAppStore } from './fixtures/large-app-store.js'

async function flushUpdates() {
  await Promise.resolve()
}

describe('Large app regression coverage', () => {
  it('renders a multi-component app with thousands of DOM elements', () => {
    const store = createLargeAppStore({ rowCount: 1200 })
    const { App } = createLargeAppComponents(store)
    const target = document.createElement('div')

    mount(target, App)

    expect(target.querySelector('[data-testid="large-header"]')).not.toBeNull()
    expect(target.querySelector('[data-testid="large-sidebar"]')).not.toBeNull()
    expect(target.querySelectorAll('[data-row-id]').length).toBe(1200)
    expect(target.textContent).toContain('Project task 1200')
  })

  it('preserves row DOM identity across unrelated state updates', async () => {
    const store = createLargeAppStore({ rowCount: 800 })
    const { App } = createLargeAppComponents(store)
    const target = document.createElement('div')

    mount(target, App)

    const firstRow = target.querySelector('[data-row-id="1"]')
    const middleRow = target.querySelector('[data-row-id="400"]')
    const lastRow = target.querySelector('[data-row-id="800"]')

    for (let index = 0; index < 25; index++) {
      store.synapses.incrementNotifications()
    }
    await flushUpdates()

    expect(target.querySelector('[data-row-id="1"]')).toBe(firstRow)
    expect(target.querySelector('[data-row-id="400"]')).toBe(middleRow)
    expect(target.querySelector('[data-row-id="800"]')).toBe(lastRow)
    expect(target.textContent).toContain('Notifications: 25')
  })

  it('handles many mixed state updates without losing list correctness', async () => {
    const store = createLargeAppStore({ rowCount: 600 })
    const { App } = createLargeAppComponents(store)
    const target = document.createElement('div')

    mount(target, App)

    for (let index = 1; index <= 100; index++) {
      store.synapses.toggleRow(index)
      store.synapses.setActive(index)
      if (index % 10 === 0) store.synapses.recordSave()
    }
    store.synapses.updateScores(3)
    store.synapses.setFilter('Project task 59')
    await flushUpdates()

    expect(target.querySelectorAll('[data-row-id]').length).toBe(11)
    expect(target.querySelector('[data-row-id="59"]').className).toBe(
      'selected',
    )
    expect(target.textContent).toContain('Active: 100')
    expect(target.textContent).toContain('Saves: 10')

    store.synapses.clearFilter()
    await flushUpdates()

    expect(target.querySelectorAll('[data-row-id]').length).toBe(600)
  })

  it('records render counts for future render-granularity assertions', async () => {
    const counters = createRenderCounters()
    const store = createLargeAppStore({ rowCount: 300 })
    const { App } = createLargeAppComponents(store, counters)
    const target = document.createElement('div')

    mount(target, App)
    store.synapses.incrementNotifications()
    await flushUpdates()

    expect(counters.App).toBeGreaterThan(0)
    expect(counters.Header).toBeGreaterThan(0)
    expect(counters.Sidebar).toBeGreaterThan(0)
    expect(counters.RowList).toBeGreaterThan(0)
    expect(counters.Row).toBeGreaterThanOrEqual(300)
  })
})
