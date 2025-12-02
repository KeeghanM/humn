/**
 * @typedef {object} HumnPersist
 * @property {boolean} __humn_persist
 * @property {any} initial
 * @property {PersistConfig} config
 */

/**
 * @typedef {object} PersistConfig
 * @property {string} key
 */

/**
 * Marks a section of the state for persistence in localStorage.
 *
 * @param {any} initial - The initial value of the state.
 * @param {PersistConfig} config - The configuration for persistence.
 * @returns {HumnPersist}
 */
export const persist = (initial, config = {}) => ({
  __humn_persist: true,
  initial,
  config,
})
