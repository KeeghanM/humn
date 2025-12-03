import { doc } from 'prettier'

const { group, hardline, indent, join } = doc.builders
const { mapDoc } = doc.utils

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
      const scriptMatch = text.match(/<script[^>]*>([\s\S]*?)<\/script>/)
      const styleMatch = text.match(/<style[^>]*>([\s\S]*?)<\/style>/)

      const template = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/, '')
        .trim()

      return {
        type: 'root',
        script: scriptMatch ? scriptMatch[1] : '',
        style: styleMatch ? styleMatch[1] : '',
        template,
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

      if (node.type === 'root') {
        const parts = []

        if (node.script) {
          parts.push(path.call(print, 'script'))
        }

        if (node.template) {
          parts.push(path.call(print, 'template'))
        }

        if (node.style) {
          parts.push(path.call(print, 'style'))
        }

        return group(join([hardline, hardline], parts))
      }

      return node.content || ''
    },

    embed: (path) => {
      const parent = path.getParentNode()
      const name = path.getName()
      const node = path.getValue()

      if (parent.type !== 'root') return null

      if (name === 'script' && node) {
        return async (textToDoc) => {
          const doc = await textToDoc(node, { parser: 'babel' })
          return group([
            '<script>',
            indent([hardline, doc]),
            hardline,
            '</script>',
          ])
        }
      }

      if (name === 'style' && node) {
        return async (textToDoc) => {
          const doc = await textToDoc(node, { parser: 'css' })
          return group([
            '<style>',
            indent([hardline, doc]),
            hardline,
            '</style>',
          ])
        }
      }

      if (name === 'template' && node) {
        return async (textToDoc) => {
          const doc = await textToDoc(`<>${node}</>`, {
            parser: 'babel',
            semi: false,
          })

          return stripFragmentWrapper(doc)
        }
      }

      return null
    },
  },
}

function stripFragmentWrapper(doc) {
  // Remove the wrapper strings immediately.
  // This guarantees that ;<> and </> will be gone, even if the unwrap fails.
  const cleanDoc = mapDoc(doc, (node) => {
    if (
      typeof node === 'string' &&
      (node === ';<>' || node === '<>' || node === '</>')
    ) {
      return ''
    }
    return node
  })

  // We look for the first 'indent' node, which contains the actual template.
  const indentContent = findFirstIndentContent(cleanDoc)

  if (indentContent) {
    // The content inside the Babel fragment usually starts with a hardline.
    // We remove it (slice 1) so the code doesn't start with an empty line.
    if (Array.isArray(indentContent) && indentContent[0]?.type === 'line') {
      return indentContent.slice(1)
    }
    return indentContent
  }

  // Fallback: If we couldn't find the indent structure, return the doc
  // with the strings removed. It might be indented by 2 extra spaces,
  // but at least the ugly tags are gone.
  return cleanDoc
}

// Helper to recursively find the main content payload
function findFirstIndentContent(node) {
  if (!node) return null

  // Found it! Return the contents.
  if (node.type === 'indent') {
    return node.contents
  }

  // Dig deeper into groups, aligns, or labels
  if (node.type === 'group' || node.type === 'align' || node.type === 'label') {
    return findFirstIndentContent(node.contents)
  }

  // Check array children
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findFirstIndentContent(child)
      if (found) return found
    }
  }

  // Check 'concat' parts (sometimes used in Prettier ASTs)
  if (node.type === 'concat' && Array.isArray(node.parts)) {
    for (const child of node.parts) {
      const found = findFirstIndentContent(child)
      if (found) return found
    }
  }

  return null
}
