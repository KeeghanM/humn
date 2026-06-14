import {
  clearObserverDependencies,
  getInstance,
  getObserver,
  setInstance,
  setObserver,
} from '../observer.js'

export function invokeHookSafely(fn, errorMessage) {
  try {
    fn()
  } catch (error) {
    console.error(errorMessage, error)
  }
}

export function renderComponent(vNode, observer) {
  const hooks = { mounts: [], cleanups: [] }
  const previousInstance = getInstance()
  const previousObserver = getObserver()

  clearObserverDependencies(observer)
  setObserver(observer)
  setInstance(hooks)

  try {
    const renderedVNode = vNode.tag(vNode.props)
    vNode.hooks = hooks
    return renderedVNode
  } finally {
    setInstance(previousInstance)
    setObserver(previousObserver)
  }
}

export function runUnmount(vNode) {
  if (!vNode) return

  clearObserverDependencies(vNode.instance?.update)
  if (vNode.hooks?.cleanups)
    vNode.hooks.cleanups.forEach((fn) =>
      invokeHookSafely(fn, 'Error in cleanup hook:'),
    )
  if (vNode.child) runUnmount(vNode.child)
  if (vNode.children) vNode.children.forEach(runUnmount)
}

export function scheduleMountHooks(hooks) {
  if (!hooks?.mounts?.length) return

  setTimeout(
    () =>
      hooks.mounts.forEach((fn) =>
        invokeHookSafely(fn, 'Error in mount hook:'),
      ),
    0,
  )
}

export function runComponentUpdateHooks({ newHooks, oldHooks }) {
  if (!oldHooks) return
  oldHooks.cleanups = newHooks.cleanups
}
