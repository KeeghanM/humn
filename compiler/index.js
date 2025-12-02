import { parse } from 'node-html-parser'

/**
 * 1. PROTECT ATTRIBUTES (Safe from previous step)
 */
function protectAttributes(html) {
  let output = ''
  let lastIndex = 0
  const masks = new Map()
  let maskId = 0

  const regex = /([a-zA-Z0-9:-]+)\s*=\s*\{/g
  let match

  while ((match = regex.exec(html)) !== null) {
    output += html.slice(lastIndex, match.index)
    const attrName = match[1]
    const startIndex = match.index + match[0].length - 1

    let depth = 1
    let curr = startIndex + 1
    let found = false

    while (curr < html.length) {
      const char = html[curr]
      if (char === '{') depth++
      else if (char === '}') depth--
      if (depth === 0) {
        found = true
        break
      }
      curr++
    }

    if (found) {
      const code = html.slice(startIndex + 1, curr)
      const key = `__HUMN_ATTR_${maskId++}__`
      masks.set(key, code)
      output += `${attrName}="${key}"`
      lastIndex = curr + 1
      regex.lastIndex = lastIndex
    } else {
      output += match[0]
      lastIndex = regex.lastIndex
    }
  }

  output += html.slice(lastIndex)
  return { html: output, masks }
}

/**
 * 2. PROCESS CHILDREN (Upgraded for Chained Blocks)
 */
function processChildren(nodes, traverseFn) {
  const results = []

  for (let i = 0; i < nodes.length; i++) {
    const child = nodes[i]

    const isText = child.nodeType === 3
    let textContent = isText ? child.rawText : ''

    // Detect start of logic block
    const isOpenLogic =
      isText &&
      textContent.trim().startsWith('{') &&
      !textContent.trim().endsWith('}')

    if (isOpenLogic) {
      // Find the first '{' (might be preceded by whitespace)
      const startIdx = textContent.indexOf('{')
      let buffer = textContent.slice(startIdx + 1) // Content after {

      // Look Ahead Loop
      let complete = false

      while (i + 1 < nodes.length) {
        i++
        const nextNode = nodes[i]

        if (nextNode.nodeType === 1) {
          // Element: Compile and append
          const compiledElem = traverseFn(nextNode)
          if (compiledElem) buffer += compiledElem
        } else if (nextNode.nodeType === 3) {
          // Text: This is where we handle chained blocks
          let nextText = nextNode.rawText

          // Inner loop to consume multiple blocks within one text node
          // e.g. "} { next block"
          while (true) {
            const closeIndex = nextText.indexOf('}')

            if (closeIndex !== -1) {
              // 1. Found closer. Append content and finish THIS block.
              buffer += nextText.slice(0, closeIndex)
              results.push(buffer)

              // 2. Check remainder
              const remainder = nextText.slice(closeIndex + 1)
              const trimmed = remainder.trim()

              if (!trimmed) {
                // Just whitespace, we are done with this chain
                complete = true
                break
              }

              // 3. Does remainder start a NEW block?
              const nextOpen = remainder.indexOf('{')
              if (nextOpen !== -1 && !remainder.slice(0, nextOpen).trim()) {
                // Yes! It's "   { new block..."
                // Reset buffer and CONTINUE the inner loop to find the next '}'
                buffer = remainder.slice(nextOpen + 1)
                nextText = remainder.slice(nextOpen + 1) // Advance text
                // continue inner loop
              } else {
                // No, it's static text. e.g. "} some text"
                results.push(`'${trimmed.replace(/'/g, "\\'")}'`)
                complete = true
                break
              }
            } else {
              // No closer found in this chunk. Append all and move to next node.
              buffer += nextText
              break
            }
          }

          if (complete) break // Break outer look-ahead
        }
      }

      // If we ran out of nodes but buffer has content (and not complete), push it
      if (!complete && buffer.trim()) {
        results.push(buffer)
      }
    } else {
      // Standard Node
      const compiled = traverseFn(child)
      if (compiled) results.push(compiled)
    }
  }

  return results
}

/**
 * 3. COMPILE TEMPLATE
 */
function compileTemplate(htmlString) {
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
          propsParts.push(`${key}: '${val}'`)
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

export default function humn() {
  return {
    name: 'vite-plugin-humn',
    resolveId(id) {
      if (id.endsWith('.humn')) return id
      return null
    },
    transform(src, id) {
      if (!id.endsWith('.humn')) return

      const scriptMatch = src.match(/<script>([\s\S]*?)<\/script>/)
      const styleMatch = src.match(/<style>([\s\S]*?)<\/style>/)

      const scriptContent = scriptMatch ? scriptMatch[1] : ''
      const styleContent = styleMatch ? styleMatch[1] : ''

      let templateHTML = src
        .replace(/<script>[\s\S]*?<\/script>/, '')
        .replace(/<style>[\s\S]*?<\/style>/, '')
        .trim()

      const renderNodes = compileTemplate(templateHTML)

      const importRegex = /import[\s\S]*?from\s+['"][^'"]+['"];?/g
      const userImports = (scriptContent.match(importRegex) || []).join('\n')
      const componentLogic = scriptContent.replace(importRegex, '').trim()

      const imports = [
        `import { h${styleContent ? ', css' : ''} } from 'humn';`,
      ]
      let styleLogic = ''
      if (styleContent) styleLogic = `const __styles = css\`${styleContent}\`;`

      let vdomAssignment = ''
      if (renderNodes.length === 1) {
        vdomAssignment = `const __vdom = ${renderNodes[0]};`
      } else {
        vdomAssignment = `const __vdom = h('div', {}, [${renderNodes.join(',')}]);`
      }

      return {
        code: `
          ${imports.join('\n')}
          ${userImports}
          ${styleLogic}

          export default function Component(props) {
            ${componentLogic} 
            ${vdomAssignment}
            
            if (typeof __styles !== 'undefined' && __vdom && __vdom.props) {
               __vdom.props.class = (__vdom.props.class ? __vdom.props.class + ' ' : '') + __styles;
            }

            return __vdom;
          }
        `,
        map: null,
      }
    },
  }
}
