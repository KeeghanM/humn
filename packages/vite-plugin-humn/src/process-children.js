/**
 * @file Processes child nodes for the Humn Vite plugin.
 * @module process-children
 */

/**
 * Processes a list of nodes, handling text fragmentation and code blocks.
 *
 * WHY: The HTML parser splits text nodes at arbitrary points, and doesn't understand
 * our `{}` syntax. This means a code block like `{ user.name }` might be split across
 * multiple text nodes if it contains spaces or newlines.
 *
 * We need to manually "tokenize" the text stream to correctly identify and reconstruct
 * these code blocks, ensuring they are treated as JavaScript expressions rather than
 * static strings.
 *
 * @param {Array<import("node-html-parser").Node>} nodes - The list of child nodes.
 * @param {function} traverseFn - The function to compile element nodes.
 * @returns {string[]} The list of compiled code strings.
 */
export function processChildren(nodes, traverseFn) {
  const results = []

  // 1. Flatten nodes into a single stream to handle fragmentation
  for (let i = 0; i < nodes.length; i++) {
    const child = nodes[i]

    if (child.nodeType === 1) {
      // Element: Compile directly
      results.push(traverseFn(child))
    } else if (child.nodeType === 3) {
      // Text: Robust Tokenizer
      let text = child.rawText
      let cursor = 0

      while (cursor < text.length) {
        // Find next open brace
        const openIdx = text.indexOf('{', cursor)

        if (openIdx === -1) {
          // No more code blocks, rest is static string
          const remainder = text.slice(cursor)
          if (remainder) {
            results.push(
              `'${remainder.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`,
            )
          }
          break
        }

        // Push static text BEFORE the brace
        const staticPart = text.slice(cursor, openIdx)
        if (staticPart) {
          results.push(
            `'${staticPart.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`,
          )
        }

        // START SCANNING LOGIC BLOCK
        // We need to determine if this block closes IN THIS NODE or spans multiple nodes.
        let depth = 1
        let endIdx = openIdx + 1
        let foundCloser = false

        // Scan current text node
        while (endIdx < text.length) {
          const char = text[endIdx]
          if (char === '{') depth++
          else if (char === '}') depth--

          if (depth === 0) {
            foundCloser = true
            break
          }
          endIdx++
        }

        if (foundCloser) {
          // Case A: Block closes in this node. { item.id }
          const code = text.slice(openIdx + 1, endIdx)
          results.push(code)
          cursor = endIdx + 1
        } else {
          // Case B: Block is fragmented! { isLoading && <div...
          // We must consume subsequent nodes until depth hits 0.
          // This "Look-Ahead Loop" consumes future nodes from the main loop.

          let buffer = text.slice(openIdx + 1) // Start buffer with rest of this text

          // Enter Look-Ahead Loop
          let isBlockComplete = false
          while (i + 1 < nodes.length) {
            i++ // Advance main loop to consume next node
            const nextNode = nodes[i]

            if (nextNode.nodeType === 1) {
              // Element: Compile and add to buffer
              const compiledElem = traverseFn(nextNode)
              if (compiledElem) buffer += compiledElem
            } else if (nextNode.nodeType === 3) {
              const nextText = nextNode.rawText

              // Scan next text node
              let localCursor = 0
              while (localCursor < nextText.length) {
                const char = nextText[localCursor]
                if (char === '{') depth++
                else if (char === '}') depth--

                localCursor++

                if (depth === 0) {
                  isBlockComplete = true
                  break
                }
              }

              if (isBlockComplete) {
                // Found the closer!
                // Add the part before the closer to buffer
                buffer += nextText.slice(0, localCursor - 1)
                const remainder = nextText.slice(localCursor)
                if (remainder) {
                  // 1. Mutate the current node to contain only the unprocessed text
                  nextNode.rawText = remainder

                  // 2. Decrement the main loop index.
                  // When the `break` happens, the outer loop will do `i++`,
                  // bringing us back to THIS node, allowing it to be processed
                  // from the start as a fresh text node.
                  i--
                }
                break
              } else {
                buffer += nextText
              }
            }
          }

          results.push(buffer)
          cursor = text.length // Done with this text node
        }
      }
    }
  }

  return results
}
