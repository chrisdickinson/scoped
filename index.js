var optimist = require('optimist')
  , process = require('process')
  , path = require('path')
  , fs = require('fs')

var falafel = require('falafel')
  , language = require('cssauron-falafel')
  , colors = require('ansicolors')

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

var is_assign = language('assign > id:first-child')
  , is_var = language('variable > id:first-child')
  , is_func = language('function > id:first-child')
  , func = language('function')
  , id = language('id')
  , rhs_lookup = language('lookup > * + id')
  , obj_expr = language('object > * > id:first-child')
  , catch_clause = language('catch')
  , try_clause = language('try')

var global_names =
'module,process,console,setInterval,clearInterval,setTimeout,clearTimeout,JSON,require,window,Math,Object,Function,Number,Array,RegExp,Date,document,define,undefined,String'.split(',')

try {
  input = '(function(){'+input+'})'

  var innermost_node
    , pos = null

  if(optimist.argv.position) {
    pos = line_col_to_idx.apply(null, (optimist.argv.position+'').split(',').map(Number))
    if(pos.length < 1) {
      pos.push(1)
    }
  }
  output = falafel(input, function(node) {
    var scope = node
      , idx

    if(node.range[0] <= pos && node.range[1] >= pos) {
      if(!innermost_node || (node.range[1] - node.range[0] < innermost_node.range[1] - innermost_node.range[0])) {
        innermost_node = node
      }
    }

    if(is_var(node) || is_func(node)) {
      while(scope && !func(scope)) {
        scope = scope.parent
      }

      init(scope)
      scope.declare(node)
    } else if(func(node) || catch_clause(node)) {
      scope = node.parent
      while(scope && !(func(scope) || catch_clause(node))) {
        scope = scope.parent
      }
      
      if(!scope) {
        output(node.unresolved)
        return
      }

      init(scope)
      if(node.id && /Declaration/.test(node.type)) {
        scope.declare(node.id)
      }

      init(node)
      node.unresolved.forEach(function(name) {
        scope.use(name, name._kind)
      })
    } else if(id(node) && !rhs_lookup(node) && !obj_expr(node)) {
      while(scope && !(func(scope) || catch_clause(scope))) {
        scope = scope.parent
      }

      init(scope)
      scope.use(node, is_assign(node) ? 'explicit' : 'implicit')
    }
  })
} catch(err) {
  console.error('invalid javascript:', err.stack)
  return
}

function init(scope) {
  if(scope.use) {
    return
  }

  scope.declared = scope.declared || make_decl(scope)
  scope.unresolved = scope.unresolved || []
  scope.declare = function(node) {
    node._count = 1 
    scope.unresolved = scope.unresolved.filter(not_matches(node, 1))
    if(scope.declared.some(matches(node))) {
      return
    }
    scope.declared.push(node)
  }

  scope.use = function(node, kind) {
    node._count = 1 
    if(scope.declared.some(matches(node, 1)) || scope.unresolved.some(matches(node, 1))) {
      for(var i = 0, len = scope.declared.length; i < len; ++i) {
        if(node.name === scope.declared[i].name) {
          ++scope.declared[i]._count
          break
        }
      }
      return
    }
    if(global_names.indexOf(node.name) !== -1) {
      return
    }
    node._kind = kind
    node._count = node._count || 0
    scope.unresolved.push(node)
  }
}

function matches(node, incr) {
  return function(inner) {
    return inner.name === node.name
  }
}

function not_matches(node, apply) {
  return function(inner) {
    return inner.name !== node.name
  }
}

function make_decl(fn) {
  var out = (fn.params || (fn.param ? [fn.param] : [])).slice()

  if(fn.id) {
    out.push(fn.id)
  }

  return out
}

function output(unresolved) {
  var ident
    , range
  for(var i = 0, len = unresolved.length; i < len; ++i) {
    ident = unresolved[i]

    range = ident.range.map(idx_to_line_col)

    console.log(
      range[0]
    + ', '+ident._kind+': '+colors.red(ident.name)
    )
  }

  if(pos === null) {
    return
  }

  var scope = innermost_node
  while(scope) {
    while(scope && !scope.declared) scope = scope.parent
    if(!scope) return

    var from = idx_to_line_col(scope.range[0])
      , to = idx_to_line_col(scope.range[1])

    if(catch_clause(scope)) {
      console.log(colors.yellow('<catch clause>')+' from '+from+' to '+to)
    } else if(try_clause(scope)) {
      console.log(colors.yellow('<try clause>')+' from '+from+' to '+to)
    } else {
      console.log(colors.yellow(scope.id ? '<function '+scope.id.name+'>' : '<anonymous>') +' from '+from+' to '+to)
    }

    for(var i = 0, len = scope.declared.length; i < len; ++i) {
      console.log(
        colors.green('+ ')+pad(scope.declared[i].name, 24)+' used '+
        colors.magenta(scope.declared[i]._count)+' times (from '+idx_to_line_col(scope.declared[i].range[0])+')'
      )
    }

    for(var i = 0, len = scope.unresolved.length; i < len; ++i) {
      console.log(
        colors.magenta('* ')+pad(scope.unresolved[i].name, 24)+' used '+
        colors.magenta(scope.unresolved[i]._count)+' times (from '+idx_to_line_col(scope.unresolved[i].range[0])+')'
      )

    }

    scope = scope.parent
  }

}

function pad(s, n) {
  while(s.length < n) s = s+' '
  return s.slice(0, n)
}

function line_col_to_idx(line, col) {
  line -= 1
  col -= 1

  for(var i = 0, len = input.length; i < len; ++i) {
    if(line && input[i] === '\n') {
      --line
    }
    if(!line) {
      if(!col) {
        return i
      }
      --col
    }
  }
  return null
}

function idx_to_line_col(idx) {
  var lines = 0
    , columns = 0

  for(var i = 0, len = idx; i < len; ++i) {
    ++columns
    if(input[i] === '\n') {
      ++lines
      columns = 0
    }
  }

  return {line: 1 + lines, col: columns + 1, toString: str}

  function str() {
    return 'line '+colors.cyan(this.line)+', col '+colors.cyan(this.col)
  }
}
