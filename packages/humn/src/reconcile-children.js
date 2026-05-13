import { createElement, getNamespace } from './create-element.js'
import { track } from './metrics.js'

export function hasKeys(children) {
  return children && children.some((child) => child?.props?.key != null)
}

export function reconcileChildren({
  oldChildren,
  newChildren,
  parent,
  patchNode,
  runUnmount,
}) {
  // Unkeyed children are cheap to patch by index; keyed children preserve DOM
  // identity across reorders so state and focus do not move to the wrong item.
  const isKeyed = hasKeys(newChildren) || hasKeys(oldChildren)
  if (isKeyed) {
    reconcileKeyedChildren({
      oldChildren,
      newChildren,
      parent,
      patchNode,
      runUnmount,
    })
    return
  }

  reconcileUnkeyedChildren({ oldChildren, newChildren, parent, patchNode })
}

function reconcileUnkeyedChildren({
  oldChildren,
  newChildren,
  parent,
  patchNode,
}) {
  const maxLength = Math.max(newChildren.length, oldChildren.length)
  for (let index = 0; index < maxLength; index++) {
    patchNode(parent, newChildren[index], oldChildren[index], index)
  }
}

function reconcileKeyedChildren({
  oldChildren,
  newChildren,
  parent,
  patchNode,
  runUnmount,
}) {
  const keyedChildren = getKeyedChildren(oldChildren)

  newChildren.forEach((newChild, index) => {
    const key = getChildKey(newChild, index)
    const existingChild = keyedChildren[key]

    if (existingChild) {
      patchExistingKeyedChild({
        existingChild,
        index,
        newChild,
        parent,
        patchNode,
      })
      delete keyedChildren[key]
      return
    }

    insertNewKeyedChild({ index, newChild, parent })
  })

  removeStaleKeyedChildren({ keyedChildren, parent, runUnmount })
}

function getKeyedChildren(children) {
  const keyedChildren = {}

  children.forEach((child, index) => {
    const key = getChildKey(child, index)
    keyedChildren[key] = { index, vNode: child }
  })

  return keyedChildren
}

function getChildKey(child, fallback) {
  return child?.props?.key != null ? child.props.key : fallback
}

function patchExistingKeyedChild({
  existingChild,
  index,
  newChild,
  parent,
  patchNode,
}) {
  const oldVNode = existingChild.vNode
  patchNode(parent, newChild, oldVNode, index)

  const element = newChild.el || oldVNode.el
  const domChildAtIndex = parent.childNodes[index]
  if (element && domChildAtIndex !== element) {
    parent.insertBefore(element, domChildAtIndex)
    track('patches')
  }
}

function insertNewKeyedChild({ index, newChild, parent }) {
  const newElement = createElement(newChild, getNamespace(parent))
  const domChildAtIndex = parent.childNodes[index]

  if (domChildAtIndex) {
    parent.insertBefore(newElement, domChildAtIndex)
    return
  }

  parent.appendChild(newElement)
}

function removeStaleKeyedChildren({ keyedChildren, parent, runUnmount }) {
  Object.values(keyedChildren).forEach(({ vNode }) => {
    if (!vNode.el || vNode.el.parentNode !== parent) return

    runUnmount(vNode)
    parent.removeChild(vNode.el)
    track('elementsRemoved')
  })
}
