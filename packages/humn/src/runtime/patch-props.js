import { track } from '../metrics.js'
import {
  addManagedListener,
  parseEventKey,
  removeManagedListener,
} from './event-listeners.js'
import {
  clearDebouncedInput,
  isInteractionHelperProp,
  patchAsyncClick,
  patchDebouncedInput,
  patchInteractionHelpers,
} from './interaction-helpers.js'

export function patchProps(element, newProps = {}, oldProps = {}) {
  if (!element) return

  const allProps = { ...oldProps, ...newProps }
  for (const key in allProps) {
    patchProp({ element, key, newProps, oldProps })
  }

  patchDebouncedInput(element, newProps)
  patchInteractionHelpers(element, newProps)
}

function patchProp({ element, key, newProps, oldProps }) {
  const oldValue = oldProps[key]
  const newValue = newProps[key]

  if (newValue === undefined || newValue === null) {
    removeProp({ element, key })
    return
  }

  // Avoid resetting browser-managed input state, such as cursor position.
  if (key === 'value' || key === 'checked') {
    patchLiveDomProp({ element, key, value: newValue })
    return
  }

  if (oldValue === newValue && key !== 'onclickasync') return

  track('patches')
  if (key.startsWith('on')) {
    patchEventProp({ element, handler: newValue, key, newProps })
    return
  }

  if (key === 'debounce') return
  if (key === 'disabled') {
    element.disabled = newValue === true || newValue === 'true'
    return
  }

  element.setAttribute(key, newValue)
}

function removeProp({ element, key }) {
  if (key.startsWith('on')) removeManagedListener(element, key)
  if (key === 'oninputdebounced') clearDebouncedInput(element)

  element.removeAttribute(key)
  track('patches')
}

function patchLiveDomProp({ element, key, value }) {
  if (element[key] === value) return

  element[key] = value
  track('patches')
}

function patchEventProp({ element, handler, key, newProps }) {
  const { eventKey, modifiers } = parseEventKey(key)
  const eventName = eventKey.slice(2).toLowerCase()

  if (isInteractionHelperProp(eventKey)) return
  if (eventKey === 'oninputdebounced') return

  if (eventKey === 'onclickasync') {
    patchAsyncClick({ element, handler, newProps, propKey: key })
    return
  }

  const listener = (event) => {
    if (modifiers.includes('prevent')) event.preventDefault()
    if (modifiers.includes('stop')) event.stopPropagation()
    return handler(event)
  }

  addManagedListener({
    element,
    eventName,
    listener,
    options: {
      capture: modifiers.includes('capture'),
      once: modifiers.includes('once'),
      passive: modifiers.includes('passive'),
    },
    propKey: key,
  })
}
