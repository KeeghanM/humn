# CSS Scoping & Runtime

Humn uses a lightweight runtime CSS-in-JS solution that leverages **Native CSS Nesting** to provide scoped styles without the need for complex build-time extraction.

## **Overview**

The CSS system is responsible for taking a string of CSS, generating a unique scoped class name, and injecting that CSS into the DOM. It handles:

1.  **Minification**: Stripping comments and whitespace.
2.  **Hashing**: Generating unique class names based on content.
3.  **Transformation**: intelligently rewriting selectors for Single Root components.
4.  **Injection**: Appending styles to the document head.

## The `css` Function

The core of the module is the `css` function. It supports two signatures:

1.  **Tagged Template** (Standard Usage): Used when manually calling `css` in JavaScript.

```javascript
const className = css`
  color: red;
`
```

2.  **Function Call** (Compiler Usage): Used by the compiler to pass metadata.

```javascript
// The second argument 'true' indicates a single-root component
const className = css('div { color: red }', true)
```

## Hashing & Deduplication

Humn uses the **DJB2** algorithm to create a generic hash of the minified CSS content.

A `Set` cache is used to track which hashes have already been injected. If a component is rendered multiple times, the CSS is only added to the DOM once.

```javascript
const hash = hashString(content) // e.g., "1x4d2"
const className = `humn-${hash}` // e.g., "humn-1x4d2"
```

## Single Root Transformation

One of the most complex parts of the runtime is handling "Single File Component" styles.

When styling a component, users expect a selector like div { ... } or .card { ... } to apply to the element itself (if it matches) AND any children.

However, because Humn scopes styles by wrapping them in a unique class (e.g., .humn-hash { ... }), a standard selector like div would effectively become .humn-hash div, which only matches descendants.

### The Union Strategy

To solve this, when isSingleRoot is true, Humn transforms selectors using a Union Strategy. It rewrites selectors to apply to both the parent context (using the nesting selector &) and the descendant context.

### Transformation Rule:selector → selector&, selector

| Input Selector | Transformed       | Compiled CSS                          | Result                                  |
| :------------- | :---------------- | :------------------------------------ | :-------------------------------------- |
| `div`          | `div&, div`       | `div.humn-hash, .humn-hash div`       | Matches root `div` OR nested `div`s     |
| `.card`        | `.card&, .card`   | `.card.humn-hash, .humn-hash .card`   | Matches root `.card` OR nested `.card`s |
| `:hover`       | `:hover&, :hover` | `:hover.humn-hash, .humn-hash :hover` | Matches root hover OR nested hover      |

### The Regex Logic

The transformation relies on a robust regex to identify top-level selectors while ignoring descendants, values, and keyframes.

```javascript
;/(^|[{};,])(\s*)(?!from|to)((?:[.#]?[\w-]+|\[[^\]]+\]|:{1,2}[^:,{\s]+)+)(?=\s*\{)/gi
```

1. Hard Start `(^|[{};,])`: Ensures we are at the beginning of a selector chain. This prevents us from modifying descendants (e.g., in `header .card`, `.card` is NOT transformed).
2. Exclusions `(?!from|to)`: Negative lookahead to ensure we don't break @keyframes.
3. Selector Capture: Captures the actual selector.
   1. `[.#]?[\w-]+`: Tags (`div`), Classes (`.class`), IDs (`#id`)
   2. `\[[^\]]+\]`: Attributes ([type="text"])
   3. `:{1,2}[^:,{\s]+`: Pseudos (`:hover`, `::before`)
4. Block Lookahead `(?=\s*\{)`: Ensures the match is followed by a `{` block. This is critical to avoid matching CSS values (like `#fff`) or properties that look like selectors.

## DOM Injection

Styles are injected into a single shared `<style id="humn-styles">` element in the document head.

```HTML
<head>
  <style id="humn-styles">
    .humn-1x4d2 {
      color: red;
    }
    .humn-9k2j1 .card&, .humn-9k2j1 .card {
      background: blue;
    }
  </style>
</head>
```
