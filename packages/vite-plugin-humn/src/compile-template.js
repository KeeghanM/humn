import { parse } from 'node-html-parser'

import { processChildren } from './process-children.js'
import { protectAttributes } from './protect-attributes.js'

export function compileTemplate(htmlString) {
  const { html: safeHTML, masks } = protectAttributes(htmlString)
  const root = parse(safeHTML)

  function traverse(node) {
    if (node.nodeType === 3) {
      const text = node.rawText.trim()
      if (!text) return null

      if (text.startsWith('{') && text.endsWith('}')) return text.slice(1, -1)

      if (text.includes('{') && text.includes('}')) {
        const jsTemplate = text.replace(/\{/g, '${').replace(/\}/g, '}')
        return '`' + jsTemplate + '`'
      }

      return `'${text.replace(/'/g, "\\'")}'`
    }

    if (node.nodeType === 1) {
      const tag = `'${node.tagName.toLowerCase()}'`
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

      return `h(${tag}, ${propsString}, [${children.join(', ')}])`
    }
    return null
  }

  return processChildren(root.childNodes, traverse)
}
