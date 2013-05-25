var lexical = require('lexical-scope')
  , optimist = require('optimist')
  , process = require('process')
  , path = require('path')
  , fs = require('fs')

var target = (optimist.argv._ || [])[0]
  , cwd = process.cwd()
  , output
  , input

if(!target) {
  return help()
}

target = path.join(cwd, target || '')

try {
  input = fs.readFileSync(target, 'utf8')
} catch(err) {
  console.error('not a file')
  return
}

try {
  output = lexical('(function(){'+input+'})')
} catch(err) {
  console.error('invalid javascript:', err.stack)
  return
}

console.log('implicit explicit')

var explicit = output.globals.exported
  , implicit = output.globals.implicit

explicit.sort()
implicit.sort()

for(var i = 0, len = Math.max(implicit.length, explicit.length); i < len; ++i) {
  console.log((implicit[i] || '-')+' '+(explicit[i] || '-'))
}

function help() {

}
