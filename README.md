# jslox
 Bob Nystrom's Lox Language from Crafting Interpreters written in JavaScript

## usage

```node bin/main.js``` launches a REPL. prints the values of expressions (and null for statements)

```node bin/main.js file``` loads, parses, and interprets file then exits.

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

2019-10-02 chapter 10 done, except for anonymous functions challenge

BUG: printf "var; print a;\n" | npm run r is "at ';' Expect expression" but should be "at 'var' Expect variable name"

TODO: Undefined varible error doesn't give the line number, because it is thrown within Environment which doesb't have the token

