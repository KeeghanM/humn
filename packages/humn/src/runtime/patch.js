import {
  renderComponent,
  runComponentUpdateHooks,
  runUnmount,
  scheduleMountHooks,
} from './component-lifecycle.js'
import { createElement, getNamespace } from './create-element.js'
import { track } from '../metrics.js'
import { patchProps } from './patch-props.js'
import { hasKeys, reconcileChildren } from './reconcile-children.js'

export { hasKeys }

export function patch(parent, newVNode, oldVNode, index = 0) {
  track('diffs')

  // Removal must clean up recursively so component hooks cannot leak.
  if (newVNode === undefined || newVNode === null) {
    const el = oldVNode.el || parent.childNodes[index]
    runUnmount(oldVNode)
    if (el) {
      parent.removeChild(el)
      track('elementsRemoved')
    }
    return
  }

  if (typeof newVNode.tag === 'function') {
    const isNew = !oldVNode
    const childVNode = renderComponent(newVNode)
    newVNode.child = childVNode
    const oldChild = oldVNode ? oldVNode.child : undefined
    patch(parent, childVNode, oldChild, index)
    newVNode.el = childVNode.el
    if (isNew) scheduleMountHooks(newVNode.hooks)
    if (!isNew)
      runComponentUpdateHooks({
        newHooks: newVNode.hooks,
        oldHooks: oldVNode.hooks,
      })
    return
  }

  if (oldVNode === undefined || oldVNode === null) {
    parent.appendChild(createElement(newVNode, getNamespace(parent)))
    return
  }

  // Different node types cannot be safely patched in place.
  if (
    typeof newVNode !== typeof oldVNode ||
    (typeof newVNode !== 'string' && newVNode.tag !== oldVNode.tag)
  ) {
    const el = oldVNode.el || parent.childNodes[index]
    if (el) {
      parent.replaceChild(createElement(newVNode, getNamespace(parent)), el)
      track('patches')
    }
    return
  }

  if (typeof newVNode === 'string' || typeof newVNode === 'number') {
    if (newVNode !== oldVNode) {
      const el = parent.childNodes[index]
      if (el) {
        el.nodeValue = String(newVNode)
        track('patches')
      } else parent.appendChild(document.createTextNode(String(newVNode)))
    }
    return
  }

  const el = oldVNode.el || parent.childNodes[index]
  if (!el) return
  newVNode.el = el
  patchProps(el, newVNode.props, oldVNode.props)
  reconcileChildren({
    oldChildren: oldVNode.children,
    newChildren: newVNode.children,
    parent: el,
    patchNode: patch,
    runUnmount,
  })
}
