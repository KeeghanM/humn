import { track } from '../metrics.js'
import { setInstance } from '../observer.js'

export function invokeHookSafely(fn, errorMessage) {
  try {
    fn()
  } catch (error) {
    console.error(errorMessage, error)
  }
}

export function renderComponent(vNode) {
  track('componentsRendered')
  const hooks = { mounts: [], cleanups: [] }
  setInstance(hooks)

  const renderedVNode = vNode.tag(vNode.props)

  setInstance(null)
  vNode.hooks = hooks
  return renderedVNode
}

export function runUnmount(vNode) {
  if (!vNode) return

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
  if (!oldHooks?.cleanups?.length) return

  oldHooks.cleanups.forEach((fn) =>
    invokeHookSafely(fn, 'Error in cleanup hook:'),
  )
  scheduleMountHooks(newHooks)
}
