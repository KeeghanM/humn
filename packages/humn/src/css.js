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
 * Supports two signatures:
 * 1. Tagged Template: css`...`
 * 2. Function: css(string, isSingleRoot)
 */
export function css(stringsOrStr, ...args) {
  let raw = ''
  let isSingleRoot = false

  // Detect usage of Tagged Template vs Function Call
  if (Array.isArray(stringsOrStr) && stringsOrStr.raw) {
    raw = stringsOrStr.reduce((acc, str, i) => {
      return acc + str + (args[i] || '')
    }, '')
  } else {
    raw = stringsOrStr
    // If called as function, the first arg is our boolean flag
    isSingleRoot = args[0] === true
  }
  let content = minify(raw)

  if (!content) return ''

  if (isSingleRoot) {
    // Transforms selectors to apply to BOTH the root (using &) AND descendants.
    // e.g. "div" -> "div&, div"

    // Regex Breakdown:
    // 1. (^|[{};,])      -> Hard Start (Line start, brace, semi, comma)
    // 2. (\s*)           -> Whitespace
    // 3. (?!from|to)     -> Negative Lookahead: Ignore 'from'/'to' (keyframes)
    // 4. ( ... )+        -> Compound Selector:
    //    (?:[.#]?[\w-]+ ... ) -> Matches tags (div), classes (.class), ids (#id)
    // 5. (?=\s*\{)       -> Lookahead: Must be followed by {

    content = content.replace(
      /(^|[{};,])(\s*)(?!from|to)((?:[.#]?[\w-]+|\[[^\]]+\]|:{1,2}[^:,{\s]+)+)(?=\s*\{)/gi,
      '$1$2$3&, $3',
    )
  }

  const hash = hashString(content)
  const hashedClassName = `humn-${hash}`

  if (cache.has(hash)) {
    return hashedClassName
  }

  if (!styleSheet) {
    styleSheet = document.createElement('style')
    styleSheet.id = 'humn-styles'
    document.head.appendChild(styleSheet)
  }

  styleSheet.textContent += `.${hashedClassName} { 
    ${content} 
  }\n`
  cache.add(hash)

  return hashedClassName
}
