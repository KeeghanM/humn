/**
 * @file This file contains the diffing and patching algorithm for the virtual DOM,
 * including support for Keyed Diffing.
 * @module patch
 */
import { track } from './metrics.js'
import { setInstance } from './observer.js'

const helperState = new WeakMap()
const HELPER_EVENTS = new Set(['onenter', 'onescape', 'onkeys', 'oncommit'])
const MODIFIER_FLAGS = new Set([
  'prevent',
  'stop',
  'once',
  'capture',
  'passive',
])

function invokeHookSafely(fn, errorMessage) {
  try {
    fn()
  } catch (error) {
    console.error(errorMessage, error)
  }
}

function getHelperRecord(element) {
  const existing = helperState.get(element)
  if (existing) return existing

  const record = {
    debounceTimers: new Map(),
    asyncPending: new Map(),
    composition: new Map(),
    commitLocks: new Map(),
  }
  helperState.set(element, record)
  return record
}

function normalizeKeyCombo(combo = '') {
  return combo
    .split('+')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .map((part) =>
      part === 'mod'
        ? navigator.platform.includes('Mac')
          ? 'meta'
          : 'ctrl'
        : part,
    )
    .sort()
    .join('+')
}

function shouldIgnoreKeyboardEvent(event, compositionState) {
  return event.isComposing || compositionState === true
}

function getNamespace(parent) {
  if (parent.namespaceURI === SVG_NS && parent.tagName !== 'foreignObject') {
    return SVG_NS
  }
  if (parent.namespaceURI === MATH_NS) {
    return MATH_NS
  }
  return null
}

export function hasKeys(children) {
  return children && children.some((c) => c && c.props && c.props.key != null)
}
const SVG_NS = 'http://www.w3.org/2000/svg'
const MATH_NS = 'http://www.w3.org/1998/Math/MathML'

function createElement(vNode, namespace) {
  if (typeof vNode === 'string' || typeof vNode === 'number')
    return document.createTextNode(String(vNode))
  if (typeof vNode.tag === 'function') {
    const childVNode = renderComponent(vNode)
    vNode.child = childVNode
    const el = createElement(childVNode, namespace)
    vNode.el = el
    if (vNode.hooks?.mounts.length > 0) {
      setTimeout(
        () =>
          vNode.hooks.mounts.forEach((fn) =>
            invokeHookSafely(fn, 'Error in mount hook:'),
          ),
        0,
      )
    }
    return el
  }

  track('elementsCreated')
  const tag = vNode.tag

  // A nested <svg> or <math> starts a fresh namespace regardless of its parent.
  if (tag === 'svg') namespace = SVG_NS
  else if (tag === 'math') namespace = MATH_NS

  // createElementNS is slower than createElement, so only use it when needed.
  const element = namespace
    ? document.createElementNS(namespace, tag)
    : document.createElement(tag)
  vNode.el = element
  patchProps(element, vNode.props)

  // Children of SVG foreignObject must return to the HTML namespace.
  const childNS = tag === 'foreignObject' ? null : namespace
  vNode.children.forEach((child) =>
    element.appendChild(createElement(child, childNS)),
  )
  return element
}

function parseEventKey(key) {
  const parts = key.split('|')
  const eventKey = parts[0]
  const modifiers = parts
    .slice(1)
    .filter((modifier) => MODIFIER_FLAGS.has(modifier))
  return { eventKey, modifiers }
}

function addManagedListener(
  element,
  eventName,
  listener,
  options,
  oldListener,
) {
  if (oldListener) element.removeEventListener(eventName, oldListener, options)
  element.addEventListener(eventName, listener, options)
}

function patchProps(element, newProps = {}, oldProps = {}) {
  if (!element) return
  const allProps = { ...oldProps, ...newProps }
  const record = getHelperRecord(element)

  for (const key in allProps) {
    const oldValue = oldProps[key]
    const newValue = newProps[key]

    if (newValue === undefined || newValue === null) {
      element.removeAttribute(key)
      if (key === 'oninputdebounced') {
        const timer = record.debounceTimers.get(key)
        if (timer) clearTimeout(timer)
        record.debounceTimers.delete(key)
      }
      track('patches')
      continue
    }

    // Avoid resetting browser-managed input state, such as cursor position.
    if (key === 'value' || key === 'checked') {
      if (element[key] !== newValue) {
        element[key] = newValue
        track('patches')
      }
      continue
    }

    if (oldValue === newValue) continue
    track('patches')

    if (key.startsWith('on')) {
      const { eventKey, modifiers } = parseEventKey(key)
      const eventName = eventKey.slice(2).toLowerCase()

      if (HELPER_EVENTS.has(eventKey)) {
        continue
      }

      if (eventKey === 'oninputdebounced') {
        continue
      }

      if (eventKey === 'onclickasync') {
        const wrapped = async (event) => {
          if (newProps.disabledwhilepending && record.asyncPending.get('click'))
            return
          try {
            record.asyncPending.set('click', true)
            if (newProps.disabledwhilepending) element.disabled = true
            await newValue(event)
          } finally {
            record.asyncPending.set('click', false)
            if (newProps.disabledwhilepending) element.disabled = false
          }
        }
        addManagedListener(element, 'click', wrapped, false, oldValue)
        continue
      }

      const listener = (event) => {
        if (modifiers.includes('prevent')) event.preventDefault()
        if (modifiers.includes('stop')) event.stopPropagation()
        return newValue(event)
      }

      addManagedListener(
        element,
        eventName,
        listener,
        {
          once: modifiers.includes('once'),
          capture: modifiers.includes('capture'),
          passive: modifiers.includes('passive'),
        },
        oldValue,
      )
      continue
    }

    if (key === 'debounce') continue
    if (key === 'disabled') {
      element.disabled = newValue === true || newValue === 'true'
      continue
    }

    element.setAttribute(key, newValue)
  }

  const debounceMs = Number(newProps.debounce)
  if (newProps.oninputdebounced) {
    const debouncedHandler = (event) => {
      const previous = record.debounceTimers.get('oninputdebounced')
      if (previous) clearTimeout(previous)
      const timer = setTimeout(
        () => {
          record.debounceTimers.delete('oninputdebounced')
          newProps.oninputdebounced({
            ...event,
            target: element,
            currentTarget: element,
          })
        },
        Number.isFinite(debounceMs) ? debounceMs : 250,
      )
      record.debounceTimers.set('oninputdebounced', timer)
    }
    addManagedListener(
      element,
      'input',
      debouncedHandler,
      false,
      oldProps.oninputdebounced,
    )
  }

  if (
    newProps.onenter ||
    newProps.onescape ||
    newProps.onkeys ||
    newProps.oncommit
  ) {
    const keyHandler = (event) => {
      const composing = record.composition.get('active') === true
      if (shouldIgnoreKeyboardEvent(event, composing)) return

      const comboParts = []
      if (event.ctrlKey) comboParts.push('ctrl')
      if (event.metaKey) comboParts.push('meta')
      if (event.altKey) comboParts.push('alt')
      if (event.shiftKey) comboParts.push('shift')
      comboParts.push(event.key.toLowerCase())
      const combo = comboParts.sort().join('+')

      if (event.key === 'Enter' && newProps.onenter) newProps.onenter(event)
      if (event.key === 'Escape' && newProps.onescape) newProps.onescape(event)
      if (newProps.onkeys) {
        Object.entries(newProps.onkeys).forEach(([keyCombo, handler]) => {
          if (normalizeKeyCombo(keyCombo) === combo) handler(event)
        })
      }

      if (event.key === 'Enter' && newProps.oncommit) {
        record.commitLocks.set('enter', true)
        newProps.oncommit(event)
        setTimeout(() => record.commitLocks.delete('enter'), 0)
      }
    }

    const blurHandler = (event) => {
      if (!newProps.oncommit) return
      if (record.commitLocks.get('enter')) return
      newProps.oncommit(event)
    }

    const startComposition = () => record.composition.set('active', true)
    const endComposition = () => record.composition.set('active', false)

    addManagedListener(
      element,
      'compositionstart',
      startComposition,
      false,
      oldProps.__compositionstart,
    )
    addManagedListener(
      element,
      'compositionend',
      endComposition,
      false,
      oldProps.__compositionend,
    )
    addManagedListener(
      element,
      'keydown',
      keyHandler,
      false,
      oldProps.__keyhelper,
    )
    addManagedListener(
      element,
      'blur',
      blurHandler,
      false,
      oldProps.__oncommitblur,
    )
  }
}

function reconcileChildren(parent, newChildren, oldChildren) {
  // Unkeyed children are cheap to patch by index; keyed children preserve DOM
  // identity across reorders so state and focus do not move to the wrong item.
  const isKeyed = hasKeys(newChildren) || hasKeys(oldChildren)
  if (!isKeyed) {
    const maxLen = Math.max(newChildren.length, oldChildren.length)
    for (let i = 0; i < maxLen; i++)
      patch(parent, newChildren[i], oldChildren[i], i)
    return
  }
  reconcileKeyedChildren(parent, newChildren, oldChildren)
}

function reconcileKeyedChildren(parent, newChildren, oldChildren) {
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
      const oldVNode = existingChildMatch.vNode
      patch(parent, newChild, oldVNode, i)
      const element = newChild.el || oldVNode.el
      const domChildAtIndex = parent.childNodes[i]
      if (element && domChildAtIndex !== element) {
        parent.insertBefore(element, domChildAtIndex)
        track('patches')
      }
      delete keyed[key]
    } else {
      const newElement = createElement(newChild, getNamespace(parent))
      const domChildAtIndex = parent.childNodes[i]
      if (domChildAtIndex) parent.insertBefore(newElement, domChildAtIndex)
      else parent.appendChild(newElement)
    }
  })
  Object.values(keyed).forEach(({ vNode }) => {
    if (vNode.el && vNode.el.parentNode === parent) {
      runUnmount(vNode)
      parent.removeChild(vNode.el)
      track('elementsRemoved')
    }
  })
}

function renderComponent(vNode) {
  track('componentsRendered')
  const hooks = { mounts: [], cleanups: [] }
  setInstance(hooks)
  const renderedVNode = vNode.tag(vNode.props)
  setInstance(null)
  vNode.hooks = hooks
  return renderedVNode
}

function runUnmount(vNode) {
  if (!vNode) return
  if (vNode.hooks && vNode.hooks.cleanups)
    vNode.hooks.cleanups.forEach((fn) =>
      invokeHookSafely(fn, 'Error in cleanup hook:'),
    )
  if (vNode.child) runUnmount(vNode.child)
  if (vNode.children) vNode.children.forEach(runUnmount)
}

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
    const hasPreviousHooks = Boolean(oldVNode?.hooks?.cleanups?.length)
    const childVNode = renderComponent(newVNode)
    newVNode.child = childVNode
    const oldChild = oldVNode ? oldVNode.child : undefined
    patch(parent, childVNode, oldChild, index)
    newVNode.el = childVNode.el
    if (isNew && newVNode.hooks && newVNode.hooks.mounts.length > 0)
      setTimeout(
        () =>
          newVNode.hooks.mounts.forEach((fn) =>
            invokeHookSafely(fn, 'Error in mount hook:'),
          ),
        0,
      )
    if (!isNew && hasPreviousHooks) {
      oldVNode.hooks.cleanups.forEach((fn) =>
        invokeHookSafely(fn, 'Error in cleanup hook:'),
      )
      if (newVNode.hooks?.mounts?.length > 0)
        setTimeout(
          () =>
            newVNode.hooks.mounts.forEach((fn) =>
              invokeHookSafely(fn, 'Error in mount hook:'),
            ),
          0,
        )
    }
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
  reconcileChildren(el, newVNode.children, oldVNode.children)
}
