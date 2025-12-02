import { parse } from 'node-html-parser'

/**
 * Compiles an HTML string into a Humn render function string.
 * Input: <div class="card">Hello {name}</div>
 * Output: h('div', { class: 'card' }, ['Hello ', name])
 */
function compileTemplate(htmlString) {
  const root = parse(htmlString)

  // Recursive function to turn DOM nodes into "h(...)" strings
  function traverse(node) {
    // Text Node (nodeType 3)
    if (node.nodeType === 3) {
      const text = node.rawText.trim()
      if (!text) return null

      // Replace {var} with ${var} for JS template literal
      if (text.includes('{') && text.includes('}')) {
        const jsTemplate = text.replace(/\{/g, '${').replace(/\}/g, '}')
        return '`' + jsTemplate + '`'
      }

      // Static Text
      return `'${text}'`
    }

    // Element Node (nodeType 1)
    if (node.nodeType === 1) {
      const tag = `'${node.tagName.toLowerCase()}'`
      const propsParts = []

      // Process Attributes
      Object.entries(node.attributes).forEach(([key, val]) => {
        // Dynamic Prop: onclick={handler} -> onclick: handler
        if (val.startsWith('{') && val.endsWith('}')) {
          const variable = val.slice(1, -1) // Strip { }
          propsParts.push(`${key}: ${variable}`)
        }
        // Static Prop: class="btn" -> class: 'btn'
        else {
          propsParts.push(`${key}: '${val}'`)
        }
      })

      // Construct Props Object String: "{ class: 'btn', onclick: inc }"
      const propsString = `{ ${propsParts.join(', ')} }`

      // Process Children Recursively
      const children = node.childNodes
        .map(traverse)
        .filter((c) => c !== null)
        .join(', ')

      return `h(${tag}, ${propsString}, [${children}])`
    }

    return null
  }

  const outputs = []
  root.childNodes.forEach((n) => outputs.push(traverse(n)))

  return outputs.filter(Boolean)
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

      const root = parse(src)

      const scriptNode = root.querySelector('script')
      const styleNode = root.querySelector('style')

      const scriptContent = scriptNode ? scriptNode.innerText : ''
      const styleContent = styleNode ? styleNode.innerText : ''

      if (scriptNode) scriptNode.remove()
      if (styleNode) styleNode.remove()

      const templateHTML = root.toString().trim()

      const renderNodes = compileTemplate(templateHTML)

      const importRegex = /import[\s\S]*?from\s+['"][^'"]+['"];?/g
      const userImports = (scriptContent.match(importRegex) || []).join('\n')
      const componentLogic = scriptContent.replace(importRegex, '').trim()

      const imports = [
        `import { h${styleContent ? ', css' : ''} } from 'humn';`,
      ]

      let styleLogic = ''

      if (styleContent) {
        styleLogic = `const __styles = css\`${styleContent}\`;`
      }

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
