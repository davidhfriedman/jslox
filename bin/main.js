#!/usr/bin/env node

const fs = require('fs')
const readline = require('readline')
const { TokenType, Token } = require('./token')
const Scanner = require('./scanner')
const Parser = require('./parser')
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
    runFile(process.argv[0])
  } else {                   
    runPrompt()
  }
  return 0
}

// TODO these are in errors.js now
function error(line, message) {                       
  report(line, "", message)
}

function report(line, where, message) {
  console.log(`[line ${line}] Error ${where}: ${message}`)
  hadError(true)
}

function run(source, interpreter) {
  hadError(false)
  const scanner = new Scanner(source)
  const tokens = scanner.scanTokens()
  const parser = new Parser(tokens)
  while (!parser.atEnd()) {
    const expression = parser.parse()
    if (hadError()) { return }
    try {
      const result = interpreter.interpret(expression)
    } catch (e) {
      console.log('in run() : ', e.name, ':', e.message)
      console.log(source)
      if (development_mode) {
	console.log(e)
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
  const interpreter = new Interpreter()
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
