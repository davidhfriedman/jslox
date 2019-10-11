# jslox
 Bob Nystrom's Lox Language from [Crafting Interpreters](https://craftinginterpreters.com/), written in JavaScript.

## usage

```node bin/main.js``` launches a REPL. prints the values of expressions (and null for statements)

```node bin/main.js file``` loads, parses, and interprets the file then exits.

### examples:

```
>print "Hello" + ", " + "world!";
Hello, world!

>print 19 + 2 < 20;
false
```

### Debugging and testing

There are some test files in t/. Some of them follow Nystrom's convention of ```// expect:... ``` comments. Nystrom has a [test suite](https://github.com/munificent/craftinginterpreters/tree/master/test) in the [book's repo](https://github.com/munificent/craftinginterpreters).

```node bin/main.js t/testPrint1.lox```

For quickie command line tests:

```$ printf "var a = 19;\nprint a;\n" | npm run r```

```npm run r``` === ```node bin/main.js```

## wip status

2019-10-11 chapter 13 done, except for challenges
2019-10-10 chapter 12 done, except for challenges
2019-10-07 chapter 11 done, except for challenges
2019-10-02 chapter 10 done, except for anonymous functions challenge
