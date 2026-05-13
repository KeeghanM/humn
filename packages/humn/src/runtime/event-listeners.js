import { getElementRuntime } from './element-runtime.js'

const MODIFIER_FLAGS = new Set([
  'prevent',
  'stop',
  'once',
  'capture',
  'passive',
])

export function parseEventKey(key) {
  const [eventKey, ...modifierParts] = key.split('|')
  const modifiers = modifierParts.filter((modifier) =>
    MODIFIER_FLAGS.has(modifier),
  )

  return { eventKey, modifiers }
}

export function addManagedListener({
  element,
  eventName,
  listener,
  options = false,
  propKey,
}) {
  const { listeners } = getElementRuntime(element)

  removeManagedListener(element, propKey)
  element.addEventListener(eventName, listener, options)
  listeners.set(propKey, { eventName, listener, options })
}

export function removeManagedListener(element, propKey) {
  const { listeners } = getElementRuntime(element)
  const previous = listeners.get(propKey)
  if (!previous) return

  const { eventName, listener, options } = previous
  element.removeEventListener(eventName, listener, options)
  listeners.delete(propKey)
}
