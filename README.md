# jslox
 Bob Nystrom's Lox Language from Crafting Interpreters written in JavaScript

## usage

```node bin/main.js``` launches a REPL.
```node bin/main.js file``` loads, parses, and interprets file then exists

As of 2019-09-23 ```print <expression>;``` is the only thing that does anything.
<expression> can be 4-op arithmetic, comparisons, strings, true, false.

### examples:

>print "Hello" + ", " + "world!"
Hello, world!

>print 19 + 2 < 20
false

There are some test files in t/ but they don't keep up with the grammar problems
A proper test suite is on the TODO list...

## wip status

2019-09-23 midway through ch. 8, global variables
