import { describe, expect, it } from 'vitest'

import humn from '../index.js'

describe('Humn Vite transform', () => {
  it('wraps top-level mapped templates in a root vnode', () => {
    const plugin = humn()
    const source = `
      <script>
        import Message from './message.humn'
        const messages = [{ id: 1 }, { id: 2 }]
      </script>

      {messages.map((message) => (
        <Message message={message} />
      ))}
    `

    const result = plugin.transform(source, '/virtual/chat-window.humn')

    expect(result.code).toContain('const __templateNode = messages.map')
    expect(result.code).toContain('Array.isArray(__templateNode)')
    expect(result.code).toContain("h('div', {}, __templateNode)")
  })
})
