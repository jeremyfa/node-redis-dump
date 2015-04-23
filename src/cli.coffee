
fs      = require 'fs'
path    = require 'path'
argv    = require('optimist').argv
dump    = require './dump'
pkg = JSON.parse fs.readFileSync path.normalize(__dirname+'/../package.json'), 'utf8'

# Display help if requested
if argv.help
    console.log """
        #{pkg.name} #{pkg.version}

        Usage: redis-dump [OPTIONS]
          -h <hostname>    Server hostname (default: 127.0.0.1)
          -p <port>        Server port (default: 6379)
          -d <db>          Database number (default: 0)
          -f <filter>      Query filter (default: *)
          --convert        Convert from json to redis commands
          --help           Output this help and exit
          --json           Output result as json
          --pretty         Make pretty indented output (use with --json)

        Examples:
          redis-dump
          redis-dump -p 6500
          redis-dump -f 'mydb:*' > mydb.dump.txt
          redis-dump --json > mydb.json
          cat mydb.json | redis-dump --convert

        The output is a valid list of redis commands.
        That means the following will work:
          redis-dump > dump.txt      # Dump redis database
          cat dump.txt | redis-cli   # Import redis database from generated file

        """
else
    params =
        filter: argv.f ? '*'
        db:     argv.d ? 0
        port:   argv.p ? 6379
        host:   argv.h ? '127.0.0.1'
        format: if argv.json then 'json' else 'redis'
        pretty: argv.pretty ? false

    # Dump operation
    doDump = ->
        dump params, (err, result) ->
            if err? then return process.stderr.write "#{err.message ? err}\n"
            if result? and "#{result}".replace(/^\s+/, '').replace(/\s+$/, '') isnt ''
                console.log result
                process.exit 0
    
    # If we are converting a stream from stdin, read it to the end
    if argv.convert
        params.convert = ''
        process.stdin.resume()
        process.stdin.on 'data', (chunk) ->
            params.convert += "#{chunk}"
        process.stdin.on 'end', ->
            doDump()
    # Otherwise just run dump directly
    else
        doDump()
    
    