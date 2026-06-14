#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgDir = path.resolve(__dirname, '..')

const args = process.argv.slice(2)

if (args[0] === 'init-ai') {
  console.log('Initializing Humn AI guidance files...')

  const destDir = process.cwd()

  // Create .cursor/rules if needed
  const cursorRulesDir = path.join(destDir, '.cursor', 'rules')
  if (!fs.existsSync(cursorRulesDir)) {
    fs.mkdirSync(cursorRulesDir, { recursive: true })
  }

  // Files to copy
  const filesToCopy = [
    { src: 'AGENTS.md', dest: 'AGENTS.md' },
    { src: 'CLAUDE.md', dest: 'CLAUDE.md' },
    { src: '.cursor/rules/humn.mdc', dest: '.cursor/rules/humn.mdc' },
  ]

  filesToCopy.forEach((file) => {
    const srcPath = path.join(pkgDir, file.src)
    const destPath = path.join(destDir, file.dest)

    if (fs.existsSync(srcPath)) {
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath)
        console.log(`✓ Created ${file.dest}`)
      } else {
        console.log(`! Skipped ${file.dest} (already exists)`)
      }
    } else {
      console.warn(`? Source file ${file.src} not found in package.`)
    }
  })

  console.log(
    '\nAI context initialized! Agentic tools will now understand Humn conventions better.',
  )
} else {
  console.log(`
Usage: humn <command>

Commands:
  init-ai    Copy AI guidance files (AGENTS.md, CLAUDE.md, .cursor/rules) into your project
  `)
}
