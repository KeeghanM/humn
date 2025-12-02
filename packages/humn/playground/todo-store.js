import { Cortex, persist } from '../src/index.js'

export const todoStore = new Cortex({
  memory: {
    items: persist([
      { id: 1, text: 'Create Humn Library', done: true },
      { id: 2, text: 'Write first app', done: false },
    ]),
    inputValue: '',
    errorMessage: '',
    isLoading: false,
  },

  synapses: (set) => ({
    updateInput: (val) => set({ inputValue: val }),

    addTodo: () =>
      set((state) => {
        state.errorMessage = ''
        if (state.inputValue.length < 5) {
          state.errorMessage = 'Task title too short'
          return
        }
        state.items.push({
          id: Date.now(),
          text: state.inputValue,
          done: false,
        })
        state.inputValue = ''
      }),

    toggle: (id) =>
      set((state) => {
        const item = state.items.find((i) => i.id === id)
        if (item) item.done = !item.done
      }),

    fetchRandom: async () => {
      set({ isLoading: true, errorMessage: '' })

      try {
        const res = await fetch('https://dummyjson.com/todos/random')
        if (!res.ok) throw new Error('Network error')
        const data = await res.json()

        set((state) => {
          state.items.push({
            id: Date.now(),
            text: data.todo,
            done: false,
          })
        })
      } catch {
        set({
          errorMessage: 'Failed to fetch task. Try again.',
        })
      } finally {
        set({ isLoading: false })
      }
    },
  }),
})
