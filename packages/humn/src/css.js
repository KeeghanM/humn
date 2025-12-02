/**
 * @file Runtime Scoped CSS implementation using Native CSS Nesting.
 * @module css
 */

let styleSheet = null
const cache = new Set()

/**
 * Simple DJB2 hashing function.
 */
function hashString(str) {
  let hash = 5381
  let i = str.length
  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i)
  }
  return (hash >>> 0).toString(36)
}

/**
 * Lightweight Runtime Minifier.
 * Removes comments and collapses whitespace.
 * We do not strip spaces around colons/brackets to ensure safety for calc().
 */
function minify(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
    .replace(/\s+/g, ' ') // Collapse newlines/tabs to single space
    .trim() // Remove leading/trailing
}

/**
 * Scoped CSS Tag.
 * Wraps content in a unique class using Native CSS Nesting.
 */
export function css(strings, ...args) {
  const raw = strings.reduce((acc, str, i) => {
    return acc + str + (args[i] || '')
  }, '')

  const content = minify(raw)

  if (!content) return ''

  const hash = hashString(content)
  const className = `humn-${hash}`

  if (cache.has(hash)) {
    return className
  }

  if (!styleSheet) {
    styleSheet = document.createElement('style')
    styleSheet.id = 'humn-styles'
    document.head.appendChild(styleSheet)
  }

  styleSheet.textContent += `.${className} { 
    ${content} 
  }\n`
  cache.add(hash)

  return className
}
