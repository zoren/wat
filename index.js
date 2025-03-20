import fs from 'fs'
import { makeParser } from './parse.js'

const commandLineArgs = process.argv.slice(2)
if (commandLineArgs.length !== 1) {
  console.error('Usage: node index.js <file.wat>')
  process.exit(1)
}
const [filename] = commandLineArgs

const content = fs.readFileSync(filename, 'ascii')

const { parse, getOffset } = makeParser(content)

let imports = []
let exports = []
let functions = []
let datas = []

let getArray = (form) => {
  if (!Array.isArray(form)) {
    console.dir(form)
    throw new Error(`Expected array`)
  }
  return form
}

let parseImport = (args, form) => {
  if (args.length !== 3) {
    let offset = getOffset(form)
    throw new Error(`Expected 3 arguments for import at offset ${offset}`)
  }
  let [mname, ename, impForm] = args
  let [kindName, internalName, ...rest] = impForm
  let kind = (() => {
    switch (kindName) {
      case 'func':
        let parameters = []
        let result = []
        for (let [k, ...types] of rest) {
          if (k === 'param') {
            parameters.push(...types)
          } else if (k === 'result') {
            result.push(...types)
          } else {
            throw new Error(`Unknown kind: ${k}`)
          }
        }
        return { parameters, result }
      case 'memory':
        let memType = undefined
        let i = 0
        let first = rest[i]
        if (first === 'i64' || first === 'i32') {
          memType = first
          i++
        }
        let lower = parseInt(rest[i])
        let upper = undefined
        let max = parseInt(rest[i + 1])
        if (!isNaN(max)) {
          upper = max
          i++
        }
        let shared = rest[i + 1] === 'shared'
        return { memType, lower, upper, shared }
      case 'global':
        parseGlobal(rest)
        break
      default:
        throw new Error(`Unknown import kind: ${kindName}`)
    }
  })()
  imports.push({ mname, ename, internalName, kind: kindName, ...kind })
}

let isDollarId = (id) => typeof id === 'string' && id.startsWith('$')

let parseFunc = (argForms) => {
  let [nameForm, ...rest] = argForms
  let name
  if (isDollarId(nameForm)) {
    name = nameForm
  } else if (Array.isArray(nameForm) && nameForm[0] === 'export') {
    name = nameForm[1]
  }

  let parameters = []
  let result = []
  let locals = []
  functions.push({ name, parameters, result, locals })
}

let parseExport = (argForms) => {
  let [nameForm, idForm] = argForms
  let name = nameForm
  let [expKind, id] = idForm
  exports.push({ name, expKind, id })
}

let parseMemory = (argForms) => {}

let parseObj = {
  import: parseImport,
  func: parseFunc,
  export: parseExport,
  memory: parseMemory,
  global: () => {},
  data: ([addr, _value]) => {
    datas.push({ addr })
  },
}

while (true) {
  let form = parse()
  if (!form) {
    break
  }
  let [name, ...body] = form
  let proc = parseObj[name]
  if (!proc) {
    throw new Error(`Unknown form: ${name}`)
  }
  proc(body, form)
}

console.dir(
  {
    imports,
    // global, datas, functions, exports
  },
  { depth: null },
)
