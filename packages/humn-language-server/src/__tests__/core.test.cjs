const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const ts = require('typescript')

const {
  createVirtualTypescript,
  findIdentifierOccurrences,
  getComponentTagAt,
  getComponentNameFromPath,
  getDiagnostics,
  getRegionAtOffset,
  getRelativeImportSource,
  getSemanticTokens,
  parseHumn,
  pathToUri,
} = require('../core.cjs')

const source = `<script>
  import Button from '../components/Button.humn'
  const { staff } = crmCortex.memory
  const handleSubmit = async (event) => {
    const data = new FormData(event.target.closest('form'))
    const contacts = []
    const contactName = data.get('contactName')

    if (contactName) {
      contacts.push({ name: contactName })
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <Button label={contactName} />
  {contacts.map((contact) => <span>{contact.name}</span>)}
</form>
`

const parsed = parseHumn(source)

assert.equal(parsed.imports.length, 1)
assert.equal(parsed.imports[0].symbols[0].name, 'Button')
assert.equal(
  parsed.declarations.some(
    (declaration) => declaration.name === 'handleSubmit',
  ),
  true,
)
assert.equal(parsed.expressions.length, 3)

const templateOffset = source.indexOf('handleSubmit}>')
assert.equal(getRegionAtOffset(parsed, templateOffset), 'template')

const componentOffset = source.indexOf('Button label')
const componentTag = getComponentTagAt(parsed, componentOffset)
assert.equal(componentTag.name, 'Button')

const occurrences = findIdentifierOccurrences(source, parsed, 'contactName')
assert.equal(occurrences.length >= 4, true)

const semanticTokens = getSemanticTokens(source, parsed)
const semanticTokenNames = semanticTokens.map((token) =>
  source.slice(token.start, token.end),
)
assert.equal(semanticTokenNames.includes('contacts'), true)
assert.equal(semanticTokenNames.includes('staff'), false)
assert.equal(
  semanticTokens.some(
    (token) =>
      source.slice(token.start, token.end) === 'Button' &&
      token.type === 'class',
  ),
  true,
)
assert.equal(semanticTokenNames.includes('components'), false)

const virtualSource = createVirtualTypescript(source, parsed)
assert.equal(virtualSource.includes('const handleSubmit'), true)
assert.equal(virtualSource.includes('contacts.map'), true)
assert.equal(virtualSource.includes('<form'), false)

const arrowAttributeSource = `<script>
  const setOpen = (open) => open
</script>

<button onclick={() => setOpen(true)}>Open</button>
`
const arrowAttributeParsed = parseHumn(arrowAttributeSource)
const arrowAttributeVirtualSource = createVirtualTypescript(
  arrowAttributeSource,
  arrowAttributeParsed,
)
const arrowAttributeFile = ts.createSourceFile(
  'arrow-attribute.tsx',
  arrowAttributeVirtualSource,
  ts.ScriptTarget.ES2022,
  true,
  ts.ScriptKind.TSX,
)
assert.equal(arrowAttributeFile.parseDiagnostics.length, 0)

const diagnostics = getDiagnostics(
  `<script>
  fetch('/accounts')
</script>

<Missing />`,
  parseHumn(`<script>
  fetch('/accounts')
</script>

<Missing />`),
)
assert.equal(
  diagnostics.some((diagnostic) => diagnostic.message.includes('fetch runs')),
  true,
)
assert.equal(
  diagnostics.some((diagnostic) => diagnostic.message.includes('Missing')),
  true,
)

assert.equal(
  getComponentNameFromPath('/project/src/components/chat-window.humn'),
  'ChatWindow',
)
assert.equal(
  getRelativeImportSource(
    pathToUri(path.resolve('/project/src/app.humn')),
    path.resolve('/project/src/components/chat-window.humn'),
  ),
  './components/chat-window.humn',
)

// Comments in imports should be ignored
const commentsInImportsSource = `<script>
  // import CommentedButton from './CommentedButton.humn'
  /* import MultiLineCommented from './MultiLineCommented.humn' */
  import RealButton from './RealButton.humn'
</script>`
const parsedCommentsInImports = parseHumn(commentsInImportsSource)
assert.equal(parsedCommentsInImports.imports.length, 1)
assert.equal(parsedCommentsInImports.imports[0].symbols[0].name, 'RealButton')

// Control flow blocks do not get masked, but functions/classes do
const sideEffectsInIfSource = `<script>
  if (true) {
    fetch('/api')
  }
  const myFunc = () => {
    fetch('/api')
  }
</script>`
const parsedSideEffectsInIf = parseHumn(sideEffectsInIfSource)
const diags = getDiagnostics(sideEffectsInIfSource, parsedSideEffectsInIf)
const fetchDiags = diags.filter((d) => d.message.includes('fetch runs'))
assert.equal(fetchDiags.length, 1)

// Test hasTsConfig path resolution
const os = require('node:os')
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'humn-test-'))
try {
  const mockWorkspaceRoots = [tempDir]
  const hasTsConfigCheck = (roots) => {
    for (const rootPath of roots) {
      if (rootPath && fs.existsSync(path.join(rootPath, 'tsconfig.json'))) {
        return true
      }
    }
    return false
  }
  assert.equal(hasTsConfigCheck(mockWorkspaceRoots), false)

  fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}')
  assert.equal(hasTsConfigCheck(mockWorkspaceRoots), true)
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true })
}
