#!/usr/bin/env node

const fs = require('fs')
const readline = require('readline')
const { TokenType, Token } = require('./token')
const Scanner = require('./scanner')
const Parser = require('./parser')
const Resolver = require('./resolver')
// TODO: name pprint
const { pprint } = require('./ast')
const { Interpreter } = require('./interpreter')
let { hadError } = require('./errors')

hadError(false)
// TODO hadRuntimeError = false

let development_mode = false

function main() {
  let args = process.argv.slice(2)
  if (args.length > 2) {
    console.log("Usage: jslox [-d] [script]")
    process.exit(64)
  }
  if (args.length >= 1) {
    if (args[0][0] === '-') {
      if (args[0][1] !== 'd') {
	console.log("Usage: jslox [-d] [script]")
	process.exit(64)
      } else {
	development_mode = true
	args.splice(0,1)
      }
    }
  }
  if (args.length > 0) {
    runFile(args[0])
  } else {                   
    runPrompt()
  }
  return 0
}

function run(source, interpreter) {
  hadError(false)
  const scanner = new Scanner(source)
  const tokens = scanner.scanTokens()
  const parser = new Parser(tokens)
  while (!parser.atEnd()) {
    const expression = parser.parse()
    if (!development_mode) {
      if (hadError()) { return }
    }
    const resolver = new Resolver(interpreter)
    resolver.resolve(expression)
    if (hadError()) { return }
    try {
      const result = interpreter.interpret(expression)
      if (interpreter.mode === "repl") {
	console.log(result) // repl mode echo expression value
      }
    } catch (e) {
      console.log('in run() : ', e.name, ':', e.message) // error reporting
      console.log(source) // error reporting
      if (development_mode) {
	console.log(e) // dev mode error reporting
      }
      parser.synchronize()
    }
  }
}

function runFile(path) {
  const interpreter = new Interpreter()
  run(fs.readFileSync(path, 'utf8'), interpreter)
  if (hadError()) {
    process.exit(65)
  }
  /* TODO 
     if (hadRuntimeError) {
     process.exit(70)
     }
  */
}

function runPrompt() {
  const interpreter = new Interpreter("repl")
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  })
  
  rl.prompt()
  
  rl.on('line', (line) => {
    run(line, interpreter)
    hadError(false) // don't kill the interactive session
    rl.prompt()
  })
}

main()
