# jslox
 Bob Nystrom's Lox Language from Crafting Interpreters written in JavaScript

## usage

```node bin/main.js``` launches a REPL.
```node bin/main.js file``` loads, parses, and interprets file then exits

As of 2019-09-23 ```print <expression>;``` is the only thing that does anything.
<expression> can be 4-op arithmetic, comparisons, strings, true, false.

### examples:

```
>print "Hello" + ", " + "world!";
Hello, world!

>print 19 + 2 < 20;
false
```

### Debugging and testing

There are some test files in t/ but they don't keep up with the grammar problems.
A proper test suite is on the TODO list...

For quickie command line tests:

```$ printf "var a = 19;\nprint a;\n" | npm run d```

```npm run r``` === ```node bin/main.js```
```npm run d``` === ```node bin/main.js -d```

-d flag for development mode: prints stack traces for debugging interpreter errors

## wip status

2019-09-23 midway through ch. 8, global variables
