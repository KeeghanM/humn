export function processChildren(nodes, traverseFn) {
  const results = []

  for (let i = 0; i < nodes.length; i++) {
    const child = nodes[i]

    const isText = child.nodeType === 3
    let textContent = isText ? child.rawText : ''

    const trimmed = textContent.trim()
    // Detect start of logic block
    const isOpenLogic =
      isText && trimmed.startsWith('{') && !trimmed.endsWith('}')

    if (isOpenLogic) {
      // Find the first '{' (might be preceded by whitespace)
      const startIdx = textContent.indexOf('{')
      let buffer = textContent.slice(startIdx + 1) // Content after {

      // Look Ahead Loop
      let complete = false

      while (i + 1 < nodes.length) {
        i++
        const nextNode = nodes[i]

        if (nextNode.nodeType === 1) {
          // Element: Compile and append
          const compiledElem = traverseFn(nextNode)
          if (compiledElem) buffer += compiledElem
        } else if (nextNode.nodeType === 3) {
          // Text: This is where we handle chained blocks
          let nextText = nextNode.rawText

          // Inner loop to consume multiple blocks within one text node
          // e.g. "} { next block"
          while (true) {
            const closeIndex = nextText.indexOf('}')

            if (closeIndex !== -1) {
              // 1. Found closer. Append content and finish THIS block.
              buffer += nextText.slice(0, closeIndex)
              results.push(buffer)

              // 2. Check remainder
              const remainder = nextText.slice(closeIndex + 1)
              const trimmed = remainder.trim()

              if (!trimmed) {
                // Just whitespace, we are done with this chain
                complete = true
                break
              }

              // 3. Does remainder start a NEW block?
              const nextOpen = remainder.indexOf('{')
              if (nextOpen !== -1 && !remainder.slice(0, nextOpen).trim()) {
                // Yes! It's "   { new block..."
                // Reset buffer and CONTINUE the inner loop to find the next '}'
                buffer = remainder.slice(nextOpen + 1)
                nextText = remainder.slice(nextOpen + 1) // Advance text
                // continue inner loop
              } else {
                // No, it's static text. e.g. "} some text"
                results.push(`'${trimmed.replace(/'/g, "\\'")}'`)
                complete = true
                break
              }
            } else {
              // No closer found in this chunk. Append all and move to next node.
              buffer += nextText
              break
            }
          }

          if (complete) break // Break outer look-ahead
        }
      }

      // If we ran out of nodes but buffer has content (and not complete), push it
      if (!complete && buffer.trim()) {
        results.push(buffer)
      }
    } else {
      // Standard Node
      const compiled = traverseFn(child)
      if (compiled) results.push(compiled)
    }
  }

  return results
}
