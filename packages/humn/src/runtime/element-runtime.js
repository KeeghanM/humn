const elementRuntime = new WeakMap()

export function getElementRuntime(element) {
  const existing = elementRuntime.get(element)
  if (existing) return existing

  const runtime = {
    asyncPending: new Map(),
    commitLocks: new Map(),
    composition: new Map(),
    debounceTimers: new Map(),
    listeners: new Map(),
  }

  elementRuntime.set(element, runtime)
  return runtime
}
