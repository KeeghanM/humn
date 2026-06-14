import fs from 'fs'
import path from 'path'
import { performance } from 'perf_hooks'
import { JSDOM } from 'jsdom'

import { mount } from '../src/index.js'
import {
  createLargeAppComponents,
  createRenderCounters,
} from '../src/__tests__/fixtures/large-app-components.js'
import { createLargeAppCortex } from '../src/__tests__/fixtures/large-app-cortex.js'

function getArg(name, fallback) {
  const prefix = `--${name}=`
  const match = process.argv.find((arg) => arg.startsWith(prefix))
  if (!match) return fallback

  return match.slice(prefix.length)
}

function getNumberArg(name, fallback) {
  const value = Number(getArg(name, fallback))
  return Number.isFinite(value) ? value : fallback
}

function setupDom() {
  const dom = new JSDOM(
    '<!doctype html><html><head></head><body></body></html>',
    {
      url: 'http://localhost/',
    },
  )

  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.localStorage = dom.window.localStorage
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: dom.window.navigator,
  })
  globalThis.KeyboardEvent = dom.window.KeyboardEvent
  globalThis.MouseEvent = dom.window.MouseEvent
  globalThis.Event = dom.window.Event
}

async function flushUpdates() {
  await Promise.resolve()
}

async function time(name, run) {
  const start = performance.now()
  const value = await run()
  const duration = performance.now() - start

  return { duration, name, value }
}

function createScenario(rowCount) {
  document.body.innerHTML = ''
  const target = document.createElement('div')
  document.body.appendChild(target)

  const counters = createRenderCounters()
  const cortex = createLargeAppCortex({ rowCount })
  const { App } = createLargeAppComponents(cortex, counters)

  return { App, counters, cortex, target }
}

async function runBenchmark({ mixedUpdates, notificationUpdates, rowCount }) {
  setupDom()

  const initial = await time('initialRender', async () => {
    const scenario = createScenario(rowCount)
    mount(scenario.target, scenario.App)
    await flushUpdates()

    return {
      domNodes: scenario.target.querySelectorAll('*').length,
      renders: scenario.counters,
      rows: scenario.target.querySelectorAll('[data-row-id]').length,
    }
  })

  // Each update scenario includes a fresh mount so repeated benchmark runs stay
  // isolated and comparable without cross-scenario DOM or subscription state.
  const notifications = await time('notificationUpdates', async () => {
    const scenario = createScenario(rowCount)
    mount(scenario.target, scenario.App)

    for (let index = 0; index < notificationUpdates; index++) {
      scenario.cortex.synapses.incrementNotifications()
    }
    await flushUpdates()

    return {
      renders: scenario.counters,
      text: scenario.target.querySelector('[data-testid="large-sidebar"]')
        .textContent,
    }
  })

  // Keep setup inside the timed block to measure the realistic cost of mounting
  // a screen and applying a burst of app updates from a clean start.
  const mixed = await time('mixedUpdates', async () => {
    const scenario = createScenario(rowCount)
    mount(scenario.target, scenario.App)

    for (let index = 1; index <= mixedUpdates; index++) {
      scenario.cortex.synapses.toggleRow(index)
      scenario.cortex.synapses.setActive(index)
      if (index % 10 === 0) scenario.cortex.synapses.recordSave()
    }
    scenario.cortex.synapses.updateScores(5)
    scenario.cortex.synapses.setFilter(
      `Project task ${Math.floor(rowCount / 2)}`,
    )
    await flushUpdates()

    return {
      renders: scenario.counters,
      rows: scenario.target.querySelectorAll('[data-row-id]').length,
      text: scenario.target.textContent,
    }
  })

  return {
    benchmark: 'humn-large-app',
    node: process.version,
    operations: {
      mixedUpdates,
      notificationUpdates,
      rowCount,
    },
    results: [initial, notifications, mixed].map((result) => ({
      durationMs: Number(result.duration.toFixed(3)),
      name: result.name,
      value: result.value,
    })),
    timestamp: new Date().toISOString(),
  }
}

const rowCount = getNumberArg('rows', 1000)
const notificationUpdates = getNumberArg('notification-updates', 100)
const mixedUpdates = getNumberArg('mixed-updates', 100)
const outputPath = getArg('output', '')

const result = await runBenchmark({
  mixedUpdates,
  notificationUpdates,
  rowCount,
})
const json = JSON.stringify(result, null, 2)

if (outputPath) {
  try {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, `${json}\n`, 'utf8')
  } catch (error) {
    console.error(`Failed to write benchmark output to ${outputPath}:`, error)
    process.exitCode = 1
  }
}

console.log(json)
