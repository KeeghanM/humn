import { doc } from 'prettier'

const { group, hardline, indent, join } = doc.builders

export const languages = [
  {
    name: 'Humn',
    extensions: ['.humn'],
    parsers: ['humn-parser'],
  },
]

export const parsers = {
  'humn-parser': {
    astFormat: 'humn-ast',
    parse: (text) => {
      const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/
      const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/

      const scriptMatch = text.match(scriptRegex)
      const styleMatch = text.match(styleRegex)

      const template = text
        .replace(scriptRegex, '')
        .replace(styleRegex, '')
        .trim()

      const children = []

      if (scriptMatch) {
        children.push({ type: 'humn-script', content: scriptMatch[1] })
      }

      if (template) {
        children.push({ type: 'humn-template', content: template })
      }

      if (styleMatch) {
        children.push({ type: 'humn-style', content: styleMatch[1] })
      }

      return {
        type: 'root',
        children,
      }
    },
    locStart: () => 0,
    locEnd: () => 0,
  },
}

export const printers = {
  'humn-ast': {
    print: (path, options, print) => {
      const node = path.getValue()

      if (!node) return ''

      if (node.type === 'root') {
        return join([hardline, hardline], path.map(print, 'children'))
      }

      return node.content || ''
    },

    embed: (path) => {
      const node = path.getValue()

      if (!node) return null

      if (node.type === 'humn-script') {
        return async (textToDoc) => {
          const doc = await textToDoc(node.content, { parser: 'babel' })
          return group([
            '<script>',
            indent([hardline, doc]),
            hardline,
            '</script>',
          ])
        }
      }

      if (node.type === 'humn-style') {
        return async (textToDoc) => {
          const doc = await textToDoc(node.content, { parser: 'css' })
          return group([
            '<style>',
            indent([hardline, doc]),
            hardline,
            '</style>',
          ])
        }
      }

      if (node.type === 'humn-template') {
        return node.content
      }

      return null
    },
  },
}

export default {
  languages,
  parsers,
  printers,
}
