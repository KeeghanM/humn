import { Cortex } from '../../index.js'

export function createRows(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    label: `Project task ${index + 1}`,
    score: index % 10,
    selected: false,
  }))
}

export function createLargeAppCortex({ rowCount = 1000 } = {}) {
  return new Cortex({
    memory: {
      activeId: 1,
      filter: '',
      rows: createRows(rowCount),
      sidebarOpen: true,
      stats: {
        notifications: 0,
        saves: 0,
      },
    },
    synapses: (set) => ({
      clearFilter: () => set({ filter: '' }),
      incrementNotifications: () =>
        set((state) => {
          state.stats.notifications += 1
        }),
      recordSave: () =>
        set((state) => {
          state.stats.saves += 1
        }),
      setActive: (id) => set({ activeId: id }),
      setFilter: (filter) => set({ filter }),
      toggleRow: (id) =>
        set((state) => {
          const row = state.rows.find((candidate) => candidate.id === id)
          if (row) row.selected = !row.selected
        }),
      updateScores: (step) =>
        set((state) => {
          state.rows.forEach((row, index) => {
            if (index % step === 0) row.score += 1
          })
        }),
    }),
  })
}
