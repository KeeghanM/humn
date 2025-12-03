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
      const scriptMatch = text.match(/<script>([\s\S]*?)<\/script>/)
      const styleMatch = text.match(/<style>([\s\S]*?)<\/style>/)

      const template = text
        .replace(/<script>[\s\S]*?<\/script>/, '')
        .replace(/<style>[\s\S]*?<\/style>/, '')
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
    // FIX: Added 'options' and 'print' arguments here
    print: (path, options, print) => {
      const node = path.getValue()

      if (node.type === 'root') {
        return join([hardline, hardline], path.map(print, 'children'))
      }

      return node.content || ''
    },

    embed: (path) => {
      const node = path.getValue()

      if (node.type === 'humn-script') {
        return async (textToDoc) => {
          const doc = await textToDoc(node.content, { parser: 'babel' })
          return group([
            '<script>',
            hardline,
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
            hardline,
            indent([hardline, doc]),
            hardline,
            '</style>',
          ])
        }
      }

      if (node.type === 'humn-template') {
        return async (textToDoc) => {
          return textToDoc(node.content, { parser: 'html' })
        }
      }

      return null
    },
  },
}
