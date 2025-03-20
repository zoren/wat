export function makeParser(wat) {
  let index = 0
  let formOffsets = new Map()

  let skipWhitespace = () => {
    while (index < wat.length && /\s/.test(wat[index])) index++
  }

  let parse = () => {
    skipWhitespace()
    let start = index
    let c = wat[index]
    index++
    switch (c) {
      case '(': {
        const list = []
        formOffsets.set(list, start)
        while (index < wat.length && wat[index] !== ')') {
          list.push(parse())
          skipWhitespace()
        }
        index++ // Skip ')'
        return Object.freeze(list)
      }
      case '"':
        while (index < wat.length && wat[index] !== '"') index++
        index++ // Skip '"'
        return wat.slice(start, index - 1)
      default:
        while (index < wat.length && /[^\s\(\)]/.test(wat[index])) {
          index++
        }
        return wat.slice(start, index)
    }
  }

  skipWhitespace()
  return { parse, getOffset: form => formOffsets.get(form) }
}
