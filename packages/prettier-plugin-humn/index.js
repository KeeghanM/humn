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

      return {
        type: 'root',
        script: scriptMatch ? scriptMatch[1] : '',
        style: styleMatch ? styleMatch[1] : '',
        template: text
          .replace(/<script>[\s\S]*?<\/script>/, '')
          .replace(/<style>[\s\S]*?<\/style>/, ''),
      }
    },
    locStart: () => 0,
    locEnd: () => 0,
  },
}

export const printers = {
  'humn-ast': {
    embed: (path, options) => {
      const node = path.getValue()

      return async (textToDoc) => {
        const parts = []

        if (node.script) {
          const formattedScript = await textToDoc(node.script, {
            parser: 'babel',
          })
          parts.push(
            group([
              '<script>',
              hardline,
              indent([hardline, formattedScript]),
              hardline,
              '</script>',
            ]),
          )
        }

        if (node.template) {
          const formattedTemplate = await textToDoc(node.template, {
            parser: 'html',
          })
          parts.push(formattedTemplate)
        }

        if (node.style) {
          const formattedStyle = await textToDoc(node.style, {
            parser: 'css',
          })
          parts.push(
            group([
              '<style>',
              hardline,
              indent([hardline, formattedStyle]),
              hardline,
              '</style>',
            ]),
          )
        }

        return join([hardline, hardline], parts)
      }
    },
    print: (path) => path.getValue(),
  },
}
