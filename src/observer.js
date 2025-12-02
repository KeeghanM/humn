/**
 * @file Observer module for tracking global state during rendering.
 * @module observer
 */

let currentObserver = null // For Cortex/State dependency
let currentInstance = null // For Lifecycle Hooks

/**
 * Gets the current observer (render function).
 * @returns {function|null}
 */
export const getObserver = () => currentObserver

/**
 * Sets the current observer.
 * @param {function|null} obs
 */
export const setObserver = (obs) => {
  currentObserver = obs
}

/**
 * Gets the current component instance (hook container).
 * @returns {object|null}
 */
export const getInstance = () => currentInstance

/**
 * Sets the current component instance.
 * @param {object|null} inst
 */
export const setInstance = (inst) => {
  currentInstance = inst
}
