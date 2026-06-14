const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const packageRoot = path.join(__dirname, '..')
const grammar = JSON.parse(
  fs.readFileSync(
    path.join(packageRoot, 'syntaxes', 'humn.tmLanguage.json'),
    'utf8',
  ),
)
const languageConfiguration = JSON.parse(
  fs.readFileSync(
    path.join(packageRoot, 'language-configuration.json'),
    'utf8',
  ),
)
const extensionManifest = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
)

function collectObjects(value, objects = []) {
  if (!value || typeof value !== 'object') {
    return objects
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectObjects(item, objects)
    }
    return objects
  }

  objects.push(value)

  for (const item of Object.values(value)) {
    collectObjects(item, objects)
  }

  return objects
}

const grammarObjects = collectObjects(grammar)
const scriptBlock = grammar.repository['script-block']
const styleBlock = grammar.repository['style-block']
const embeddedLanguages =
  extensionManifest.contributes.grammars[0].embeddedLanguages

assert.equal(grammar.scopeName, 'source.humn')
assert.equal(scriptBlock.contentName, 'source.tsx.embedded.humn')
assert.deepEqual(scriptBlock.patterns, [{ include: 'source.tsx' }])
assert.equal(styleBlock.contentName, 'source.css')
assert.deepEqual(styleBlock.patterns, [
  { include: '#root-style-declaration' },
  { include: 'source.css' },
])
assert.deepEqual(grammar.patterns.at(-1), { include: 'source.tsx' })
assert.equal(embeddedLanguages['source.tsx.embedded.humn'], 'typescriptreact')
assert.equal(languageConfiguration.comments.lineComment, undefined)
assert.deepEqual(languageConfiguration.comments.blockComment, ['<!--', '-->'])
assert.equal(
  grammar.repository['root-style-declaration'].begin,
  '^ {0,2}((?:--[A-Za-z_][A-Za-z0-9_-]*|-?[A-Za-z_][A-Za-z0-9_-]*))\\s*(:)(?=[^;{]*;)(?![^;]*\\{)',
)

for (const object of grammarObjects) {
  assert.notEqual(
    object.name,
    'variable.other.readwrite.prose.js',
    'Humn grammar must not mark prose text as variables',
  )
}
