import { describe, expect, it } from 'vitest'

import { compileTemplate } from '../compile-template.js'

/**
 * Helper to normalize whitespace for robust string comparison.
 * Converts "h('div', {  }, [])" -> "h('div', {}, [])"
 */
const normalize = (str) =>
  str
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/{\s+}/g, '{}') // Collapse empty objects
    .trim()

describe('Humn Compiler', () => {
  describe('Static Rendering', () => {
    it('should compile a simple element with no props', () => {
      const input = '<div></div>'
      const output = compileTemplate(input)

      expect(normalize(output[0])).toContain("h('div', {}, [])")
    })

    it('should compile nested static elements', () => {
      const input = '<div><span>text</span></div>'
      const output = compileTemplate(input)

      expect(normalize(output[0])).toBe(
        "h('div', {}, [h('span', {}, ['text'])])",
      )
    })

    it('should handle static attributes', () => {
      const input = '<div class="container" id="main"></div>'
      const output = compileTemplate(input)

      expect(output[0]).toContain("class: 'container'")
      expect(output[0]).toContain("id: 'main'")
    })
  })

  describe('Dynamic Bindings', () => {
    it('should compile dynamic prop bindings', () => {
      const input =
        '<button onclick={handleClick} disabled={isLoading}></button>'
      const output = compileTemplate(input)

      expect(output[0]).toContain('onclick: handleClick')
      expect(output[0]).toContain('disabled: isLoading')
    })

    it('should handle complex expressions in props', () => {
      const input = '<div class={active ? "show" : "hide"}></div>'
      const output = compileTemplate(input)

      expect(output[0]).toContain('class: active ? "show" : "hide"')
    })
  })

  describe('Text Interpolation', () => {
    it('should compile direct variable interpolation', () => {
      const input = '<span>{username}</span>'
      const output = compileTemplate(input)

      expect(normalize(output[0])).toBe("h('span', {}, [username])")
    })

    it('should compile mixed text and interpolation', () => {
      const input = '<p>Hello {name}!</p>'
      const output = compileTemplate(input)

      expect(normalize(output[0])).toBe("h('p', {}, ['Hello ', name, '!'])")
    })

    it('should handle multiple interpolations in one node', () => {
      const input = '<p>{first} {last}</p>'
      const output = compileTemplate(input)

      expect(normalize(output[0])).toBe("h('p', {}, [first, ' ', last])")
    })
  })

  describe('Edge Cases', () => {
    it('should ignore self-closing tag slash', () => {
      const input = '<input type="text" />'
      const output = compileTemplate(input)

      expect(output[0]).toContain("h('input'")
    })

    it('should handle attributes with different quote styles', () => {
      const input = `<div class='single' id="double"></div>`
      const output = compileTemplate(input)

      expect(output[0]).toContain("class: 'single'")
      expect(output[0]).toContain("id: 'double'")
    })
  })
})
