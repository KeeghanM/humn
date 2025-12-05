import { Cortex, persist } from 'humn'

export const appCortex = new Cortex({
  memory: {
    user: persist({
      name: null,
      email: undefined,
      mobile: undefined,
    }),
    settings: persist({
      theme: 'light',
    }),
    open: persist(false),
    messages: persist([]),
    currentMessage: '',
  },
  synapses: (set) => ({
    setName: (name) => set((state) => (state.user.name = name)),
    setEmail: (email) => set((state) => (state.user.email = email)),
    setMobile: (mobile) => set((state) => (state.user.mobile = mobile)),
    toggleTheme: () =>
      set((state) => {
        state.settings.theme =
          state.settings.theme === 'light' ? 'dark' : 'light'
      }),
    setOpen: (open) => set({ open }),
    addMessage: ({ text, sender }) =>
      set((state) => state.messages.push({ text, sender })),
    setCurrentMessage: (currentMessage) => set({ currentMessage }),
  }),
})
