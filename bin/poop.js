#!/usr/bin/env node

const fs = require('fs')
const readline = require('readline')

function main() {
  weesl()
  return -17
}

async function weesl() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  });
  
  rl.prompt();
  
  rl.on('line', (line) => {
    switch (line.trim()) {
    case 'hello':
      console.log('world!');
      break;
    default:
      console.log(`Say what? I might have heard '${line.trim()}'`);
      break;
    }
  rl.prompt();
  }).on('close', () => {
    console.log('Have a great day!');
    process.exit(0);
  });
}

main()
