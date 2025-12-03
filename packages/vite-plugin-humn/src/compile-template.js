import { parse } from 'node-html-parser'

import { processChildren } from './process-children.js'
import { protectAttributes } from './protect-attributes.js'

/**
 * Recovers the original case-sensitive tag name from the source string.
 * This works around the parser normalizing everything to uppercase.
 */
function getRawTagName(node, htmlSource) {
  if (!node.range) return node.tagName // Fallback

  const [start] = node.range
  // The node starts at '<'. The tag name starts at start + 1.
  const tagStart = start + 1

  let i = tagStart
  // Scan until we hit whitespace, '>', or '/' (self-closing)
  while (i < htmlSource.length) {
    const char = htmlSource[i]
    if (/\s|\/|>/.test(char)) {
      break
    }
    i++
  }

  return htmlSource.slice(tagStart, i)
}

/**
 * Checks if a tag name looks like a Component (starts with uppercase)
 */
function isComponent(tagName) {
  const firstChar = tagName.charAt(0)
  return (
    firstChar === firstChar.toUpperCase() &&
    firstChar !== firstChar.toLowerCase()
  )
}

export function compileTemplate(htmlString) {
  const { html: safeHTML, masks } = protectAttributes(htmlString)
  const root = parse(safeHTML)

  function traverse(node) {
    if (node.nodeType === 3) {
      const text = node.rawText.trim()
      if (!text) return null

      // Checks for a SINGLE expression (e.g. "{name}")
      // and not multiple expressions (e.g. "{first} {last}")
      if (/^\{[^}]+\}$/.test(text)) return text.slice(1, -1)

      if (text.includes('{') && text.includes('}')) {
        const jsTemplate = text.replace(/\{([^}]*)\}/g, '${$1}')
        if (jsTemplate !== text) {
          return '`' + jsTemplate + '`'
        }
      }

      return `'${text.replace(/'/g, "\\'")}'`
    }

    if (node.nodeType === 1) {
      const rawTag = getRawTagName(node, safeHTML)
      const isComp = isComponent(rawTag)
      const tagOutput = isComp ? rawTag : `'${rawTag.toLowerCase()}'`

      const propsParts = []

      Object.entries(node.attributes).forEach(([key, val]) => {
        if (masks.has(val)) {
          propsParts.push(`${key}: ${masks.get(val)}`)
        } else {
          propsParts.push(`${key}: '${val.replace(/'/g, "\\'")}'`)
        }
      })

      const propsString = `{ ${propsParts.join(', ')} }`
      const children = processChildren(node.childNodes, traverse)

      return `h(${tagOutput}, ${propsString}, [${children.join(', ')}])`
    }
    return null
  }

  return processChildren(root.childNodes, traverse)
}
