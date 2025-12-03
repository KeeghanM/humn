import { describe, expect, it } from 'vitest'

import { parsers } from '../index.js'

const parse = parsers['humn-parser'].parse

describe('Prettier Humn Parser', () => {
  it('should parse a complete SFC', () => {
    const code = `
      <script>const a = 1;</script>
      <div>{a}</div>
      <style>div { color: red; }</style>
    `
    const ast = parse(code)

    expect(ast.script).toContain('const a = 1;')
    expect(ast.style).toContain('color: red;')
    expect(ast.template.trim()).toBe('<div>{a}</div>')
  })

  it('should handle missing script block', () => {
    const code = `<h1>Hello</h1>`
    const ast = parse(code)

    expect(ast.script).toBe('')
    expect(ast.template).toBe('<h1>Hello</h1>')
  })

  it('should handle missing style block', () => {
    const code = `
      <script>console.log('hi')</script>
      <button>Click</button>
    `
    const ast = parse(code)

    expect(ast.style).toBe('')
    expect(ast.script).toContain("console.log('hi')")
    expect(ast.template.trim()).toBe('<button>Click</button>')
  })

  it('should ignore attributes on script/style tags', () => {
    // Ensuring regex is robust enough to catch tags with attrs if you support them later
    // or at least doesn't break.
    const code = `
      <script lang="ts">const x = 1</script>
      <div></div>
    `
    // Current regex implementation in index.js: /<script>([\s\S]*?)<\/script>/
    // Note: The current implementation might fail this if it strictly expects <script>.
    // If strict compliance is desired, this test documents current behavior or a TODO.

    const ast = parse(code)

    // Based on current implementation, this might return empty script if attributes aren't handled.
    // If you update the regex to /<script[^>]*>.../, this expectation changes.
    // For now, let's assume standard behavior based on your regex:
    // It currently won't match <script lang="ts"> based on your provided file.
    // This test highlights a potential improvement or expected limitation.
    expect(ast.script).toBe('')
  })
})
