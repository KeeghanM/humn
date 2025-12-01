/**
 * @file This module manages the current observer.
 * @module observer
 */

let currentObserver = null;

/**
 * Gets the current observer.
 * @returns {function | null} The current observer.
 */
export const getObserver = () => currentObserver;

/**
 * Sets the current observer.
 * @param {function | null} obs - The observer to set.
 */
export const setObserver = (obs) => {
  currentObserver = obs;
};
