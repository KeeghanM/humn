import { describe, expect, it } from 'vitest'
import { parsers } from '../index.js'

const parse = parsers['humn-parser'].parse

function getContent(ast, type) {
  const node = ast.children.find((n) => n.type === type)
  return node ? node.content : undefined
}

describe('Prettier Humn Parser', () => {
  it('should parse a complete SFC', () => {
    const code = `
      <script>const a = 1;</script>
      <div>{a}</div>
      <style>div { color: red; }</style>
    `
    const ast = parse(code)

    expect(getContent(ast, 'humn-script')).toContain('const a = 1;')
    expect(getContent(ast, 'humn-style')).toContain('color: red;')
    expect(getContent(ast, 'humn-template').trim()).toBe('<div>{a}</div>')
  })

  it('should handle missing script block', () => {
    const code = `<h1>Hello</h1>`
    const ast = parse(code)

    // If script is missing, the node should not exist (undefined)
    expect(getContent(ast, 'humn-script')).toBeUndefined()
    expect(getContent(ast, 'humn-template')).toBe('<h1>Hello</h1>')
  })

  it('should handle missing style block', () => {
    const code = `
      <script>console.log('hi')</script>
      <button>Click</button>
    `
    const ast = parse(code)

    expect(getContent(ast, 'humn-style')).toBeUndefined()
    expect(getContent(ast, 'humn-script')).toContain("console.log('hi')")
    expect(getContent(ast, 'humn-template').trim()).toBe(
      '<button>Click</button>',
    )
  })

  it('should ignore attributes on script/style tags', () => {
    const code = `
      <script lang="ts">const x = 1</script>
      <div></div>
    `
    const ast = parse(code)

    expect(getContent(ast, 'humn-script')).toBe('const x = 1')
  })
})
