import { isDev } from './metrics.js'
import { getObserver } from './observer.js'

/**
 * Mapped type for the Memory configuration object.
 * Allows each property to be the raw value OR a persisted wrapper.
 * @template T
 * @typedef { { [K in keyof T]: T[K] | import('./persist.js').Persisted<T[K]> } } MemoryInput
 */

/**
 * Deeply unwraps persisted values from the memory shape.
 * @template {object} T
 * @typedef {{ [K in keyof T]: T[K] extends import('./persist.js').Persisted<infer I> ? I : T[K] }} UnwrappedMemory
 */

/**
 * @template T
 * @callback Getter
 * @returns {T}
 */

/**
 * @template T
 * @callback Setter
 * @param {Partial<T> | ((state: T) => void | Partial<T> | unknown)} updater
 * @returns {void}
 */

/**
 * @template M, S
 * @callback SynapsesBuilder
 * @param {Setter<M>} set
 * @param {Getter<M>} get
 * @returns {S}
 */

/**
 * @template M, S
 * @typedef {object} CortexConfig
 * @property {MemoryInput<M>} memory - The initial state configuration
 * @property {SynapsesBuilder<M, S>} synapses - The synapses builder function
 */

/**
 * The Cortex class manages the state of the application.
 *
 * @template {object} MemoryType The shape of the application state
 * @template {object} SynapsesType The shape of the actions/methods
 */
export class Cortex {
  /**
   * Creates an instance of Cortex.
   * @param {CortexConfig<MemoryType, SynapsesType>} config
   */
  constructor({ memory, synapses }) {
    const liveMemory = { ...memory }
    this._persistenceMap = new Map()

    // Load in any existing values from local-storage
    for (const [key, value] of Object.entries(memory)) {
      if (value && typeof value === 'object' && value.__humn_persist) {
        const storageKey = value.config?.key || key
        this._persistenceMap.set(key, storageKey)

        try {
          const stored = localStorage.getItem(storageKey)
          if (stored !== null) {
            liveMemory[key] = JSON.parse(stored)
          } else {
            liveMemory[key] = value.initial
          }
        } catch (err) {
          if (isDev)
            console.warn(`Humn: Failed to load '${key}' from storage.`, err)
          liveMemory[key] = value.initial
        }
      }
    }

    /** @type {MemoryType} */
    this._memory = liveMemory
    this._listeners = new Map()

    /** @type {Getter<UnwrappedMemory<MemoryType>>} */
    const get = () => this._memory

    /** @type {Setter<UnwrappedMemory<MemoryType>>} */
    const set = (updater) => {
      let nextState
      let changedPaths = new Set()

      if (typeof updater === 'function') {
        const clone = structuredClone(this._memory)
        const proxy = this._createChangeTrackingProxy(clone, changedPaths)
        const result = updater(proxy)

        if (result && typeof result === 'object') {
          nextState = { ...this._memory, ...result }
          Object.keys(result).forEach((key) => changedPaths.add(key))
        } else {
          nextState = clone
        }
      } else {
        nextState = { ...this._memory, ...updater }
        changedPaths = new Set(Object.keys(updater))
      }

      this._memory = nextState

      // Persistence logic
      if (this._persistenceMap.size > 0) {
        this._persistenceMap.forEach((storageKey, stateKey) => {
          const isDirty = Array.from(changedPaths).some(
            (path) => path === stateKey || path.startsWith(stateKey + '.'),
          )

          if (isDirty) {
            try {
              const value = this._memory[stateKey]
              localStorage.setItem(storageKey, JSON.stringify(value))
            } catch (err) {
              if (isDev)
                console.error(`Humn: Failed to save '${stateKey}'.`, err)
            }
          }
        })
      }

      this._notifyRelevantListeners(changedPaths)
    }

    /** @type {SynapsesType} */
    this.synapses = synapses(set, get)
  }

  // ... (Rest of your methods like _createChangeTrackingProxy, etc.)

  /**
   * Creates a Proxy that tracks which properties are being mutated.
   * Includes a GET trap to recursively proxy nested objects for deep mutation tracking.
   *
   * WHY: We need to know exactly which paths were changed so we can notify ONLY
   * the components that care about those specific paths. If we just knew "something changed",
   * we'd have to re-render the whole app (like Redux) or rely on manual optimization.
   */
  _createChangeTrackingProxy(obj, changedPaths, path = '') {
    return new Proxy(obj, {
      get: (target, prop) => {
        if (typeof prop === 'symbol' || prop === '__proto__')
          return target[prop]

        const value = target[prop]
        const fullPath = path ? `${path}.${prop}` : prop

        // Recursively proxy nested objects so we can trap their sets too
        if (typeof value === 'object' && value !== null) {
          return this._createChangeTrackingProxy(value, changedPaths, fullPath)
        }
        return value
      },
      set: (target, prop, value) => {
        if (typeof prop === 'symbol' || prop === '__proto__') {
          target[prop] = value
          return true
        }

        const fullPath = path ? `${path}.${prop}` : prop
        changedPaths.add(fullPath)

        target[prop] = value
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
   *
   * WHY: This is the other half of the magic. By tracking what a component READS
   * during its render, we build a precise dependency graph. If a component reads
   * `state.user.name`, it will only re-render when `state.user.name` changes,
   * not when `state.count` changes.
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
   * @returns {UnwrappedMemory<MemoryType>}
   */
  get memory() {
    const currentObserver = getObserver()

    if (!currentObserver) return this._memory

    if (!this._listeners.has(currentObserver))
      this._listeners.set(currentObserver, new Set())

    const accessedPaths = this._listeners.get(currentObserver)

    return this._createAccessTrackingProxy(this._memory, accessedPaths)
  }
}
