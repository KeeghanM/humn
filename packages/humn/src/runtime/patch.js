import {
  renderComponent,
  runComponentUpdateHooks,
  runUnmount,
  scheduleMountHooks,
} from './component-lifecycle.js'
import { createElement, getNamespace } from './create-element.js'
import { patchProps } from './patch-props.js'
import { hasKeys, reconcileChildren } from './reconcile-children.js'

export { hasKeys }

export function createComponentInstance() {
  const instance = {
    index: 0,
    parent: null,
    update: null,
    vNode: null,
  }

  instance.update = () => {
    if (!instance.vNode || !instance.parent) return

    const nextVNode = {
      children: instance.vNode.children,
      instance,
      props: instance.vNode.props,
      tag: instance.vNode.tag,
    }

    mountComponent({
      index: instance.index,
      newVNode: nextVNode,
      oldVNode: instance.vNode,
      parent: instance.parent,
    })
  }

  return instance
}

export function mountComponent({ index, newVNode, oldVNode, parent }) {
  const previousVNode = oldVNode?.instance?.vNode || oldVNode
  const instance = previousVNode?.instance || createComponentInstance()
  const isNew = !previousVNode

  newVNode.instance = instance
  instance.index = index
  instance.parent = parent

  const childVNode = renderComponent(newVNode, instance.update)
  newVNode.child = childVNode

  patch(parent, childVNode, previousVNode?.child, index)
  newVNode.el = childVNode.el

  if (isNew) scheduleMountHooks(newVNode.hooks)
  if (!isNew)
    runComponentUpdateHooks({
      newHooks: newVNode.hooks,
      oldHooks: previousVNode.hooks,
    })

  if (!isNew) newVNode.hooks = previousVNode.hooks

  instance.vNode = newVNode
}

export function patch(parent, newVNode, oldVNode, index = 0) {
  // Removal must clean up recursively so component hooks cannot leak.
  if (newVNode === undefined || newVNode === null) {
    const el = oldVNode.el || parent.childNodes[index]
    runUnmount(oldVNode)
    if (el) parent.removeChild(el)
    return
  }

  if (typeof newVNode.tag === 'function') {
    mountComponent({ index, newVNode, oldVNode, parent })
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
    if (el)
      parent.replaceChild(createElement(newVNode, getNamespace(parent)), el)
    return
  }

  if (typeof newVNode === 'string' || typeof newVNode === 'number') {
    if (newVNode !== oldVNode) {
      const el = parent.childNodes[index]
      if (el) {
        el.nodeValue = String(newVNode)
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
