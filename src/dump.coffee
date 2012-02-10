
run = require('async').waterfall
redis = require 'redis'

module.exports = (params, callback) ->
    dumper = new RedisDumper(params)
    dumper.dump params, (params...) ->
        dumper.close()
        callback params...

class RedisDumper
    
    constructor: ({port, host}) ->
        # Connect to redis database
        @db = redis.createClient(port, host)
    
    close: ->
        # Close redis connection
        @db.end()
    
    escape: (value) ->
        if /^([a-zA-Z0-9_\:\-]+)$/.test "#{value}"
            return "#{value}"
        else
            return "'"+"#{value}".split('\\').join('\\\\').split('\'').join('\\\'')+"'"
    
    dump: ({filter}, callback) ->
        keys = []
        types = []
        values = []
        
        run [
            # Get keys matching filter
            (next) =>
                @db.keys filter, next
            
            # For each key, get its type
            (reply, next) =>
                multi = @db.multi()
                for key in reply
                    keys.push key
                    multi.type key
                multi.exec next
            
            # Get data of each key according to its type
            (replies, next) =>
                multi = @db.multi()
                for type, i in replies
                    types.push type
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
            
            # Render result as the requested format
            (replies, next) =>
                for value in replies
                    values.push value
                
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
                            commands.push "SADD    #{@escape key} #{(@escape(item) for item in value).join(' ')}"
                        when 'zset'
                            commands.push "DEL     #{@escape key}"
                            commands.push "ZADD    #{@escape key} #{((@escape(value[j+1])+' '+@escape(value[j])) for item, j in value by 2).join(' ')}"
                        when 'hash'
                            commands.push "DEL     #{@escape key}"
                            commands.push "HMSET   #{@escape key} #{((@escape(k)+' '+@escape(v)) for k, v of value).join(' ')}"

                # Return result
                callback null, commands.join("\n")
                    

        ], (err) ->
            callback err