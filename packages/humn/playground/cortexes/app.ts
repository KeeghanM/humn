import { Cortex, persist } from 'humn'

type AppMemory = {
  user: {
    name: string | null
    email: string | null
    mobile: string | null
  }
  settings: {
    theme: 'light' | 'dark'
  }
  open: boolean
  messages: { text: string; sender: 'user' | 'server' }[]
  currentMessage: string
}

type AppSynapses = {
  setName: (name: string | null) => void
  setEmail: (email: string | null) => void
  setMobile: (mobile: string | null) => void
  toggleTheme: () => void
  setOpen: (open: boolean) => void
  addMessage: ({
    text,
    sender,
  }: {
    text: string
    sender: 'user' | 'server'
  }) => void
  setCurrentMessage: (currentMessage: string) => void
}

export const appCortex = new Cortex<AppMemory, AppSynapses>({
  memory: {
    user: persist({
      name: null,
      email: null,
      mobile: null,
    }),
    settings: persist({
      theme: 'light',
    }),
    open: persist(false),
    messages: persist([]),
    currentMessage: '',
  },
  synapses: (set, get) => ({
    setName: (name) => set((state) => (state.user.name = name)),
    setEmail: (email) => set((state) => (state.user.email = email)),
    setMobile: (mobile) => set((state) => (state.user.mobile = mobile)),
    toggleTheme: () => {
      const currentState = get()
      const newTheme =
        currentState.settings.theme === 'light' ? 'dark' : 'light'
      set((state) => {
        state.settings.theme = newTheme
      })
    },
    setOpen: (open) => set({ open }),
    addMessage: ({ text, sender }) =>
      set((state) => state.messages.push({ text, sender })),
    setCurrentMessage: (currentMessage) => set({ currentMessage }),
  }),
})
