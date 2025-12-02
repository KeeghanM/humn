import { getObserver } from './observer.js'

/**
 * @typedef {object} Synapses
 * @property {function} set - Function to update the memory
 * @property {function} get - Function to get the memory
 */

/**
 * @typedef {object} CortexParams
 * @property {object} memory - The initial state
 * @property {function(function, function): object} synapses - The synapses function
 */

/**
 * The Cortex class manages the state of the application.
 * This uses a Proxy for fine-grained reactivity, ensuring only those components
 * which use the updated value get re-rendered.
 */
export class Cortex {
  /**
   * Creates an instance of Cortex.
   * @param {CortexParams} CortexParams - The parameters for the Cortex.
   */
  constructor({ memory, synapses }) {
    this._memory = memory
    this._listeners = new Map()

    const get = () => this._memory

    const set = (updater) => {
      let nextState
      let changedPaths = new Set()

      if (typeof updater === 'function') {
        const clone = structuredClone(this._memory)

        const proxy = this._createChangeTrackingProxy(clone, changedPaths)
        const result = updater(proxy)
        nextState = result || clone
      } else {
        nextState = { ...this._memory, ...updater }

        // For object merge, all top-level keys get changed
        changedPaths = new Set(Object.keys(updater))
      }

      this._memory = nextState
      this._notifyRelevantListeners(changedPaths)
    }

    this.synapses = synapses(set, get)
  }

  /**
   * Creates a Proxy that tracks which properties are being mutated
   */
  _createChangeTrackingProxy(obj, changedPaths, path = '') {
    return new Proxy(obj, {
      set: (target, prop, value) => {
        const fullPath = path ? `${path}.${prop}` : prop
        changedPaths.add(fullPath)

        // Handle nested objects
        if (typeof value === 'object' && value !== null) {
          target[prop] = this._createChangeTrackingProxy(
            value,
            changedPaths,
            fullPath,
          )
        } else {
          target[prop] = value
        }
        return true
      },
    })
  }

  /**
   * Only notify listeners that read properties which changed
   */
  _notifyRelevantListeners(changedPaths) {
    this._listeners.forEach((accessedPaths, renderFn) => {
      const shouldNotify = Array.from(accessedPaths).some((accessedPath) => {
        return Array.from(changedPaths).some((changedPath) => {
          // Check for exact match or parent/child relationship
          return (
            accessedPath === changedPath ||
            accessedPath.startsWith(changedPath + '.') ||
            changedPath.startsWith(accessedPath + '.')
          )
        })
      })

      if (shouldNotify) renderFn()
    })
  }

  /**
   * Creates a Proxy that tracks which properties are accessed during render
   */
  _createAccessTrackingProxy(obj, accessedPaths, path = '') {
    if (typeof obj !== 'object' || obj === null) return obj

    return new Proxy(obj, {
      get: (target, prop) => {
        // We don't care about prototype and symbol properties
        if (typeof prop === 'symbol' || prop === '__proto__')
          return target[prop]

        const fullPath = path ? `${path}.${prop}` : prop
        accessedPaths.add(fullPath)

        const value = target[prop]

        // Recursively wrap nested objects
        if (typeof value === 'object' && value !== null)
          return this._createAccessTrackingProxy(value, accessedPaths, fullPath)

        return value
      },
    })
  }

  /**
   * Returns memory wrapped in a tracking Proxy
   */
  get memory() {
    const currentObserver = getObserver()

    if (!currentObserver) return this._memory

    if (!this._listeners.has(currentObserver))
      this._listeners.set(currentObserver, new Set())

    const accessedPaths = this._listeners.get(currentObserver)

    // This gives us fresh tracking each render
    accessedPaths.clear()

    return this._createAccessTrackingProxy(this._memory, accessedPaths)
  }
}
