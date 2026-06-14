const assert = require('node:assert/strict')

const {
  createVirtualTypescript,
  findIdentifierOccurrences,
  getComponentTagAt,
  getDiagnostics,
  getRegionAtOffset,
  getSemanticTokens,
  parseHumn,
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
assert.equal(
  semanticTokens.some(
    (token) => source.slice(token.start, token.end) === 'contacts',
  ),
  true,
)
assert.equal(
  semanticTokens.some(
    (token) =>
      source.slice(token.start, token.end) === 'Button' &&
      token.type === 'class',
  ),
  true,
)

const virtualSource = createVirtualTypescript(source, parsed)
assert.equal(virtualSource.includes('const handleSubmit'), true)
assert.equal(virtualSource.includes('contacts.map'), true)
assert.equal(virtualSource.includes('<form'), false)

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
