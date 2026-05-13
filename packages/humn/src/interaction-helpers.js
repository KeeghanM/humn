import { getElementRuntime } from './element-runtime.js'
import { addManagedListener, removeManagedListener } from './event-listeners.js'

const HELPER_EVENTS = new Set(['onenter', 'onescape', 'onkeys', 'oncommit'])
const INTERACTION_LISTENER_KEYS = [
  '__compositionstart',
  '__compositionend',
  '__keyhelper',
  '__oncommitblur',
]

export function isInteractionHelperProp(eventKey) {
  return HELPER_EVENTS.has(eventKey)
}

export function clearDebouncedInput(element) {
  const { debounceTimers } = getElementRuntime(element)
  const timer = debounceTimers.get('oninputdebounced')
  if (timer) clearTimeout(timer)

  debounceTimers.delete('oninputdebounced')
  removeManagedListener(element, 'oninputdebounced')
}

export function patchDebouncedInput(element, newProps) {
  if (!newProps.oninputdebounced) {
    clearDebouncedInput(element)
    return
  }

  const { debounceTimers } = getElementRuntime(element)
  const debounceMs = Number(newProps.debounce)
  const delay = Number.isFinite(debounceMs) ? debounceMs : 250

  const debouncedHandler = (event) => {
    const previous = debounceTimers.get('oninputdebounced')
    if (previous) clearTimeout(previous)

    const timer = setTimeout(() => {
      debounceTimers.delete('oninputdebounced')
      newProps.oninputdebounced({
        ...event,
        currentTarget: element,
        target: element,
      })
    }, delay)

    debounceTimers.set('oninputdebounced', timer)
  }

  addManagedListener({
    element,
    eventName: 'input',
    listener: debouncedHandler,
    propKey: 'oninputdebounced',
  })
}

export function patchInteractionHelpers(element, newProps) {
  if (!hasInteractionHelpers(newProps)) {
    removeInteractionHelpers(element)
    return
  }

  const runtime = getElementRuntime(element)
  const keyHandler = getKeyHandler({ element, newProps, runtime })
  const blurHandler = getBlurHandler({ newProps, runtime })
  const startComposition = () => runtime.composition.set('active', true)
  const endComposition = () => runtime.composition.set('active', false)

  addManagedListener({
    element,
    eventName: 'compositionstart',
    listener: startComposition,
    propKey: '__compositionstart',
  })
  addManagedListener({
    element,
    eventName: 'compositionend',
    listener: endComposition,
    propKey: '__compositionend',
  })
  addManagedListener({
    element,
    eventName: 'keydown',
    listener: keyHandler,
    propKey: '__keyhelper',
  })
  addManagedListener({
    element,
    eventName: 'blur',
    listener: blurHandler,
    propKey: '__oncommitblur',
  })
}

export function patchAsyncClick({ element, handler, newProps, propKey }) {
  const { asyncPending } = getElementRuntime(element)
  const wrapped = async (event) => {
    if (newProps.disabledwhilepending && asyncPending.get('click')) return

    try {
      asyncPending.set('click', true)
      if (newProps.disabledwhilepending) element.disabled = true
      await handler(event)
    } finally {
      asyncPending.set('click', false)
      if (newProps.disabledwhilepending) element.disabled = false
    }
  }

  addManagedListener({
    element,
    eventName: 'click',
    listener: wrapped,
    propKey,
  })
}

function removeInteractionHelpers(element) {
  INTERACTION_LISTENER_KEYS.forEach((key) =>
    removeManagedListener(element, key),
  )
}

function hasInteractionHelpers(props) {
  return Boolean(
    props.onenter || props.onescape || props.onkeys || props.oncommit,
  )
}

function getKeyHandler({ element, newProps, runtime }) {
  return (event) => {
    const composing = runtime.composition.get('active') === true
    if (shouldIgnoreKeyboardEvent(event, composing)) return

    const combo = getEventCombo(event)

    if (event.key === 'Enter' && newProps.onenter) newProps.onenter(event)
    if (event.key === 'Escape' && newProps.onescape) newProps.onescape(event)
    if (newProps.onkeys) runMatchingKeyHandlers(event, combo, newProps.onkeys)

    if (event.key !== 'Enter' || !newProps.oncommit) return

    runtime.commitLocks.set('enter', true)
    newProps.oncommit(event)
    setTimeout(() => runtime.commitLocks.delete('enter'), 0)
  }
}

function getBlurHandler({ newProps, runtime }) {
  return (event) => {
    if (!newProps.oncommit) return
    if (runtime.commitLocks.get('enter')) return

    newProps.oncommit(event)
  }
}

function runMatchingKeyHandlers(event, combo, handlers) {
  Object.entries(handlers).forEach(([keyCombo, handler]) => {
    if (normalizeKeyCombo(keyCombo) === combo) handler(event)
  })
}

function getEventCombo(event) {
  const comboParts = []
  if (event.ctrlKey) comboParts.push('ctrl')
  if (event.metaKey) comboParts.push('meta')
  if (event.altKey) comboParts.push('alt')
  if (event.shiftKey) comboParts.push('shift')

  comboParts.push(event.key.toLowerCase())
  return comboParts.sort().join('+')
}

function normalizeKeyCombo(combo = '') {
  return combo
    .split('+')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .map((part) => getNormalizedModifier(part))
    .sort()
    .join('+')
}

function getNormalizedModifier(part) {
  if (part !== 'mod') return part

  return navigator.platform.includes('Mac') ? 'meta' : 'ctrl'
}

function shouldIgnoreKeyboardEvent(event, compositionState) {
  return event.isComposing || compositionState === true
}
