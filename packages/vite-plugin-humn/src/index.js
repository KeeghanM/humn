import { compileTemplate } from './compile-template.js'

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
      const isSingleRoot = renderNodes.length === 1

      const importRegex = /import\s+(?:[\s\S]*?from\s+)?['"][^'"]+['"];?/g
      const userImports = (scriptContent.match(importRegex) || []).join('\n')
      const componentLogic = scriptContent.replace(importRegex, '').trim()

      const imports = [
        `import { h${styleContent ? ', css' : ''} } from 'humn';`,
      ]
      let styleLogic = ''
      if (styleContent) {
        const escapedStyle = styleContent
          .replace(/`/g, '\\`')
          .replace(/\$\{/g, '\\${')
        styleLogic = `const __styles = css(\`${escapedStyle}\`, ${isSingleRoot});`
      }

      const vdomAssignment = isSingleRoot
        ? `const __vdom = ${renderNodes[0]};`
        : `const __vdom = h('div', {}, [${renderNodes.join(',')}]);`

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
