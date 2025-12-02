/**
 * @file Metrics module for development-only logging and analytics.
 * @module metrics
 */

// Vite/Rollup replaces this constant at build time.
// In production, 'isDev' becomes false, allowing dead-code elimination.
export const isDev = import.meta.env ? import.meta.env.DEV : false

let metrics = {
  diffs: 0,
  patches: 0,
  componentsRendered: 0,
  elementsCreated: 0,
  elementsRemoved: 0,
}

let frameId = null

/**
 * Logs the aggregated metrics to the console and resets counters.
 * Runs once per animation frame to prevent console spam.
 */
function flush() {
  if (
    metrics.diffs > 0 ||
    metrics.patches > 0 ||
    metrics.componentsRendered > 0
  ) {
    console.groupCollapsed(
      `%c[Humn Metrics] %c${new Date().toLocaleTimeString()}`,
      'color: #ff0055; font-weight: bold;',
      'color: gray; font-weight: normal;',
    )
    console.log(
      `%cDiff Checks:        %c${metrics.diffs}`,
      'color: gray',
      'font-weight: bold',
    )
    console.log(
      `%cDOM Updates:        %c${metrics.patches}`,
      'color: gray',
      'font-weight: bold',
    )
    console.log(
      `%cComponents Rendered:%c${metrics.componentsRendered}`,
      'color: gray',
      'font-weight: bold',
    )
    console.log(
      `%cElements Created:   %c${metrics.elementsCreated}`,
      'color: gray',
      'font-weight: bold',
    )
    console.log(
      `%cElements Removed:   %c${metrics.elementsRemoved}`,
      'color: gray',
      'font-weight: bold',
    )
    console.groupEnd()
  }

  // Reset metrics
  metrics = {
    diffs: 0,
    patches: 0,
    componentsRendered: 0,
    elementsCreated: 0,
    elementsRemoved: 0,
  }
  frameId = null
}

/**
 * Tracks a metric event.
 * @param {'diffs' | 'patches' | 'componentsRendered' | 'elementsCreated' | 'elementsRemoved'} key - The metric to track.
 */
export const track = (key) => {
  if (!isDev) return

  if (metrics[key] !== undefined) {
    metrics[key]++
  }

  if (!frameId) {
    frameId = requestAnimationFrame(flush)
  }
}
