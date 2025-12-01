/**
 * @file Lifecycle hooks for components.
 * @module lifecycle
 */
import { getInstance } from "./observer.js";

/**
 * Registers a callback to run after the component mounts.
 * @param {function} fn - The callback function.
 */
export function onMount(fn) {
  const instance = getInstance();
  if (instance) {
    instance.mounts.push(fn);
  }
}

/**
 * Registers a callback to run when the component unmounts.
 * @param {function} fn - The callback function.
 */
export function onCleanup(fn) {
  const instance = getInstance();
  if (instance) {
    instance.cleanups.push(fn);
  }
}
