/**
 * @file This file contains the diffing and patching algorithm for the virtual DOM,
 * including support for Keyed Diffing.
 * @module patch
 */
import { track } from './metrics.js'
import { setInstance } from './observer.js'

/**
 * Checks if a list of children contains keys.
 * @param {Array<import("./h.js").VNode>} children - The list of VNodes.
 * @returns {boolean} True if keys are present.
 */
export function hasKeys(children) {
  return children && children.some((c) => c && c.props && c.props.key != null)
}

/**
 * Creates a real DOM element from a virtual node.
 * @param {import("./h.js").VNode | string | number} vNode - The virtual node.
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

  track('elementsCreated')

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
 *
 * WHY: We check against the LIVE DOM value for inputs (value/checked) to prevent
 * the "cursor jumping" bug. If we just blindly set the attribute, the browser
 * might reset the cursor position to the end of the input.
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
      track('patches')
      continue
    }

    // We check against the LIVE DOM value to prevent cursor jumping
    if (key === 'value' || key === 'checked') {
      if (el[key] !== newValue) {
        el[key] = newValue
        track('patches')
      }
      continue
    }

    // If prop hasn't changed, skip
    if (oldValue === newValue) continue

    track('patches')

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
 * @param {Array<import("./h.js").VNode>} newChildren - The new list of children.
 * @param {Array<import("./h.js").VNode>} oldChildren - The old list of children.
 *
 * WHY: This is the most complex part of the VDOM. We need to efficiently update
 * a list of items. Without keys, we just update index-by-index, which is fast
 * but causes issues if items are reordered (state gets mixed up).
 * With keys, we can track items as they move around, preserving their state
 * and minimizing DOM operations.
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

  reconcileKeyedChildren(parent, newChildren, oldChildren)
}

/**
 * Handles the complex logic of reconciling keyed children.
 *
 * WHY: When keys are present, we can't just iterate by index. We need to map
 * existing children by their key so we can find them even if they've moved.
 * This allows us to re-use DOM nodes (preserving focus/state) instead of
 * destroying and re-creating them.
 */
function reconcileKeyedChildren(parent, newChildren, oldChildren) {
  // Map existing children by Key for O(1) lookup
  const keyed = {}
  oldChildren.forEach((child, i) => {
    const key = (child.props && child.props.key) != null ? child.props.key : i
    keyed[key] = { vNode: child, index: i }
  })

  newChildren.forEach((newChild, i) => {
    const key =
      (newChild.props && newChild.props.key) != null ? newChild.props.key : i
    const existingChildMatch = keyed[key]

    if (existingChildMatch) {
      // A. MATCH FOUND - The item existed before
      const oldVNode = existingChildMatch.vNode

      // Update the node's content recursively
      patch(parent, newChild, oldVNode, i)

      // If the DOM node isn't in the right spot, move it.
      // We use oldVNode.el because patch transfers the ref, but just to be safe:
      const el = newChild.el || oldVNode.el

      // Get the node currently at this index in the real DOM
      const domChildAtIndex = parent.childNodes[i]

      // If the element exists but is in the wrong place, move it
      if (el && domChildAtIndex !== el) {
        parent.insertBefore(el, domChildAtIndex)
        track('patches')
      }

      // Remove from map so we know it was re-used
      delete keyed[key]
    } else {
      // B. NO MATCH - This is a new item
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
      runUnmount(vNode) // Clean up hooks
      parent.removeChild(vNode.el)
      track('elementsRemoved')
    }
  })
}

/**
 * Executes a Functional Component, tracks hooks, and returns the VNode.
 * @param {import("./h.js").VNode} vNode - The component vNode.
 * @returns {import("./h.js").VNode} The rendered child vNode.
 */
function renderComponent(vNode) {
  track('componentsRendered')

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
 * @param {import("./h.js").VNode} vNode - The vNode to unmount.
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
 * @param {import("./h.js").VNode | string | number} newVNode - The new virtual node.
 * @param {import("./h.js").VNode | string | number} oldVNode - The old virtual node.
 * @param {number} [index=0] - The index of the child node (used for simple diffing).
 */
export function patch(parent, newVNode, oldVNode, index = 0) {
  track('diffs')

  // Case 1: Removal - The new node is null/undefined, so we remove the old one.
  if (newVNode === undefined || newVNode === null) {
    const el = oldVNode.el || parent.childNodes[index]

    // Recursive Cleanup
    runUnmount(oldVNode)

    if (el) {
      parent.removeChild(el)
      track('elementsRemoved')
    }
    return
  }

  // Case 2: Component - If it's a function, we delegate to the component logic.
  if (typeof newVNode.tag === 'function') {
    const isNew = !oldVNode

    const childVNode = renderComponent(newVNode)
    newVNode.child = childVNode

    const oldChild = oldVNode ? oldVNode.child : undefined
    patch(parent, childVNode, oldChild, index)

    newVNode.el = childVNode.el

    // Run mount hooks on the next tick
    if (isNew && newVNode.hooks && newVNode.hooks.mounts.length > 0) {
      setTimeout(() => {
        newVNode.hooks.mounts.forEach((fn) => fn())
      }, 0)
    }
    // TODO: Handle updates (running old cleanups if necessary) for Phase 2
    return
  }

  // Case 3: Creation - No old node exists, so we create a new one.
  if (oldVNode === undefined || oldVNode === null) {
    parent.appendChild(createElement(newVNode))
    return
  }

  // Case 4: Replacement - The node type changed (e.g. div -> span), so we replace it entirely.
  if (
    typeof newVNode !== typeof oldVNode ||
    (typeof newVNode !== 'string' && newVNode.tag !== oldVNode.tag)
  ) {
    const el = oldVNode.el || parent.childNodes[index]
    if (el) {
      parent.replaceChild(createElement(newVNode), el)
      track('patches')
    }
    return
  }

  // Case 5: Text Update - It's a text node, so we just update the text content.
  if (typeof newVNode === 'string' || typeof newVNode === 'number') {
    if (newVNode !== oldVNode) {
      const el = parent.childNodes[index]
      if (el) {
        el.nodeValue = String(newVNode)
        track('patches')
      } else {
        // Self healing: if text node missing, append it
        parent.appendChild(document.createTextNode(String(newVNode)))
      }
    }
    return
  }

  // Case 6: Update - Same tag, so we update props and recurse into children.
  const el = oldVNode.el || parent.childNodes[index]

  if (!el) return

  // Transfer DOM reference to the new VNode
  newVNode.el = el

  patchProps(el, newVNode.props, oldVNode.props)

  reconcileChildren(el, newVNode.children, oldVNode.children)
}
