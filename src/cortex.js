import { getObserver } from "./observer.js";

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
 */
export class Cortex {
  /**
   * Creates an instance of Cortex.
   * @param {CortexParams} CortexParams - The parameters for the Cortex.
   */
  constructor({ memory, synapses }) {
    this._memory = memory;
    this._listeners = new Set();

    const get = () => this._memory;

    const set = (updater) => {
      let nextState;
      if (typeof updater === "function") {
        const clone = structuredClone(this._memory);
        const result = updater(clone);
        nextState = result || clone;
      } else {
        nextState = { ...this._memory, ...updater };
      }

      this._memory = nextState;
      this._listeners.forEach((render) => render());
    };

    this.synapses = synapses(set, get);
  }

  /**
   * Get the memory and register the current observer.
   * @returns {object} The current state
   */
  get memory() {
    const currentObserver = getObserver();
    if (currentObserver) this._listeners.add(currentObserver);
    return this._memory;
  }
}
