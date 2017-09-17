
run = require('async').waterfall
redis = require 'redis'

module.exports = (params, callback) ->
    params.port ?= 6379
    params.host ?= '127.0.0.1'
    params.db ?= '0'
    params.filter ?= '*'
    params.format ?= 'redis'
    params.convert ?= null
    dumper = new RedisDumper(params)
    dumper.dump params, (params...) ->
        dumper.close()
        callback params...

class RedisDumper

    constructor: ({port, host, auth}) ->
        # Connect to redis database
        if auth?
            @db = redis.createClient(port, host, {auth_pass: auth})
        else
            @db = redis.createClient(port, host)

    close: ->
        # Close redis connection
        @db.end(true)

    escape: (value) ->
        if /^([a-zA-Z0-9_\:\-]+)$/.test "#{value}"
            return "#{value}"
        else
            return "'"+"#{value}".split('\\').join('\\\\').split('\'').join('\\\'')+"'"

    dump: ({db, filter, format, convert, pretty}, callback) ->
        keys = []
        types = []
        values = []
        ttls = []
        if typeof convert is 'string'
            try
                convert = JSON.parse convert
            catch e
                return callback e
        @db.select db
        run [
            # Get keys matching filter
            (next) =>
                try
                    if convert?
                        next null, (k for k of convert)
                    else
                        @db.keys filter, next
                catch e
                    next e

            # For each key, get its type
            (reply, next) =>
                try
                    for key in reply
                        keys.push key

                    # If there are no keys, return now
                    if keys.length is 0
                        if format is 'json'
                            callback null, '{}'
                        else if format is 'raw'
                            callback null, {}
                        else
                            callback null, ''
                        next null, null
                        return

                    # Sort keys in alphabetic order (better for versioning)
                    keys = keys.sort();

                    if convert?
                        next null, (v.type for k, v of convert)
                    else
                        multi = @db.multi()
                        for key in keys
                            multi.type key
                        multi.exec next
                catch e
                    next e

            # Get data of each key according to its type
            (replies, next) =>
                try
                    if keys.length is 0
                        next null, null
                        return

                    for type in replies
                        types.push type

                    if convert?
                        result = []
                        for type, i in types
                            switch type
                                when 'string'
                                    result.push convert[keys[i]].value
                                when 'list'
                                    result.push convert[keys[i]].value
                                when 'set'
                                    result.push convert[keys[i]].value
                                when 'zset'
                                    val = []
                                    for entry in convert[keys[i]].value
                                        val.push entry[1]
                                        val.push entry[0]
                                    result.push val
                                when 'hash'
                                    result.push convert[keys[i]].value
                        next null, result
                    else
                        multi = @db.multi()
                        for type, i in types
                            switch type
                                when 'string'
                                    multi.get keys[i]
                                when 'list'
                                    multi.lrange keys[i], 0, -1
                                when 'set'
                                    multi.smembers keys[i]
                                when 'zset'
                                    multi.zrange keys[i], 0, -1, 'withscores'
                                when 'hash'
                                    multi.hgetall keys[i]
                        multi.exec next
                catch e
                    next e


            # Get TTL of each key
            (replies, next) =>
                try
                    if keys.length is 0
                        next null, null
                        return

                    for value in replies
                        values.push value

                    if convert?
                        result = []
                        for key in keys
                            if convert[key].ttl?
                                result.push "#{convert[key].ttl}"
                            else
                                result.push "-1"
                        next null, result
                    else
                        multi = @db.multi()
                        for key in keys
                            multi.ttl key
                        multi.exec next
                catch e
                    next e

            # Render result as the requested format
            (replies, next) =>
                try
                    if keys.length is 0
                        next null, null
                        return

                    for ttl in replies
                        ttls.push ttl

                    switch format
                        when 'json' or 'raw'
                            # Create json from key's type and data (default)
                            json = {}
                            for type, i in types
                                key = keys[i]
                                value = values[i]
                                switch type
                                    when 'string'
                                        json[key] = type: 'string', value: value
                                    when 'list'
                                        json[key] = type: 'list', value: value
                                    when 'set'
                                        json[key] = type: 'set', value: value.sort() # Sort set for better versioning
                                    when 'zset'
                                        json[key] = type: 'zset', value: ([parseInt(value[j+1],10), value[j]] for item, j in value by 2)
                                    when 'hash'
                                        json[key] = type: 'hash', value: value

                                ttl = parseInt ttls[i], 10
                                if not isNaN(ttl) and ttl isnt -1
                                    json[key].ttl = ttl
                            # Return result
                            if format is 'json'
                                if pretty
                                    callback null, JSON.stringify(json, null, 4)
                                else
                                    callback null, JSON.stringify(json)
                            else
                                callback null, json

                        else
                            # Create redis-cli compliant commands from key's type and data (default)
                            commands = []
                            for type, i in types
                                key = keys[i]
                                value = values[i]
                                switch type
                                    when 'string'
                                        commands.push "SET     #{@escape key} #{@escape value}"
                                    when 'list'
                                        commands.push "DEL     #{@escape key}"
                                        commands.push "RPUSH   #{@escape key} #{(@escape(item) for item in value).join(' ')}"
                                    when 'set'
                                        commands.push "DEL     #{@escape key}"
                                        if value.length isnt 0
                                            commands.push "SADD    #{@escape key} #{(@escape(item) for item in value).join(' ')}"
                                    when 'zset'
                                        commands.push "DEL     #{@escape key}"
                                        if value.length isnt 0
                                            commands.push "ZADD    #{@escape key} #{((@escape(value[j+1])+' '+@escape(value[j])) for item, j in value by 2).join(' ')}"
                                    when 'hash'
                                        commands.push "DEL     #{@escape key}"
                                        len = 0
                                        len++ for k of value
                                        if len isnt 0
                                            commands.push "HMSET   #{@escape key} #{((@escape(k)+' '+@escape(v)) for k, v of value).join(' ')}"

                                ttl = parseInt ttls[i], 10
                                if not isNaN(ttl) and ttl isnt -1
                                    commands.push "EXPIRE  #{@escape key} #{ttl}"
                            # Return result
                            callback null, commands.join("\n")
                catch e
                    next e

        ], (err) ->
            callback err
