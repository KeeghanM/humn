# Interaction Helpers

Humn includes small runtime helper props for common UI interactions. They are regular props on base DOM elements, so existing event handling behavior is unchanged unless you opt into one of these helpers.

## Keyboard Helpers

Use keyboard helpers when you want common key handling without writing the same `keydown` branching code in every component.

```humn
<script>
  const save = () => {
    // Save the current field value.
  }

  const close = () => {
    // Close a dialog or clear focus.
  }
</script>

<input
  onenter={save}
  onescape={close}
  onkeys={{ 'Mod+Enter': save, 'Shift+Escape': close }}
/>
```

- `onenter`: runs when `Enter` is pressed.
- `onescape`: runs when `Escape` is pressed.
- `onkeys`: maps key combinations to handlers.

Key combinations use `event.key` names plus optional `Ctrl`, `Meta`, `Alt`, and `Shift` modifiers. `Mod` maps to `Meta` on macOS and `Ctrl` elsewhere.

Keyboard helpers are IME-safe. They ignore keyboard events while composition is active, including native `event.isComposing` events and the period between `compositionstart` and `compositionend`.

## Debounced Input

Use `oninputdebounced` when input should wait until typing settles before running work such as filtering, validation, or search.

```humn
<script>
  const search = (event) => {
    const query = event.target.value
    // Run the search with the latest value.
  }
</script>

<input debounce={300} oninputdebounced={search} />
```

- `debounce`: delay in milliseconds.
- `oninputdebounced`: runs after the delay has passed without another input event.

If `debounce` is omitted or cannot be converted to a finite number, Humn uses `250` milliseconds. Each input event clears the previous pending timer, and the callback receives an event-like object whose `target` and `currentTarget` point at the input element so the latest value is available when the timer fires.

## Commit Semantics

Use `oncommit` when a field should commit on either `Enter` or blur.

```humn
<script>
  const commitName = (event) => {
    const name = event.target.value
    // Persist the committed value.
  }
</script>

<input oncommit={commitName} />
```

`oncommit` runs when the element receives `Enter` or loses focus. If pressing `Enter` also causes blur, Humn treats that as one user intent and fires `oncommit` once instead of double-firing. The Enter path uses the same IME safety as the keyboard helpers.

## Async Click Helpers

Use `onclickasync` for async submit-style actions, and add `disabledwhilepending` when repeated clicks should be blocked while the promise is pending.

```humn
<script>
  const save = async () => {
    await api.save()
  }
</script>

<button onclickasync={save} disabledwhilepending={true}>
  Save
</button>
```

- `onclickasync`: async click handler.
- `disabledwhilepending`: when true, disables the element and blocks repeated clicks until the async handler settles.

The disabled state is restored in a `finally` step, so the element is re-enabled whether the promise resolves or rejects. Without `disabledwhilepending`, `onclickasync` behaves like an async click listener and repeated clicks are allowed.

## Event Modifiers

Event modifiers are explicit, local opt-ins on handler prop names. They use pipe syntax on the prop key.

```javascript
import { h } from 'humn'

export function Link() {
  return h(
    'a',
    { href: '#', 'onclick|prevent|stop': (event) => navigate(event) },
    'Open',
  )
}
```

- `prevent`: calls `event.preventDefault()` before the handler.
- `stop`: calls `event.stopPropagation()` before the handler.
- `once`: installs the listener with `{ once: true }`.
- `capture`: installs the listener with `{ capture: true }`.
- `passive`: installs the listener with `{ passive: true }`.

Modifiers apply only to the specific handler prop where they are declared. Unknown modifier names are ignored.

Pipe-named modifiers are runtime prop keys. When using `h()`, quote the key as shown above. Current `.humn` templates support the helper props in this guide, but do not parse `|` inside attribute names; use standard event handlers in templates or generate a quoted prop key through `h()` for modifier behavior.
