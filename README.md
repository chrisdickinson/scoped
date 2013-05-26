# scoped

scoped is a command line tool to help you reason about <sub>your</sub><sup>other people's</sup> javascript.

it notifies you of globals -- both explicit (created by assigning) and implicit
(use without definition) -- and, when given a position in the file, will let you know
what variables are in scope at that point.

![example scoped output](http://cl.ly/image/0G2M2R0Z093N/scoped.png)

# usage

### scoped path/to/file.js

outputs only global usage/leakage information, with line and column numbers.

### scoped path/to/file.js --position=line[,column]

outputs scope chain, with usage/definition for each scope. `position` is
in the form `LINE,COLUMN`. `,COLUMN` may be omitted, if so, it is assumed
to be `1`. Both `line` and `column` are assumed to be 1-indexed (like most
editors).

* Green `+` signs indicate scope definitions -- i.e., a new variable was created
  in this scope.

* Purple `*` signs indicate use of a variable from a containing scope.

* If the function is named, it will use that to describe the function.

# installation

`npm install -g scoped`

# license

MIT 
