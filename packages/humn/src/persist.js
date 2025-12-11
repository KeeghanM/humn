/**
 * Represents a value wrapped by the persist() function.
 * @template T
 * @typedef {object} Persisted
 * @property {T} initial
 * @property {boolean} __humn_persist
 * @property {PersistConfig} [config]
 */

/**
 * @typedef {object} PersistConfig
 * @property {string} key
 */

/**
 * Marks a section of the state for persistence in localStorage.
 * @template T
 * @param {T} initial
 * @param {PersistConfig} [config]
 * @returns {Persisted<T>}
 */
export const persist = (initial, config = {}) => ({
  __humn_persist: true,
  initial,
  config,
})
