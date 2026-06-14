import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const packageRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(packageRoot, '../..')

const sourceDocs = path.join(repoRoot, 'docs')
const targetDocs = path.join(packageRoot, 'docs')
const llmsFullPath = path.join(packageRoot, 'llms-full.txt')

function copyDocs() {
  if (!fs.existsSync(sourceDocs)) {
    throw new Error(`Could not find source docs at ${sourceDocs}`)
  }

  fs.rmSync(targetDocs, { recursive: true, force: true })
  fs.cpSync(sourceDocs, targetDocs, { recursive: true })
}

function getMarkdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      return getMarkdownFiles(fullPath)
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      return [fullPath]
    }

    return []
  })
}

function buildLlmsFull() {
  const files = [
    path.join(packageRoot, 'README.md'),
    ...getMarkdownFiles(targetDocs).sort(),
  ].filter((file) => fs.existsSync(file))

  const sections = files.map((file) => {
    const relativePath = path.relative(packageRoot, file)

    return [
      `# Source: ${relativePath}`,
      '',
      fs.readFileSync(file, 'utf8').trim(),
    ].join('\n')
  })

  fs.writeFileSync(
    llmsFullPath,
    [
      '# Humn full LLM context',
      '',
      '> This file is generated from the Humn package README and docs. Do not edit it directly.',
      '',
      ...sections,
      '',
    ].join('\n\n'),
  )
}

copyDocs()
buildLlmsFull()

console.log('Prepared package docs and llms-full.txt')
