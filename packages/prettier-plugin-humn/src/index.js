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
        return async (textToDoc) => {
          const doc = await textToDoc(`<>${node.content}</>`, {
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
