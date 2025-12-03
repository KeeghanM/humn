export function protectAttributes(html) {
  let output = ''
  let lastIndex = 0
  const masks = new Map()
  let maskId = 0

  const regex = /([a-zA-Z0-9:-]+)\s*=\s*\{/g
  let match

  while ((match = regex.exec(html)) !== null) {
    output += html.slice(lastIndex, match.index)
    const attrName = match[1]
    const startIndex = match.index + match[0].length - 1

    let depth = 1
    let curr = startIndex + 1
    let found = false

    while (curr < html.length) {
      const char = html[curr]
      if (char === '"' || char === "'" || char === '`') {
        const quote = char
        curr++
        while (curr < html.length && html[curr] !== quote) {
          if (html[curr] === '\\') curr++ // skip escaped char
          curr++
        }
      } else if (char === '{') {
        depth++
      } else if (char === '}') {
        depth--
      }
      if (depth === 0) {
        found = true
        break
      }
      curr++
    }

    if (found) {
      const code = html.slice(startIndex + 1, curr)
      const key = `__HUMN_ATTR_${maskId++}__`
      masks.set(key, code)
      output += `${attrName}="${key}"`
      lastIndex = curr + 1
      regex.lastIndex = lastIndex
    } else {
      output += match[0]
      lastIndex = regex.lastIndex
    }
  }

  output += html.slice(lastIndex)
  return { html: output, masks }
}
