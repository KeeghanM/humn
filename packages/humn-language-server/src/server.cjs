#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const {
  CompletionItemKind,
  DiagnosticSeverity,
  DocumentSymbol,
  InsertTextFormat,
  Location,
  MarkupKind,
  ProposedFeatures,
  Range,
  SemanticTokensBuilder,
  SemanticTokensRegistrationType,
  SymbolKind,
  TextDocumentPositionParams,
  TextDocuments,
  TextDocumentSyncKind,
  TextEdit,
  createConnection,
} = require('vscode-languageserver/node')
const { TextDocument } = require('vscode-languageserver-textdocument')
const {
  HUMN_DOCS,
  createVirtualTypescript,
  findIdentifierOccurrences,
  getComponentTagAt,
  getDiagnostics,
  getIdentifierAt,
  getSemanticTokens,
  parseHumn,
  pathToUri,
  resolveImportPath,
  uriToPath,
} = require('./core.cjs')

const connection = createConnection(ProposedFeatures.all)
const documents = new TextDocuments(TextDocument)
const semanticLegend = {
  tokenTypes: ['variable', 'function', 'class', 'property'],
  tokenModifiers: [],
}

const documentCache = new Map()

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: {
      resolveProvider: false,
      triggerCharacters: ['<', '{', '.', '/'],
    },
    definitionProvider: true,
    hoverProvider: true,
    referencesProvider: true,
    renameProvider: {
      prepareProvider: true,
    },
    documentSymbolProvider: true,
    semanticTokensProvider: {
      legend: semanticLegend,
      full: true,
    },
  },
}))

documents.onDidChangeContent((change) => validateDocument(change.document))
documents.onDidClose((event) => {
  documentCache.delete(event.document.uri)
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] })
})

connection.onCompletion((params) => {
  const document = documents.get(params.textDocument.uri)
  if (!document) return []

  const context = getDocumentContext(document)
  const offset = document.offsetAt(params.position)
  const previous = document.getText().slice(Math.max(0, offset - 2), offset)
  const items = []

  if (previous.endsWith('<')) {
    for (const symbol of context.parsed.symbols.values()) {
      if (symbol.kind !== 'component') continue
      items.push({
        label: symbol.name,
        kind: CompletionItemKind.Class,
        detail: 'Imported Humn component',
        documentation: symbol.import?.source,
      })
    }
    return items
  }

  if (isInScriptOrExpression(context.parsed, offset)) {
    items.push(...getTypescriptCompletions(document, context, offset))
    for (const [name, documentation] of Object.entries(HUMN_DOCS)) {
      items.push({
        label: name,
        kind: CompletionItemKind.Function,
        documentation,
      })
    }
    return dedupeCompletions(items)
  }

  if (previous.endsWith('{')) {
    for (const symbol of context.parsed.symbols.values()) {
      items.push({
        label: symbol.name,
        kind: toCompletionKind(symbol.kind),
        detail: `Humn ${symbol.kind}`,
      })
    }
  }

  return dedupeCompletions(items)
})

connection.onDefinition((params) => {
  const document = documents.get(params.textDocument.uri)
  if (!document) return null

  const context = getDocumentContext(document)
  const source = document.getText()
  const offset = document.offsetAt(params.position)
  const componentTag = getComponentTagAt(context.parsed, offset)

  if (componentTag) {
    const symbol = context.parsed.symbols.get(componentTag.name)
    const target = symbol?.import
      ? resolveImportPath(document.uri, symbol.import.source)
      : null
    if (target)
      return Location.create(pathToUri(target), Range.create(0, 0, 0, 0))
  }

  const identifier = getIdentifierAt(source, offset)
  if (identifier) {
    const local = getLocalDefinition(document, context, identifier.name)
    if (local) return local
  }

  return getTypescriptDefinition(document, context, offset)
})

connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri)
  if (!document) return null

  const context = getDocumentContext(document)
  const source = document.getText()
  const offset = document.offsetAt(params.position)
  const componentTag = getComponentTagAt(context.parsed, offset)

  if (componentTag) {
    const symbol = context.parsed.symbols.get(componentTag.name)
    if (!symbol) return null
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${componentTag.name}**\n\nImported from \`${symbol.import.source}\`.`,
      },
    }
  }

  const identifier = getIdentifierAt(source, offset)
  if (identifier && HUMN_DOCS[identifier.name]) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**${identifier.name}**\n\n${HUMN_DOCS[identifier.name]}`,
      },
    }
  }

  const quickInfo = context.languageService.getQuickInfoAtPosition(
    context.fileName,
    offset,
  )
  if (!quickInfo) return null

  const display = ts.displayPartsToString(quickInfo.displayParts || [])
  const docs = ts.displayPartsToString(quickInfo.documentation || [])
  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: ['```ts', display, '```', docs].filter(Boolean).join('\n'),
    },
  }
})

connection.onReferences((params) => {
  const document = documents.get(params.textDocument.uri)
  if (!document) return []

  const context = getDocumentContext(document)
  const source = document.getText()
  const offset = document.offsetAt(params.position)
  const tag = getComponentTagAt(context.parsed, offset)
  const name = tag?.name || getIdentifierAt(source, offset)?.name
  if (!name) return []

  const ranges = tag
    ? getComponentTagRanges(context.parsed, name)
    : findIdentifierOccurrences(source, context.parsed, name)
  return ranges.map((range) =>
    Location.create(document.uri, toRange(document, range.start, range.end)),
  )
})

connection.onPrepareRename((params) => {
  const document = documents.get(params.textDocument.uri)
  if (!document) return null

  const context = getDocumentContext(document)
  const source = document.getText()
  const offset = document.offsetAt(params.position)
  const tag = getComponentTagAt(context.parsed, offset)
  if (tag) return toRange(document, tag.nameStart, tag.nameEnd)
  const identifier = getIdentifierAt(source, offset)
  if (!identifier) return null
  return toRange(document, identifier.start, identifier.end)
})

connection.onRenameRequest((params) => {
  const document = documents.get(params.textDocument.uri)
  if (!document) return null

  const context = getDocumentContext(document)
  const source = document.getText()
  const offset = document.offsetAt(params.position)
  const tag = getComponentTagAt(context.parsed, offset)
  const identifier = tag || getIdentifierAt(source, offset)
  if (!identifier) return null

  const ranges = tag
    ? getComponentTagRanges(context.parsed, tag.name)
    : findIdentifierOccurrences(source, context.parsed, identifier.name)
  return {
    changes: {
      [document.uri]: ranges.map((range) =>
        TextEdit.replace(
          toRange(document, range.start, range.end),
          params.newName,
        ),
      ),
    },
  }
})

connection.onDocumentSymbol((params) => {
  const document = documents.get(params.textDocument.uri)
  if (!document) return []
  const context = getDocumentContext(document)
  const symbols = []

  if (context.parsed.script) {
    symbols.push(
      DocumentSymbol.create(
        'script',
        'Humn script',
        SymbolKind.Module,
        toRange(
          document,
          context.parsed.script.start,
          context.parsed.script.end,
        ),
        toRange(
          document,
          context.parsed.script.openStart,
          context.parsed.script.openEnd,
        ),
      ),
    )
  }
  for (const declaration of context.parsed.declarations) {
    symbols.push(
      DocumentSymbol.create(
        declaration.name,
        declaration.kind,
        toSymbolKind(declaration.kind),
        toRange(document, declaration.start, declaration.end),
        toRange(document, declaration.start, declaration.end),
      ),
    )
  }
  if (context.parsed.templateRanges.length) {
    const start = context.parsed.templateRanges[0].start
    const end = context.parsed.templateRanges.at(-1).end
    symbols.push(
      DocumentSymbol.create(
        'template',
        'Humn template',
        SymbolKind.Namespace,
        toRange(document, start, end),
        toRange(document, start, Math.min(end, start + 1)),
      ),
    )
  }
  if (context.parsed.style) {
    symbols.push(
      DocumentSymbol.create(
        'style',
        'Humn style',
        SymbolKind.Module,
        toRange(document, context.parsed.style.start, context.parsed.style.end),
        toRange(
          document,
          context.parsed.style.openStart,
          context.parsed.style.openEnd,
        ),
      ),
    )
  }

  return symbols
})

connection.languages.semanticTokens.on((params) => {
  const document = documents.get(params.textDocument.uri)
  if (!document) return { data: [] }
  const context = getDocumentContext(document)
  const builder = new SemanticTokensBuilder()
  const tokenTypeIndexes = new Map(
    semanticLegend.tokenTypes.map((type, index) => [type, index]),
  )

  for (const token of getSemanticTokens(document.getText(), context.parsed)) {
    const start = document.positionAt(token.start)
    builder.push(
      start.line,
      start.character,
      token.end - token.start,
      tokenTypeIndexes.get(token.type) || 0,
      0,
    )
  }

  return builder.build()
})

function validateDocument(document) {
  const context = getDocumentContext(document)
  const diagnostics = getDiagnostics(document.getText(), context.parsed).map(
    (diagnostic) => ({
      range: toRange(document, diagnostic.start, diagnostic.end),
      severity:
        diagnostic.severity === 1
          ? DiagnosticSeverity.Error
          : DiagnosticSeverity.Warning,
      message: diagnostic.message,
      source: diagnostic.source,
    }),
  )

  for (const diagnostic of getTypescriptDiagnostics(document, context)) {
    diagnostics.push(diagnostic)
  }

  connection.sendDiagnostics({ uri: document.uri, diagnostics })
}

function getDocumentContext(document) {
  const cached = documentCache.get(document.uri)
  if (cached?.version === document.version) return cached

  const source = document.getText()
  const parsed = parseHumn(source)
  const virtualSource = createVirtualTypescript(source, parsed)
  const filePath =
    uriToPath(document.uri) || `/${encodeURIComponent(document.uri)}.humn`
  const fileName = `${filePath}.tsx`
  const shimFileName = path.join(path.dirname(fileName), '__humn-shim.d.ts')
  const files = new Map([
    [fileName, { version: String(document.version), content: virtualSource }],
    [
      shimFileName,
      {
        version: '1',
        content:
          "declare module '*.humn' { const component: any; export default component }\ndeclare namespace JSX { interface IntrinsicElements { [name: string]: any } }\n",
      },
    ],
  ])
  const languageService = createLanguageService(files)
  const context = {
    version: document.version,
    parsed,
    virtualSource,
    fileName,
    languageService,
  }
  documentCache.set(document.uri, context)
  return context
}

function createLanguageService(files) {
  const compilerOptions = {
    allowJs: true,
    checkJs: true,
    jsx: ts.JsxEmit.Preserve,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    noEmit: true,
    allowNonTsExtensions: true,
  }

  const host = {
    getCompilationSettings: () => compilerOptions,
    getCurrentDirectory: () => process.cwd(),
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    getScriptFileNames: () => Array.from(files.keys()),
    getScriptVersion: (fileName) => files.get(fileName)?.version || '1',
    getScriptSnapshot(fileName) {
      const file = files.get(fileName)
      if (file) return ts.ScriptSnapshot.fromString(file.content)
      if (fs.existsSync(fileName))
        return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, 'utf8'))
      return undefined
    },
    fileExists: (fileName) => files.has(fileName) || fs.existsSync(fileName),
    readFile: (fileName) =>
      files.get(fileName)?.content ||
      (fs.existsSync(fileName) ? fs.readFileSync(fileName, 'utf8') : undefined),
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  }

  return ts.createLanguageService(host)
}

function getTypescriptCompletions(document, context, offset) {
  const completions = context.languageService.getCompletionsAtPosition(
    context.fileName,
    offset,
    {
      includeExternalModuleExports: true,
      includeInsertTextCompletions: true,
    },
  )
  if (!completions) return []
  return completions.entries.slice(0, 80).map((entry) => ({
    label: entry.name,
    kind: toCompletionItemKind(entry.kind),
    detail: entry.source,
    insertText: entry.insertText,
    insertTextFormat: entry.isSnippet
      ? InsertTextFormat.Snippet
      : InsertTextFormat.PlainText,
  }))
}

function getTypescriptDefinition(document, context, offset) {
  const definitions =
    context.languageService.getDefinitionAtPosition(context.fileName, offset) ||
    []
  return definitions.map((definition) => {
    if (definition.fileName === context.fileName) {
      return Location.create(
        document.uri,
        toRange(
          document,
          definition.textSpan.start,
          definition.textSpan.start + definition.textSpan.length,
        ),
      )
    }
    return Location.create(
      pathToUri(definition.fileName),
      toExternalRange(
        definition.fileName,
        definition.textSpan.start,
        definition.textSpan.start + definition.textSpan.length,
      ),
    )
  })
}

function getTypescriptDiagnostics(document, context) {
  return [
    ...context.languageService.getSyntacticDiagnostics(context.fileName),
    ...context.languageService.getSemanticDiagnostics(context.fileName),
  ]
    .filter(
      (diagnostic) =>
        typeof diagnostic.start === 'number' &&
        typeof diagnostic.length === 'number',
    )
    .filter((diagnostic) =>
      isInScriptOrExpression(context.parsed, diagnostic.start),
    )
    .map((diagnostic) => ({
      range: toRange(
        document,
        diagnostic.start,
        diagnostic.start + diagnostic.length,
      ),
      severity: DiagnosticSeverity.Warning,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      source: 'typescript',
    }))
}

function getLocalDefinition(document, context, name) {
  const symbol = context.parsed.symbols.get(name)
  if (!symbol) return null
  if (symbol.import) {
    const target = resolveImportPath(document.uri, symbol.import.source)
    if (target)
      return Location.create(pathToUri(target), Range.create(0, 0, 0, 0))
  }
  return Location.create(
    document.uri,
    toRange(document, symbol.start, symbol.end),
  )
}

function getComponentTagRanges(parsed, name) {
  const ranges = parsed.tags
    .filter((tag) => tag.name === name)
    .map((tag) => ({ start: tag.nameStart, end: tag.nameEnd }))
  const symbol = parsed.symbols.get(name)
  if (symbol) ranges.push({ start: symbol.start, end: symbol.end })
  return ranges
}

function isInScriptOrExpression(parsed, offset) {
  if (
    parsed.script &&
    offset >= parsed.script.contentStart &&
    offset <= parsed.script.contentEnd
  )
    return true
  return parsed.expressions.some(
    (expression) =>
      offset >= expression.contentStart && offset <= expression.contentEnd,
  )
}

function toRange(document, start, end) {
  return Range.create(document.positionAt(start), document.positionAt(end))
}

function toExternalRange(fileName, start, end) {
  const text = fs.existsSync(fileName) ? fs.readFileSync(fileName, 'utf8') : ''
  const document = TextDocument.create(
    pathToUri(fileName),
    'typescript',
    1,
    text,
  )
  return Range.create(document.positionAt(start), document.positionAt(end))
}

function toCompletionKind(kind) {
  if (kind === 'function') return CompletionItemKind.Function
  if (kind === 'component' || kind === 'class') return CompletionItemKind.Class
  return CompletionItemKind.Variable
}

function toCompletionItemKind(kind) {
  if (
    kind === ts.ScriptElementKind.functionElement ||
    kind === ts.ScriptElementKind.memberFunctionElement
  )
    return CompletionItemKind.Function
  if (kind === ts.ScriptElementKind.classElement)
    return CompletionItemKind.Class
  if (
    kind === ts.ScriptElementKind.memberVariableElement ||
    kind === ts.ScriptElementKind.memberGetAccessorElement
  )
    return CompletionItemKind.Property
  if (
    kind === ts.ScriptElementKind.constElement ||
    kind === ts.ScriptElementKind.letElement ||
    kind === ts.ScriptElementKind.variableElement
  )
    return CompletionItemKind.Variable
  return CompletionItemKind.Text
}

function toSymbolKind(kind) {
  if (kind === 'function') return SymbolKind.Function
  if (kind === 'class' || kind === 'component') return SymbolKind.Class
  return SymbolKind.Variable
}

function dedupeCompletions(items) {
  const seen = new Set()
  return items.filter((item) => {
    if (seen.has(item.label)) return false
    seen.add(item.label)
    return true
  })
}

documents.listen(connection)
connection.listen()
