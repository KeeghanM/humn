import { parse } from 'node-html-parser'

/**
 * 1. PROTECT ATTRIBUTES
 * Scans the HTML string for `attr={...}` patterns.
 * Counts braces to correctly handle nested objects/templates.
 * Replaces the JS content with a safe ID: `attr="__HUMN_ATTR_0__"`
 */
function protectAttributes(html) {
  let output = ''
  let lastIndex = 0
  const masks = new Map()
  let maskId = 0

  // Find the start of an attribute expression: name={
  const regex = /([a-zA-Z0-9:-]+)\s*=\s*\{/g
  let match

  while ((match = regex.exec(html)) !== null) {
    // Append everything before this match
    output += html.slice(lastIndex, match.index)

    const attrName = match[1]
    const startIndex = match.index + match[0].length - 1 // Index of the opening '{'

    // Walk forward counting braces
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
      // Extract the JS code (inner content)
      const code = html.slice(startIndex + 1, curr)

      // Create a mask key
      const key = `__HUMN_ATTR_${maskId++}__`
      masks.set(key, code) // Store original code

      // Replace with safe string: attr="__HUMN_ATTR_0__"
      output += `${attrName}="${key}"`

      lastIndex = curr + 1
      // Update regex position to skip what we just consumed
      regex.lastIndex = lastIndex
    } else {
      // Unbalanced braces (syntax error in user code), ignoring
      output += match[0]
      lastIndex = regex.lastIndex
    }
  }

  output += html.slice(lastIndex)
  return { html: output, masks }
}

/**
 * 2. PROCESS CHILDREN
 * Handles "Logic Fragmentation".
 * Stitches text nodes and elements back together if they are part of a { block }.
 */
function processChildren(nodes, traverseFn) {
  const results = []

  for (let i = 0; i < nodes.length; i++) {
    const child = nodes[i]

    // Check for "Open Logic Block" (Text starting with { but not ending with })
    const isText = child.nodeType === 3
    const textContent = isText ? child.rawText : ''
    const isOpenLogic =
      isText &&
      textContent.trim().startsWith('{') &&
      !textContent.trim().endsWith('}')

    if (isOpenLogic) {
      // Start buffer (remove the leading {)
      let buffer = textContent.replace('{', '')

      // Look Ahead Loop
      while (i + 1 < nodes.length) {
        i++ // Consume next node
        const nextNode = nodes[i]

        if (nextNode.nodeType === 1) {
          // Element: Compile and append
          const compiledElem = traverseFn(nextNode)
          if (compiledElem) buffer += compiledElem
        } else if (nextNode.nodeType === 3) {
          // Text: Check for closer '}'
          const nextText = nextNode.rawText
          const closeIndex = nextText.indexOf('}')

          if (closeIndex !== -1) {
            // Found closer. Append content before it.
            buffer += nextText.slice(0, closeIndex)

            // Handle remainder text (if any text exists after the })
            const remainder = nextText.slice(closeIndex + 1).trim()
            if (remainder) {
              // If there is text after the block, treat it as a static string
              results.push(buffer) // Push the code block
              buffer = '' // Clear buffer
              results.push(`'${remainder.replace(/'/g, "\\'")}'`)
            }
            break
          } else {
            // Just more code
            buffer += nextText
          }
        }
      }

      if (buffer.trim()) {
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
  // A. Protect Attributes first
  const { html: safeHTML, masks } = protectAttributes(htmlString)

  // B. Parse the safe HTML
  const root = parse(safeHTML)

  function traverse(node) {
    // Text Node
    if (node.nodeType === 3) {
      const text = node.rawText.trim()
      if (!text) return null

      // Code Block { val } -> val
      if (text.startsWith('{') && text.endsWith('}')) {
        return text.slice(1, -1)
      }

      // Interpolation "Hi {name}" -> `Hi ${name}`
      if (text.includes('{') && text.includes('}')) {
        const jsTemplate = text.replace(/\{/g, '${').replace(/\}/g, '}')
        return '`' + jsTemplate + '`'
      }

      return `'${text.replace(/'/g, "\\'")}'`
    }

    // Element Node
    if (node.nodeType === 1) {
      const tag = `'${node.tagName.toLowerCase()}'`
      const propsParts = []

      Object.entries(node.attributes).forEach(([key, val]) => {
        // C. Restore Protected Attributes
        if (masks.has(val)) {
          const originalCode = masks.get(val)
          propsParts.push(`${key}: ${originalCode}`)
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
