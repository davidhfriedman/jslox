#!/usr/bin/env node

const fs = require('fs')
const readline = require('readline')
const { TokenType, Token } = require('./token')
const Scanner = require('./scanner')
const Parser = require('./parser')
// TODO: name pprint
const { pprint } = require('./ast')
const { interpret } = require('./interpreter')
let { hadError } = require('./errors')

hadError(false)
// TODO hadRuntimeError = false

function main() {
  if (process.argv.length > 3) {
    console.log("Usage: jslox [script]")
    process.exit(64)
  } else if (process.argv.length == 3) {
    runFile(process.argv[2])
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

function run(source) {
  hadError(false)
  const scanner = new Scanner(source)
  const tokens = scanner.scanTokens()
  // TODO Chapter 3 test: just print the tokens.        
  //console.log('DBG TOKENS:')
  //tokens.forEach(token => console.log(`<${token}>`)) //DBG
  const parser = new Parser(tokens)
  while (!parser.atEnd()) {
    const expression = parser.parse()
    // stop on synax errors
    if (hadError()) { return }
    try {
      //console.log(`DBG A ${pprint(expression)}`)
      const result = interpret(expression)
      //console.log(`DBG B ${pprint(expression)} => ${result}`)
    } catch (e) {
      console.log('in run() : ', e.name, ':', e.message)
      console.log(source)
      //console.log('DBG C', e)
      parser.synchronize()
    }
  }
}

function runFile(path) {
  run(fs.readFileSync(path, 'utf8'))
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
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  })
  
  rl.prompt()
  
  rl.on('line', (line) => {
    run(line)
    hadError(false) // don't kill the interactive session
    rl.prompt()
  })
}

main()
