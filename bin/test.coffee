
dump = require './dump'

dump filter: '*', (err, result) ->
    if err? then return process.stderr.write "#{err}\n"
    console.log result
