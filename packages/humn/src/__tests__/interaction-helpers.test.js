import { describe, expect, it, vi } from 'vitest'

import { h, mount } from '../index'

describe('Interaction helpers', () => {
  it('supports onenter and onescape keyboard helpers', () => {
    const onEnter = vi.fn()
    const onEscape = vi.fn()
    const App = () => h('input', { onenter: onEnter, onescape: onEscape })
    const target = document.createElement('div')
    mount(target, App)

    const input = target.querySelector('input')
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )

    expect(onEnter).toHaveBeenCalledTimes(1)
    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('debounces input and uses latest value', async () => {
    vi.useFakeTimers()
    const onDebounced = vi.fn((event) => event.target.value)
    const App = () =>
      h('input', { debounce: 100, oninputdebounced: onDebounced })
    const target = document.createElement('div')
    mount(target, App)
    const input = target.querySelector('input')

    input.value = 'a'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.value = 'ab'
    input.dispatchEvent(new Event('input', { bubbles: true }))

    vi.advanceTimersByTime(100)
    expect(onDebounced).toHaveBeenCalledTimes(1)
    expect(onDebounced.mock.calls[0][0].target.value).toBe('ab')
    vi.useRealTimers()
  })

  it('fires oncommit once for enter+blur single intent', () => {
    const onCommit = vi.fn()
    const App = () => h('input', { oncommit: onCommit })
    const target = document.createElement('div')
    mount(target, App)
    const input = target.querySelector('input')

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))

    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('handles onclickasync + disabledwhilepending', async () => {
    let resolve
    const onclickasync = vi.fn(
      () =>
        new Promise((res) => {
          resolve = res
        }),
    )
    const App = () =>
      h('button', { onclickasync, disabledwhilepending: true }, 'Save')
    const target = document.createElement('div')
    mount(target, App)
    const button = target.querySelector('button')

    button.click()
    button.click()
    expect(onclickasync).toHaveBeenCalledTimes(1)
    expect(button.disabled).toBe(true)

    resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(button.disabled).toBe(false)
  })

  it('supports event modifiers via pipe syntax', () => {
    const submit = vi.fn()
    const parent = vi.fn()
    const App = () =>
      h('div', { onclick: parent }, [
        h('a', { href: '#', 'onclick|prevent|stop': submit }, 'go'),
      ])

    const target = document.createElement('div')
    mount(target, App)
    const link = target.querySelector('a')

    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(submit).toHaveBeenCalledTimes(1)
    expect(parent).toHaveBeenCalledTimes(0)
  })
})
