/**
 * Creates a resource object for managing async data state.
 * @param {any} initialData The initial data value.
 * @returns {object} The resource state shape.
 */
export const resource = (initialData = null) => ({
  __humn_resource: true,
  data: initialData,
  status: 'idle',
  loading: false,
  error: null,
  updatedAt: null,
  requestId: 0,
})

/**
 * Creates a Cortex synapse that handles async data fetching with a resource.
 * @param {function} set The Cortex set function.
 * @param {function} get The Cortex get function.
 * @param {string} key The key in the Cortex memory where the resource lives.
 * @param {function} fetcher The async function to fetch data.
 * @returns {function} The synapse function.
 */
export const resourceSynapse = (set, get, key, fetcher) => {
  return async (params, options = {}) => {
    const current = get()[key]

    if (!current || !current.__humn_resource) {
      throw new Error(`resourceSynapse: key '${key}' is not a valid resource.`)
    }

    if (!options.force && current.status === 'loading') return current
    if (!options.force && current.status === 'success') return current

    const requestId = current.requestId + 1

    set((state) => {
      state[key].status = 'loading'
      state[key].loading = true
      state[key].error = null
      state[key].requestId = requestId
    })

    try {
      const data = await fetcher(params, get)

      if (get()[key].requestId !== requestId) return get()[key]

      set((state) => {
        state[key].data = data
        state[key].status = 'success'
        state[key].loading = false
        state[key].error = null
        state[key].updatedAt = Date.now()
      })

      return get()[key]
    } catch (error) {
      if (get()[key].requestId !== requestId) return get()[key]

      set((state) => {
        state[key].status = 'error'
        state[key].loading = false
        state[key].error = error
      })

      return get()[key]
    }
  }
}
