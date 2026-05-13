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
      const hasSingleTemplateNode = renderNodes.length === 1

      const importRegex = /import\s+(?:[\s\S]*?from\s+)?['"][^'"]+['"];?/g
      const userImports = (scriptContent.match(importRegex) || []).join('\n')
      const componentLogic = scriptContent.replace(importRegex, '').trim()

      let styleLogic = ''
      if (styleContent) {
        const escapedStyle = styleContent
          .replace(/`/g, '\\`')
          .replace(/\$\{/g, '\\${')
        styleLogic = `const __styles = css(\`${escapedStyle}\`, ${hasSingleTemplateNode});`
      }

      const vdomAssignment = hasSingleTemplateNode
        ? `const __templateNode = ${renderNodes[0]};
           const __vdom = Array.isArray(__templateNode)
             ? h('div', {}, __templateNode)
             : __templateNode;`
        : `const __vdom = h('div', {}, [${renderNodes.join(',')}]);`

      return {
        code: `
          ${`import { h${styleContent ? ', css' : ''} } from 'humn';`}
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
