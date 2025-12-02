import { parsers as babelParsers } from 'prettier/parser-babel'
import { parsers as htmlParsers } from 'prettier/parser-html'
import { parsers as cssParsers } from 'prettier/parser-postcss'

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
    parse: (text, options) => {
      // 1. Reuse your own compiler logic here!
      // You already wrote regexes in `compiler/index.js` to split the file.
      const scriptMatch = text.match(/<script>([\s\S]*?)<\/script>/)
      const styleMatch = text.match(/<style>([\s\S]*?)<\/style>/)

      // 2. Extract content
      return {
        type: 'root',
        script: scriptMatch ? scriptMatch[1] : null,
        style: styleMatch ? styleMatch[1] : null,
        // Remove script/style tags to get just the template for processing
        template: text
          .replace(/<script>[\s\S]*?<\/script>/, '')
          .replace(/<style>[\s\S]*?<\/style>/, '')
          .trim(),
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

      const parts = []

      // 1. Format Script (JS)
      if (node.script) {
        const formattedScript = prettier
          .format(node.script, {
            ...options,
            parser: 'babel',
          })
          .trim()
        parts.push(`<script>\n${formattedScript}\n</script>`)
      }

      // 2. Format Template (HTML with Expressions)
      if (node.template) {
        // TRICKY BIT: To format HTML with { js } inside, you can either:
        // A) Use 'prettier/parser-html' directly if your {} usage is "safe" enough
        // B) Temporarily replace { logic } with UUIDs, format HTML, then swap back.

        // For MVP, simple HTML formatting often works:
        const formattedHTML = prettier
          .format(node.template, {
            ...options,
            parser: 'html',
          })
          .trim()
        parts.push(formattedHTML)
      }

      // 3. Format Style (CSS)
      if (node.style) {
        const formattedStyle = prettier
          .format(node.style, {
            ...options,
            parser: 'css',
          })
          .trim()
        parts.push(`<style>\n${formattedStyle}\n</style>`)
      }

      return parts.join('\n\n')
    },
  },
}
