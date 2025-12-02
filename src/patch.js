/**
 * @file This file contains the diffing and patching algorithm for the virtual DOM,
 * including support for Keyed Diffing.
 * @module patch
 */
import { setInstance } from './observer.js'

/**
 * Checks if a list of children contains keys.
 * @param {Array<import("./h").VNode>} children - The list of VNodes.
 * @returns {boolean} True if keys are present.
 */
export function hasKeys(children) {
  return children && children.some((c) => c && c.props && c.props.key != null)
}

/**
 * Creates a real DOM element from a virtual node.
 * @param {import("./h").VNode | string | number} vNode - The virtual node.
 * @returns {Text | HTMLElement} The created DOM element.
 */
function createElement(vNode) {
  if (typeof vNode === 'string' || typeof vNode === 'number') {
    return document.createTextNode(String(vNode))
  }

  if (typeof vNode.tag === 'function') {
    const childVNode = renderComponent(vNode)
    vNode.child = childVNode

    // Recursively create the DOM for the child
    const el = createElement(childVNode)
    vNode.el = el

    // Queue Mount Hooks
    if (vNode.hooks && vNode.hooks.mounts.length > 0) {
      setTimeout(() => vNode.hooks.mounts.forEach((fn) => fn()), 0)
    }
    return el
  }

  const el = document.createElement(vNode.tag)
  vNode.el = el
  patchProps(el, vNode.props)

  vNode.children.forEach((child) => {
    el.appendChild(createElement(child))
  })

  return el
}

/**
 * Updates the properties (attributes/events) of a DOM element.
 * @param {HTMLElement} el - The DOM element to update.
 * @param {object} [newProps={}] - The new properties.
 * @param {object} [oldProps={}] - The old properties.
 */
function patchProps(el, newProps = {}, oldProps = {}) {
  if (!el) return

  const allProps = { ...oldProps, ...newProps }

  for (const key in allProps) {
    const oldValue = oldProps[key]
    const newValue = newProps[key]

    // Handle removed props
    if (newValue === undefined || newValue === null) {
      el.removeAttribute(key)
      continue
    }

    // We check against the LIVE DOM value to prevent cursor jumping
    if (key === 'value' || key === 'checked') {
      if (el[key] !== newValue) {
        el[key] = newValue
      }
      continue
    }

    // If prop hasn't changed, skip
    if (oldValue === newValue) continue

    // Handle Events
    if (key.startsWith('on')) {
      const eventName = key.slice(2).toLowerCase()
      if (oldValue) el.removeEventListener(eventName, oldValue)
      el.addEventListener(eventName, newValue)
    }
    // Handle the disabled attribute
    if (key === 'disabled') {
      el.disabled = newValue === true || newValue === 'true'
    }
    // Handle standard attributes
    else {
      el.setAttribute(key, newValue)
    }
  }
}

/**
 * Reconciles the children of a node, handling both simple lists and keyed reordering.
 * @param {HTMLElement} parent - The parent DOM element.
 * @param {Array<import("./h").VNode>} newChildren - The new list of children.
 * @param {Array<import("./h").VNode>} oldChildren - The old list of children.
 */
function reconcileChildren(parent, newChildren, oldChildren) {
  const isKeyed = hasKeys(newChildren) || hasKeys(oldChildren)

  // If no keys are used, use the fast index-based simple loop.
  // This is faster for static lists or simple text replacements.
  if (!isKeyed) {
    const maxLen = Math.max(newChildren.length, oldChildren.length)
    for (let i = 0; i < maxLen; i++) {
      patch(parent, newChildren[i], oldChildren[i], i)
    }
    return
  }

  // Keyed Diffing
  // Map existing children by Key
  const keyed = {}
  oldChildren.forEach((child, i) => {
    const key = (child.props && child.props.key) != null ? child.props.key : i
    keyed[key] = { vNode: child, index: i }
  })

  newChildren.forEach((newChild, i) => {
    const key =
      (newChild.props && newChild.props.key) != null ? newChild.props.key : i
    const oldItem = keyed[key]

    if (oldItem) {
      // A. MATCH FOUND
      const oldVNode = oldItem.vNode

      // Update the node's content (Recursion)
      patch(parent, newChild, oldVNode, i)

      // If the DOM node isn't in the right spot, move it.
      // We use oldVNode.el because patch transfers the ref, but just to be safe:
      const el = newChild.el || oldVNode.el

      // Get the node currently at this index in the real DOM
      const domChildAtIndex = parent.childNodes[i]

      // If the element exists but is in the wrong place, move it
      if (el && domChildAtIndex !== el) {
        parent.insertBefore(el, domChildAtIndex)
      }

      // Remove from map so we know it was re-used
      delete keyed[key]
    } else {
      // B. NO MATCH (New Item)
      const newEl = createElement(newChild)
      const domChildAtIndex = parent.childNodes[i]

      if (domChildAtIndex) {
        parent.insertBefore(newEl, domChildAtIndex)
      } else {
        parent.appendChild(newEl)
      }
    }
  })

  // Remove any old keys that weren't used in the new list
  Object.values(keyed).forEach(({ vNode }) => {
    if (vNode.el && vNode.el.parentNode === parent) {
      parent.removeChild(vNode.el)
    }
  })
}

/**
 * Executes a Functional Component, tracks hooks, and returns the VNode.
 * @param {import("./h").VNode} vNode - The component vNode.
 * @returns {import("./h").VNode} The rendered child vNode.
 */
function renderComponent(vNode) {
  // 1. Prepare Hook Container
  const hooks = {
    mounts: [],
    cleanups: [],
  }

  // 2. Set Global Scope
  setInstance(hooks)

  // 3. Run the User's Component Function
  // We pass props as the first argument
  const renderedVNode = vNode.tag(vNode.props)

  // 4. Clear Global Scope
  setInstance(null)

  // 5. Attach hooks to the VNode so we can run them later
  vNode.hooks = hooks

  return renderedVNode
}

/**
 * Helper to recursively run cleanup hooks when a tree is removed.
 * @param {import("./h").VNode} vNode - The vNode to unmount.
 */
function runUnmount(vNode) {
  if (!vNode) return

  // 1. Run hooks for this node
  if (vNode.hooks && vNode.hooks.cleanups) {
    vNode.hooks.cleanups.forEach((fn) => fn())
  }

  // 2. Recurse into child (if component)
  if (vNode.child) {
    runUnmount(vNode.child)
  }

  // 3. Recurse into children (if element)
  if (vNode.children) {
    vNode.children.forEach(runUnmount)
  }
}

/**
 * The main diffing function. Compares V-DOM trees and updates the real DOM.
 * @param {HTMLElement} parent - The parent DOM element.
 * @param {import("./h").VNode | string | number} newVNode - The new virtual node.
 * @param {import("./h").VNode | string | number} oldVNode - The old virtual node.
 * @param {number} [index=0] - The index of the child node (used for simple diffing).
 */
export function patch(parent, newVNode, oldVNode, index = 0) {
  // --- HANDLE UNMOUNTING (Cleanup Hooks) ---
  if (newVNode === undefined || newVNode === null) {
    const el = oldVNode.el || parent.childNodes[index]

    // Recursive Cleanup
    runUnmount(oldVNode)

    if (el) parent.removeChild(el)
    return
  }

  // --- HANDLE COMPONENT (Functional VNode) ---
  if (typeof newVNode.tag === 'function') {
    const isNew = !oldVNode

    // 1. Render the component function
    const childVNode = renderComponent(newVNode)

    // 2. Store the result in the vNode ("unwrap" it)
    newVNode.child = childVNode

    // 3. Recursively patch the result
    const oldChild = oldVNode ? oldVNode.child : undefined
    patch(parent, childVNode, oldChild, index)

    // 4. Ensure VNode holds the DOM reference
    newVNode.el = childVNode.el

    // 5. Run Mount Hooks (Next Tick)
    if (isNew && newVNode.hooks && newVNode.hooks.mounts.length > 0) {
      setTimeout(() => {
        newVNode.hooks.mounts.forEach((fn) => fn())
      }, 0)
    }
    // TODO: Handle updates (running old cleanups if necessary) for Phase 2
    return
  }

  // Start - No old node? Create new.
  if (oldVNode === undefined || oldVNode === null) {
    parent.appendChild(createElement(newVNode))
    return
  }

  // Removal - No new node? Remove old.
  if (newVNode === undefined || newVNode === null) {
    // Try to find the element on the VNode, or fallback to index
    const el = oldVNode.el || parent.childNodes[index]
    if (el) parent.removeChild(el)
    return
  }

  // Changed Type - (e.g. <div> becomes <span>) -> Replace whole node
  if (
    typeof newVNode !== typeof oldVNode ||
    (typeof newVNode !== 'string' && newVNode.tag !== oldVNode.tag)
  ) {
    const el = oldVNode.el || parent.childNodes[index]
    if (el) parent.replaceChild(createElement(newVNode), el)
    return
  }

  // Text Update
  if (typeof newVNode === 'string' || typeof newVNode === 'number') {
    if (newVNode !== oldVNode) {
      const el = parent.childNodes[index]
      if (el) {
        el.nodeValue = String(newVNode)
      } else {
        // Self healing: if text node missing, append it
        parent.appendChild(document.createTextNode(String(newVNode)))
      }
    }
    return
  }

  // Same Tag - Update Props & Children
  const el = oldVNode.el || parent.childNodes[index]

  if (!el) return

  // Transfer DOM reference to the new VNode
  newVNode.el = el

  patchProps(el, newVNode.props, oldVNode.props)

  reconcileChildren(el, newVNode.children, oldVNode.children)
}
