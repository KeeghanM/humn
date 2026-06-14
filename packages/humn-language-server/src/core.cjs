const path = require('node:path')
const fs = require('node:fs')
const { fileURLToPath, pathToFileURL } = require('node:url')

const KEYWORDS = new Set([
  'as',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'let',
  'new',
  'null',
  'of',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
  'yield',
])

const HUMN_DOCS = {
  Cortex:
    'Creates a reactive state container. Define memory and change it through synapses.',
  persist:
    'Wraps a memory value so it is persisted to localStorage with a stable key.',
  resource:
    'Represents async server-owned state with loading, error and data states.',
  resourceSynapse:
    'Creates a Cortex synapse for loading async resource data safely.',
  onMount:
    'Runs a side effect after the component mounts. Use this for fetches and subscriptions.',
  onCleanup: 'Registers cleanup for effects created during component lifetime.',
  mount: 'Mounts a Humn component into a DOM element.',
}

const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

function parseHumn(source) {
  const sections = []
  const blockPattern = /<(script|style)\b[^>]*>/gi
  let match

  while ((match = blockPattern.exec(source)) !== null) {
    const type = match[1].toLowerCase()
    const openStart = match.index
    const openEnd = blockPattern.lastIndex
    const closePattern = new RegExp(`</${type}\\s*>`, 'gi')
    closePattern.lastIndex = openEnd
    const closeMatch = closePattern.exec(source)
    const closeStart = closeMatch ? closeMatch.index : source.length
    const closeEnd = closeMatch ? closePattern.lastIndex : source.length

    sections.push({
      type,
      start: openStart,
      end: closeEnd,
      openStart,
      openEnd,
      contentStart: openEnd,
      contentEnd: closeStart,
      closeStart,
      closeEnd,
      closed: Boolean(closeMatch),
    })

    blockPattern.lastIndex = closeEnd
  }

  const templateRanges = []
  let cursor = 0
  for (const section of sections) {
    if (cursor < section.openStart) {
      templateRanges.push({ start: cursor, end: section.openStart })
    }
    cursor = section.closeEnd
  }
  if (cursor < source.length) {
    templateRanges.push({ start: cursor, end: source.length })
  }

  const script = sections.find((section) => section.type === 'script') || null
  const style = sections.find((section) => section.type === 'style') || null
  const expressions = findTemplateExpressions(source, templateRanges)
  const tags = findTags(source, templateRanges, expressions)
  const imports = script ? parseImports(source, script) : []
  const declarations = script ? parseDeclarations(source, script) : []
  const symbols = buildSymbols(imports, declarations)

  return {
    sections,
    script,
    style,
    templateRanges,
    expressions,
    tags,
    imports,
    declarations,
    symbols,
  }
}

function isInRange(offset, range) {
  return offset >= range.start && offset <= range.end
}

function getRegionAtOffset(parsed, offset) {
  if (parsed.script && isInRange(offset, parsed.script)) return 'script'
  if (parsed.style && isInRange(offset, parsed.style)) return 'style'
  return 'template'
}

function findTemplateExpressions(source, ranges) {
  const expressions = []

  for (const range of ranges) {
    let offset = range.start
    while (offset < range.end) {
      if (source.startsWith('<!--', offset)) {
        const commentEnd = source.indexOf('-->', offset + 4)
        offset = commentEnd === -1 ? range.end : commentEnd + 3
        continue
      }

      if (source[offset] !== '{') {
        offset++
        continue
      }

      const end = findMatchingBrace(source, offset, range.end)
      if (end === -1) {
        expressions.push({
          start: offset,
          end: range.end,
          contentStart: offset + 1,
          contentEnd: range.end,
          closed: false,
        })
        break
      }

      expressions.push({
        start: offset,
        end: end + 1,
        contentStart: offset + 1,
        contentEnd: end,
        closed: true,
      })
      offset = end + 1
    }
  }

  return expressions
}

function findMatchingBrace(source, start, limit) {
  let depth = 1
  let quote = null
  let templateDepth = 0

  for (let offset = start + 1; offset < limit; offset++) {
    const char = source[offset]
    const previous = source[offset - 1]

    if (quote) {
      if (previous === '\\') continue
      if (quote === '`' && char === '$' && source[offset + 1] === '{') {
        templateDepth++
        offset++
        continue
      }
      if (quote === '`' && char === '}' && templateDepth > 0) {
        templateDepth--
        continue
      }
      if (char === quote && templateDepth === 0) quote = null
      continue
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }

    if (source.startsWith('//', offset)) {
      const lineEnd = source.indexOf('\n', offset + 2)
      offset = lineEnd === -1 ? limit : lineEnd
      continue
    }

    if (source.startsWith('/*', offset)) {
      const commentEnd = source.indexOf('*/', offset + 2)
      offset = commentEnd === -1 ? limit : commentEnd + 1
      continue
    }

    if (char === '{') depth++
    if (char === '}') depth--
    if (depth === 0) return offset
  }

  return -1
}

function findTags(source, ranges, expressions) {
  const tags = []
  const expressionRanges = expressions.map((expression) => ({
    start: expression.start,
    end: expression.end,
  }))
  const tagPattern = /<\/?\s*([A-Za-z][A-Za-z0-9:-]*)/g

  for (const range of ranges) {
    tagPattern.lastIndex = range.start
    let match
    while (
      (match = tagPattern.exec(source)) !== null &&
      match.index < range.end
    ) {
      if (
        expressionRanges.some(
          (expression) =>
            match.index >= expression.start && match.index < expression.end,
        )
      )
        continue
      if (source.startsWith('<!--', match.index)) continue

      const name = match[1]
      const tagEnd = source.indexOf('>', tagPattern.lastIndex)
      const end =
        tagEnd === -1 || tagEnd > range.end ? tagPattern.lastIndex : tagEnd + 1
      tags.push({
        name,
        start: match.index,
        end,
        nameStart: match.index + match[0].lastIndexOf(name),
        nameEnd: match.index + match[0].lastIndexOf(name) + name.length,
        closing: /^<\//.test(match[0]),
        selfClosing:
          tagEnd !== -1 &&
          source.slice(match.index, tagEnd).trimEnd().endsWith('/'),
        component: isComponentName(name),
      })
    }
  }

  return tags
}

function parseImports(source, script) {
  const imports = []
  const scriptSource = source.slice(script.contentStart, script.contentEnd)
  const importPattern = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g
  let match

  while ((match = importPattern.exec(scriptSource)) !== null) {
    const fullStart = script.contentStart + match.index
    const specifier = match[1].trim()
    const sourcePath = match[2]
    const sourceStart = fullStart + match[0].lastIndexOf(sourcePath)
    const symbols = []

    const defaultMatch = specifier.match(/^([A-Za-z_$][\w$]*)/)
    if (defaultMatch) {
      const local = defaultMatch[1]
      const localStart = fullStart + match[0].indexOf(local)
      symbols.push({
        name: local,
        imported: 'default',
        start: localStart,
        end: localStart + local.length,
      })
    }

    const namespaceMatch = specifier.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/)
    if (namespaceMatch) {
      const local = namespaceMatch[1]
      const localStart = fullStart + match[0].indexOf(local)
      symbols.push({
        name: local,
        imported: '*',
        start: localStart,
        end: localStart + local.length,
      })
    }

    const namedMatch = specifier.match(/\{([\s\S]*?)\}/)
    if (namedMatch) {
      const namedBase = fullStart + match[0].indexOf(namedMatch[1])
      const namedPattern = /([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?/g
      let named
      while ((named = namedPattern.exec(namedMatch[1])) !== null) {
        const local = named[2] || named[1]
        const imported = named[1]
        const localIndex = named.index + named[0].lastIndexOf(local)
        symbols.push({
          name: local,
          imported,
          start: namedBase + localIndex,
          end: namedBase + localIndex + local.length,
        })
      }
    }

    imports.push({
      source: sourcePath,
      sourceStart,
      sourceEnd: sourceStart + sourcePath.length,
      start: fullStart,
      end: fullStart + match[0].length,
      symbols,
    })
  }

  return imports
}

function parseDeclarations(source, script) {
  const declarations = []
  const scriptSource = source.slice(script.contentStart, script.contentEnd)
  const masked = maskStringsAndComments(scriptSource)

  collectMatches(
    masked,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,
    (match) => {
      const name = match[1]
      const start =
        script.contentStart + match.index + match[0].lastIndexOf(name)
      declarations.push({
        name,
        kind: 'variable',
        start,
        end: start + name.length,
      })
    },
  )

  collectMatches(masked, /\b(?:const|let|var)\s+\{([^}]+)\}/g, (match) => {
    const base = script.contentStart + match.index + match[0].indexOf(match[1])
    const memberPattern = /([A-Za-z_$][\w$]*)(?:\s*:\s*([A-Za-z_$][\w$]*))?/g
    let member
    while ((member = memberPattern.exec(match[1])) !== null) {
      const name = member[2] || member[1]
      const localIndex = member.index + member[0].lastIndexOf(name)
      declarations.push({
        name,
        kind: 'variable',
        start: base + localIndex,
        end: base + localIndex + name.length,
      })
    }
  })

  collectMatches(masked, /\bfunction\s+([A-Za-z_$][\w$]*)/g, (match) => {
    const name = match[1]
    const start = script.contentStart + match.index + match[0].lastIndexOf(name)
    declarations.push({
      name,
      kind: 'function',
      start,
      end: start + name.length,
    })
  })

  collectMatches(masked, /\bclass\s+([A-Za-z_$][\w$]*)/g, (match) => {
    const name = match[1]
    const start = script.contentStart + match.index + match[0].lastIndexOf(name)
    declarations.push({ name, kind: 'class', start, end: start + name.length })
  })

  return declarations
}

function collectMatches(source, pattern, callback) {
  let match
  while ((match = pattern.exec(source)) !== null) callback(match)
}

function maskStringsAndComments(source) {
  let output = ''
  let offset = 0

  while (offset < source.length) {
    const char = source[offset]
    if (source.startsWith('//', offset)) {
      const end = source.indexOf('\n', offset + 2)
      const stop = end === -1 ? source.length : end
      output += ' '.repeat(stop - offset)
      offset = stop
      continue
    }
    if (source.startsWith('/*', offset)) {
      const end = source.indexOf('*/', offset + 2)
      const stop = end === -1 ? source.length : end + 2
      output += ' '.repeat(stop - offset)
      offset = stop
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      const start = offset
      const quote = char
      offset++
      while (offset < source.length) {
        if (source[offset] === '\\') {
          offset += 2
          continue
        }
        if (source[offset] === quote) {
          offset++
          break
        }
        offset++
      }
      output += ' '.repeat(offset - start)
      continue
    }
    output += char
    offset++
  }

  return output
}

function buildSymbols(imports, declarations) {
  const symbols = new Map()
  for (const item of imports) {
    for (const symbol of item.symbols) {
      symbols.set(symbol.name, {
        ...symbol,
        kind: isComponentName(symbol.name) ? 'component' : 'import',
        import: item,
      })
    }
  }
  for (const declaration of declarations) {
    if (!symbols.has(declaration.name))
      symbols.set(declaration.name, declaration)
  }
  return symbols
}

function createVirtualTypescript(source, parsed) {
  const chars = Array.from(source, (char) =>
    char === '\n' || char === '\r' ? char : ' ',
  )

  if (parsed.script) {
    copyRange(
      source,
      chars,
      parsed.script.contentStart,
      parsed.script.contentEnd,
    )
  }

  for (const expression of parsed.expressions) {
    chars[expression.start] = ';'
    copyRange(source, chars, expression.contentStart, expression.contentEnd)
    if (expression.closed) chars[expression.end - 1] = ';'
  }

  return chars.join('')
}

function copyRange(source, chars, start, end) {
  for (let offset = start; offset < end; offset++)
    chars[offset] = source[offset]
}

function getIdentifierAt(source, offset) {
  if (offset < 0 || offset > source.length) return null
  let start = offset
  if (!/[A-Za-z0-9_$]/.test(source[start]) && start > 0) start--
  if (!/[A-Za-z_$]/.test(source[start]) && !/[0-9]/.test(source[start]))
    return null
  while (start > 0 && /[A-Za-z0-9_$]/.test(source[start - 1])) start--
  let end = start
  while (end < source.length && /[A-Za-z0-9_$]/.test(source[end])) end++
  const name = source.slice(start, end)
  if (!/^[A-Za-z_$]/.test(name) || KEYWORDS.has(name)) return null
  return { name, start, end }
}

function getComponentTagAt(parsed, offset) {
  return (
    parsed.tags.find(
      (tag) =>
        tag.component && offset >= tag.nameStart && offset <= tag.nameEnd,
    ) || null
  )
}

function findIdentifierOccurrences(source, parsed, name) {
  const ranges = []
  const searchable = []

  if (parsed.script)
    searchable.push({
      start: parsed.script.contentStart,
      end: parsed.script.contentEnd,
    })
  for (const expression of parsed.expressions)
    searchable.push({
      start: expression.contentStart,
      end: expression.contentEnd,
    })

  const pattern = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'g')
  for (const range of searchable) {
    const searchableSource = maskStringsAndComments(
      source.slice(range.start, range.end),
    )
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(searchableSource)) !== null) {
      if (KEYWORDS.has(match[0])) continue
      ranges.push({
        start: range.start + match.index,
        end: range.start + match.index + name.length,
      })
    }
  }

  return ranges
}

function getSemanticTokens(source, parsed) {
  const tokens = []

  for (const token of getIdentifierTokens(source, parsed)) {
    tokens.push(token)
  }

  for (const tag of parsed.tags) {
    if (tag.component)
      tokens.push({ start: tag.nameStart, end: tag.nameEnd, type: 'class' })
  }

  return tokens.sort(
    (left, right) => left.start - right.start || left.end - right.end,
  )
}

function getIdentifierTokens(source, parsed) {
  const ranges = []
  if (parsed.script)
    ranges.push({
      start: parsed.script.contentStart,
      end: parsed.script.contentEnd,
    })
  for (const expression of parsed.expressions)
    ranges.push({ start: expression.contentStart, end: expression.contentEnd })

  const tokens = []
  const pattern = /\b[A-Za-z_$][\w$]*\b/g
  for (const range of ranges) {
    const searchableSource = maskStringsAndComments(
      source.slice(range.start, range.end),
    )
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(searchableSource)) !== null) {
      const name = match[0]
      if (KEYWORDS.has(name)) continue
      const tokenStart = range.start + match.index
      const previous = previousNonWhitespace(source, tokenStart)
      const symbol = parsed.symbols.get(name)
      let type = 'variable'
      if (previous === '.') type = 'property'
      else if (symbol?.kind === 'function') type = 'function'
      else if (symbol?.kind === 'class' || symbol?.kind === 'component')
        type = 'class'
      tokens.push({ start: tokenStart, end: tokenStart + name.length, type })
    }
  }
  return tokens
}

function previousNonWhitespace(source, offset) {
  let cursor = offset - 1
  while (cursor >= 0 && /\s/.test(source[cursor])) cursor--
  return source[cursor]
}

function getDiagnostics(source, parsed) {
  const diagnostics = []

  for (const section of parsed.sections) {
    if (!section.closed) {
      diagnostics.push({
        start: section.openStart,
        end: section.openEnd,
        severity: 1,
        message: `Missing closing </${section.type}> tag.`,
        source: 'humn',
      })
    }
  }

  for (const expression of parsed.expressions) {
    if (!expression.closed) {
      diagnostics.push({
        start: expression.start,
        end: expression.end,
        severity: 1,
        message: 'Unclosed Humn template expression.',
        source: 'humn',
      })
    }
  }

  diagnostics.push(...getTagDiagnostics(parsed))
  diagnostics.push(...getComponentDiagnostics(parsed))
  if (parsed.script) diagnostics.push(...getScriptDiagnostics(source, parsed))

  return diagnostics
}

function getTagDiagnostics(parsed) {
  const diagnostics = []
  const stack = []

  for (const tag of parsed.tags) {
    const normalized = tag.name.toLowerCase()
    if (!tag.closing && !tag.selfClosing && !VOID_TAGS.has(normalized)) {
      stack.push(tag)
      continue
    }

    if (!tag.closing) continue

    const previous = stack.pop()
    if (!previous || previous.name !== tag.name) {
      diagnostics.push({
        start: tag.nameStart,
        end: tag.nameEnd,
        severity: 1,
        message: `Closing tag </${tag.name}> does not match an open tag.`,
        source: 'humn',
      })
      if (previous) stack.push(previous)
    }
  }

  for (const tag of stack) {
    diagnostics.push({
      start: tag.nameStart,
      end: tag.nameEnd,
      severity: 2,
      message: `Unclosed <${tag.name}> tag.`,
      source: 'humn',
    })
  }

  return diagnostics
}

function getComponentDiagnostics(parsed) {
  const diagnostics = []
  for (const tag of parsed.tags) {
    if (!tag.component || tag.closing) continue
    if (!parsed.symbols.has(tag.name)) {
      diagnostics.push({
        start: tag.nameStart,
        end: tag.nameEnd,
        severity: 2,
        message: `Component <${tag.name}> is used but not imported or declared.`,
        source: 'humn',
      })
    }
  }
  return diagnostics
}

function getScriptDiagnostics(source, parsed) {
  const diagnostics = []
  const scriptSource = source.slice(
    parsed.script.contentStart,
    parsed.script.contentEnd,
  )
  const masked = maskNestedBodies(maskStringsAndComments(scriptSource))
  const sideEffectPattern =
    /\b(fetch|setInterval|setTimeout|addEventListener|removeEventListener|WebSocket)\s*\(/g
  let match

  while ((match = sideEffectPattern.exec(masked)) !== null) {
    const start = parsed.script.contentStart + match.index
    diagnostics.push({
      start,
      end: start + match[1].length,
      severity: 2,
      message: `${match[1]} runs in the component render path. Move side effects into onMount() or a Cortex/resource synapse.`,
      source: 'humn',
    })
  }

  const cortexPattern = /new\s+Cortex\s*\(/g
  while ((match = cortexPattern.exec(masked)) !== null) {
    const start = parsed.script.contentStart + match.index
    diagnostics.push({
      start,
      end: start + 'new Cortex'.length,
      severity: 2,
      message:
        'Create Cortex instances in shared modules, not inside component scripts.',
      source: 'humn',
    })
  }

  return diagnostics
}

function maskNestedBodies(source) {
  const chars = source.split('')
  let depth = 0
  for (let offset = 0; offset < chars.length; offset++) {
    if (chars[offset] === '{') {
      depth++
      continue
    }
    if (chars[offset] === '}') {
      depth = Math.max(0, depth - 1)
      continue
    }
    if (depth > 0 && chars[offset] !== '\n' && chars[offset] !== '\r')
      chars[offset] = ' '
  }
  return chars.join('')
}

function resolveImportPath(documentUri, importSource) {
  if (!importSource.startsWith('.')) return null
  const documentPath = uriToPath(documentUri)
  if (!documentPath) return null
  const base = path.resolve(path.dirname(documentPath), importSource)
  const candidates = [
    base,
    `${base}.humn`,
    `${base}.js`,
    `${base}.ts`,
    path.join(base, 'index.js'),
    path.join(base, 'index.ts'),
  ]
  return (
    candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0]
  )
}

function getComponentNameFromPath(filePath) {
  return path
    .basename(filePath, path.extname(filePath))
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function getRelativeImportSource(documentUri, targetPath) {
  const documentPath = uriToPath(documentUri)
  if (!documentPath) return null

  let importSource = path
    .relative(path.dirname(documentPath), targetPath)
    .replace(/\\/g, '/')
  if (!importSource.startsWith('.')) importSource = `./${importSource}`
  return importSource
}

function uriToPath(uri) {
  try {
    return fileURLToPath(uri)
  } catch {
    return null
  }
}

function pathToUri(filePath) {
  return pathToFileURL(filePath).toString()
}

function isComponentName(name) {
  return /^[A-Z]/.test(name)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

module.exports = {
  HUMN_DOCS,
  createVirtualTypescript,
  findIdentifierOccurrences,
  getComponentTagAt,
  getComponentNameFromPath,
  getDiagnostics,
  getIdentifierAt,
  getRegionAtOffset,
  getRelativeImportSource,
  getSemanticTokens,
  parseHumn,
  pathToUri,
  resolveImportPath,
  uriToPath,
}
