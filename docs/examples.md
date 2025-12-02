# Real-World Examples

This guide shows complete, production-ready patterns for common application features.

## Table of Contents

- [Real-World Examples](#real-world-examples)
  - [Table of Contents](#table-of-contents)
  - [Authentication Flow](#authentication-flow)
    - [Store](#store)
    - [Components](#components)
  - [Form Handling](#form-handling)
  - [Data Fetching with Pagination](#data-fetching-with-pagination)
  - [Optimistic UI Updates](#optimistic-ui-updates)
  - [Real-time Updates](#real-time-updates)
  - [Modal Management](#modal-management)
  - [Routing](#routing)
  - [Next Steps](#next-steps)

---

## Authentication Flow

A complete authentication system with login, logout, and protected routes.

### Store

```javascript
// stores/auth-store.js
import { Cortex } from 'humn'

export const authStore = new Cortex({
  memory: {
    user: null,
    token: localStorage.getItem('token'),
    isLoading: false,
    error: null,
  },

  synapses: (set, get) => ({
    login: async (email, password) => {
      set({ isLoading: true, error: null })

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })

        if (!res.ok) throw new Error('Invalid credentials')

        const { user, token } = await res.json()
        localStorage.setItem('token', token)
        set({ user, token, isLoading: false })
      } catch (err) {
        set({ error: err.message, isLoading: false })
      }
    },

    logout: () => {
      localStorage.removeItem('token')
      set({ user: null, token: null })
    },

    checkAuth: async () => {
      const { token } = get()
      if (!token) return

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) throw new Error('Session expired')

        const user = await res.json()
        set({ user })
      } catch {
        localStorage.removeItem('token')
        set({ user: null, token: null })
      }
    },
  }),
})
```

### Components

```javascript
// components/LoginForm.js
import { h } from 'humn'

import { authStore } from '../stores/auth-store'

export const LoginForm = () => {
  const { isLoading, error } = authStore.memory
  const { login } = authStore.synapses

  let email = ''
  let password = ''

  const handleSubmit = (e) => {
    e.preventDefault()
    login(email, password)
  }

  return h('form', { onsubmit: handleSubmit }, [
    error ? h('div', { class: 'error' }, error) : null,

    h('input', {
      type: 'email',
      placeholder: 'Email',
      oninput: (e) => (email = e.target.value),
      disabled: isLoading,
    }),

    h('input', {
      type: 'password',
      placeholder: 'Password',
      oninput: (e) => (password = e.target.value),
      disabled: isLoading,
    }),

    h(
      'button',
      {
        type: 'submit',
        disabled: isLoading,
      },
      isLoading ? 'Logging in...' : 'Login',
    ),
  ])
}

// components/ProtectedRoute.js
export const ProtectedRoute = ({ component: Component }) => {
  const { user, token } = authStore.memory
  const { checkAuth } = authStore.synapses

  onMount(() => {
    if (token && !user) {
      checkAuth()
    }
  })

  if (!user) {
    return h(LoginForm)
  }

  return h(Component)
}
```

---

## Form Handling

Complex form with validation and submission.

```javascript
import { Cortex, h, onMount } from 'humn'

const formStore = new Cortex({
  memory: {
    values: {
      name: '',
      email: '',
      age: '',
    },
    errors: {},
    touched: {},
    isSubmitting: false,
  },

  synapses: (set, get) => ({
    setValue: (field, value) => {
      set((state) => {
        state.values[field] = value
      })
    },

    setTouched: (field) => {
      set((state) => {
        state.touched[field] = true
      })
    },

    validate: () => {
      const { values } = get()
      const errors = {}

      if (!values.name) errors.name = 'Name is required'
      if (!values.email) errors.email = 'Email is required'
      else if (!/\S+@\S+\.\S+/.test(values.email)) {
        errors.email = 'Email is invalid'
      }
      if (!values.age) errors.age = 'Age is required'
      else if (values.age < 18) errors.age = 'Must be 18 or older'

      set({ errors })
      return Object.keys(errors).length === 0
    },

    submit: async () => {
      const { validate } = get().synapses

      if (!validate()) return

      set({ isSubmitting: true })

      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(get().values),
        })

        if (!res.ok) throw new Error('Submission failed')

        alert('Form submitted successfully!')
        set({
          values: { name: '', email: '', age: '' },
          touched: {},
          isSubmitting: false,
        })
      } catch (err) {
        alert(err.message)
        set({ isSubmitting: false })
      }
    },
  }),
})

export const UserForm = () => {
  const { values, errors, touched, isSubmitting } = formStore.memory
  const { setValue, setTouched, validate, submit } = formStore.synapses

  const handleBlur = (field) => {
    setTouched(field)
    validate()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    submit()
  }

  return h('form', { onsubmit: handleSubmit }, [
    // Name Field
    h('div', { class: 'field' }, [
      h('label', {}, 'Name'),
      h('input', {
        value: values.name,
        oninput: (e) => setValue('name', e.target.value),
        onblur: () => handleBlur('name'),
      }),
      touched.name && errors.name
        ? h('span', { class: 'error' }, errors.name)
        : null,
    ]),

    // Email Field
    h('div', { class: 'field' }, [
      h('label', {}, 'Email'),
      h('input', {
        type: 'email',
        value: values.email,
        oninput: (e) => setValue('email', e.target.value),
        onblur: () => handleBlur('email'),
      }),
      touched.email && errors.email
        ? h('span', { class: 'error' }, errors.email)
        : null,
    ]),

    // Age Field
    h('div', { class: 'field' }, [
      h('label', {}, 'Age'),
      h('input', {
        type: 'number',
        value: values.age,
        oninput: (e) => setValue('age', parseInt(e.target.value) || ''),
        onblur: () => handleBlur('age'),
      }),
      touched.age && errors.age
        ? h('span', { class: 'error' }, errors.age)
        : null,
    ]),

    h(
      'button',
      {
        type: 'submit',
        disabled: isSubmitting,
      },
      isSubmitting ? 'Submitting...' : 'Submit',
    ),
  ])
}
```

---

## Data Fetching with Pagination

```javascript
import { Cortex, h } from 'humn'

const postsStore = new Cortex({
  memory: {
    posts: [],
    page: 1,
    totalPages: 1,
    isLoading: false,
    error: null,
  },

  synapses: (set, get) => ({
    fetchPosts: async (page = 1) => {
      set({ isLoading: true, error: null })

      try {
        const res = await fetch(`/api/posts?page=${page}&limit=10`)
        const data = await res.json()

        set({
          posts: data.posts,
          page: data.page,
          totalPages: data.totalPages,
          isLoading: false,
        })
      } catch (err) {
        set({ error: err.message, isLoading: false })
      }
    },

    nextPage: () => {
      const { page, totalPages } = get()
      if (page < totalPages) {
        get().synapses.fetchPosts(page + 1)
      }
    },

    prevPage: () => {
      const { page } = get()
      if (page > 1) {
        get().synapses.fetchPosts(page - 1)
      }
    },
  }),
})

export const PostsList = () => {
  const { posts, page, totalPages, isLoading, error } = postsStore.memory
  const { fetchPosts, nextPage, prevPage } = postsStore.synapses

  onMount(() => {
    fetchPosts(1)
  })

  if (isLoading && posts.length === 0) {
    return h('div', {}, 'Loading posts...')
  }

  if (error) {
    return h('div', { class: 'error' }, error)
  }

  return h('div', {}, [
    h(
      'ul',
      {},
      posts.map((post) =>
        h('li', { key: post.id }, [
          h('h3', {}, post.title),
          h('p', {}, post.excerpt),
        ]),
      ),
    ),

    h('div', { class: 'pagination' }, [
      h(
        'button',
        {
          onclick: prevPage,
          disabled: page === 1,
        },
        'Previous',
      ),

      h('span', {}, `Page ${page} of ${totalPages}`),

      h(
        'button',
        {
          onclick: nextPage,
          disabled: page === totalPages,
        },
        'Next',
      ),
    ]),
  ])
}
```

---

## Optimistic UI Updates

Update the UI immediately, rollback on error.

```javascript
const todosStore = new Cortex({
  memory: {
    todos: [],
    error: null,
  },

  synapses: (set, get) => ({
    toggleTodo: async (id) => {
      // 1. Get current state
      const { todos } = get()
      const todo = todos.find((t) => t.id === id)
      const previousDone = todo.done

      // 2. Optimistic update (instant UI feedback)
      set((state) => {
        const item = state.todos.find((t) => t.id === id)
        item.done = !item.done
      })

      try {
        // 3. Send request
        const res = await fetch(`/api/todos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ done: !previousDone }),
        })

        if (!res.ok) throw new Error('Update failed')
      } catch (err) {
        // 4. Rollback on error
        set((state) => {
          const item = state.todos.find((t) => t.id === id)
          item.done = previousDone
          state.error = 'Failed to update todo'
        })
      }
    },
  }),
})
```

---

## Real-time Updates

WebSocket integration with automatic reconnection.

```javascript
import { Cortex, onCleanup, onMount } from 'humn'

const chatStore = new Cortex({
  memory: {
    messages: [],
    connected: false,
    error: null,
  },

  synapses: (set, get) => ({
    connect: () => {
      const ws = new WebSocket('wss://api.example.com/chat')

      ws.onopen = () => {
        set({ connected: true, error: null })
      }

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)
        set((state) => {
          state.messages.push(message)
        })
      }

      ws.onerror = () => {
        set({ error: 'Connection error' })
      }

      ws.onclose = () => {
        set({ connected: false })
        // Reconnect after 3 seconds
        setTimeout(() => get().synapses.connect(), 3000)
      }

      return ws
    },

    sendMessage: (ws, text) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'message', text }))
      }
    },
  }),
})

export const Chat = () => {
  let ws = null

  onMount(() => {
    ws = chatStore.synapses.connect()

    onCleanup(() => {
      if (ws) ws.close()
    })
  })

  const { messages, connected } = chatStore.memory
  const { sendMessage } = chatStore.synapses

  let inputText = ''

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(ws, inputText)
      inputText = ''
    }
  }

  return h('div', {}, [
    h(
      'div',
      { class: connected ? 'online' : 'offline' },
      connected ? 'Connected' : 'Connecting...',
    ),

    h(
      'div',
      { class: 'messages' },
      messages.map((msg) => h('div', { key: msg.id }, msg.text)),
    ),

    h('input', {
      value: inputText,
      oninput: (e) => (inputText = e.target.value),
      onkeydown: (e) => e.key === 'Enter' && handleSend(),
    }),

    h('button', { onclick: handleSend }, 'Send'),
  ])
}
```

---

## Modal Management

Centralized modal system with multiple modal types.

```javascript
const modalStore = new Cortex({
  memory: {
    activeModal: null,
    modalProps: {},
  },

  synapses: (set) => ({
    openModal: (type, props = {}) => {
      set({ activeModal: type, modalProps: props })
    },

    closeModal: () => {
      set({ activeModal: null, modalProps: {} })
    },
  }),
})

const ConfirmModal = ({ message, onConfirm }) => {
  const { closeModal } = modalStore.synapses

  const handleConfirm = () => {
    onConfirm()
    closeModal()
  }

  return h('div', { class: 'modal-backdrop' }, [
    h('div', { class: 'modal' }, [
      h('p', {}, message),
      h('button', { onclick: handleConfirm }, 'Confirm'),
      h('button', { onclick: closeModal }, 'Cancel'),
    ]),
  ])
}

const MODALS = {
  confirm: ConfirmModal,
  alert: AlertModal,
  // ... other modal types
}

export const ModalRoot = () => {
  const { activeModal, modalProps } = modalStore.memory

  if (!activeModal) return null

  const ModalComponent = MODALS[activeModal]
  return h(ModalComponent, modalProps)
}

// Usage
export const App = () => {
  const { openModal } = modalStore.synapses

  const handleDelete = () => {
    openModal('confirm', {
      message: 'Are you sure you want to delete?',
      onConfirm: () => console.log('Deleted!'),
    })
  }

  return h('div', {}, [
    h('button', { onclick: handleDelete }, 'Delete'),
    h(ModalRoot),
  ])
}
```

---

## Routing

Simple client-side routing system.

```javascript
const routerStore = new Cortex({
  memory: {
    currentPath: window.location.pathname,
  },

  synapses: (set) => ({
    navigate: (path) => {
      window.history.pushState({}, '', path)
      set({ currentPath: path })
    },

    init: () => {
      window.addEventListener('popstate', () => {
        set({ currentPath: window.location.pathname })
      })
    },
  }),
})

const routes = {
  '/': HomePage,
  '/about': AboutPage,
  '/users/:id': UserPage,
}

const matchRoute = (path) => {
  for (const [pattern, component] of Object.entries(routes)) {
    const regex = new RegExp('^' + pattern.replace(/:\w+/g, '([^/]+)') + '$')
    const match = path.match(regex)

    if (match) {
      const params = {}
      const keys = pattern.match(/:\w+/g) || []
      keys.forEach((key, i) => {
        params[key.slice(1)] = match[i + 1]
      })
      return { component, params }
    }
  }
  return { component: NotFoundPage, params: {} }
}

export const Router = () => {
  const { currentPath } = routerStore.memory

  onMount(() => {
    routerStore.synapses.init()
  })

  const { component: Component, params } = matchRoute(currentPath)
  return h(Component, params)
}

// Link component
export const Link = ({ to, children }) => {
  const { navigate } = routerStore.synapses

  const handleClick = (e) => {
    e.preventDefault()
    navigate(to)
  }

  return h('a', { href: to, onclick: handleClick }, children)
}
```

---

## Next Steps

- [Testing Guide](./testing.md) - Learn how to test these patterns
- [Performance Tips](./performance.md) - Optimise your application
- [API Reference](./api-reference.md) - Complete API documentation
