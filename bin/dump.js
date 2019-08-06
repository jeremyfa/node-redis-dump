(function() {
  var RedisDumper, redis, run;

  run = require('async').waterfall;

  redis = require('redis');

  module.exports = function(params, callback) {
    var dumper;
    if (params.port == null) {
      params.port = 6379;
    }
    if (params.host == null) {
      params.host = '127.0.0.1';
    }
    if (params.db == null) {
      params.db = '0';
    }
    if (params.filter == null) {
      params.filter = '*';
    }
    if (params.format == null) {
      params.format = 'redis';
    }
    if (params.convert == null) {
      params.convert = null;
    }
    dumper = new RedisDumper(params);
    return dumper.dump(params, function(...params) {
      dumper.close();
      return callback(...params);
    });
  };

  RedisDumper = class RedisDumper {
    constructor({port, host, auth}) {
      // Connect to redis database
      if (auth != null) {
        this.db = redis.createClient(port, host, {
          auth_pass: auth
        });
      } else {
        this.db = redis.createClient(port, host);
      }
    }

    close() {
      // Close redis connection
      return this.db.quit();
    }

    escape(value) {
      if (/^([a-zA-Z0-9_\:\-]+)$/.test(`${value}`)) {
        return `${value}`;
      } else {
        return "'" + `${value}`.split('\\').join('\\\\').split('\'').join('\\\'') + "'";
      }
    }

    dump({db, filter, format, convert, pretty}, callback) {
      var e, keys, ttls, types, values;
      keys = [];
      types = [];
      values = [];
      ttls = [];
      if (typeof convert === 'string') {
        try {
          convert = JSON.parse(convert);
        } catch (error) {
          e = error;
          return callback(e);
        }
      }
      this.db.select(db);
      return run([
        // Get keys matching filter
        (next) => {
          var k;
          try {
            if (convert != null) {
              return next(null,
        (function() {
                var results;
                results = [];
                for (k in convert) {
                  results.push(k);
                }
                return results;
              })());
            } else {
              return this.db.keys(filter,
        next);
            }
          } catch (error) {
            e = error;
            return next(e);
          }
        },
        // For each key, get its type
        (reply,
        next) => {
          var k,
        key,
        l,
        len1,
        len2,
        m,
        multi,
        v;
          try {
            for (l = 0, len1 = reply.length; l < len1; l++) {
              key = reply[l];
              keys.push(key);
            }
            // If there are no keys, return now
            if (keys.length === 0) {
              if (format === 'json') {
                callback(null,
        '{}');
              } else if (format === 'raw') {
                callback(null,
        {});
              } else {
                callback(null,
        '');
              }
              next(null,
        null);
              return;
            }
            // Sort keys in alphabetic order (better for versioning)
            keys = keys.sort();
            if (convert != null) {
              return next(null,
        (function() {
                var results;
                results = [];
                for (k in convert) {
                  v = convert[k];
                  results.push(v.type);
                }
                return results;
              })());
            } else {
              multi = this.db.multi();
              for (m = 0, len2 = keys.length; m < len2; m++) {
                key = keys[m];
                multi.type(key);
              }
              return multi.exec(next);
            }
          } catch (error) {
            e = error;
            return next(e);
          }
        },
        // Get data of each key according to its type
        (replies,
        next) => {
          var entry,
        i,
        l,
        len1,
        len2,
        len3,
        len4,
        m,
        multi,
        n,
        o,
        ref,
        result,
        type,
        val;
          try {
            if (keys.length === 0) {
              next(null,
        null);
              return;
            }
            for (l = 0, len1 = replies.length; l < len1; l++) {
              type = replies[l];
              types.push(type);
            }
            if (convert != null) {
              result = [];
              for (i = m = 0, len2 = types.length; m < len2; i = ++m) {
                type = types[i];
                switch (type) {
                  case 'string':
                    result.push(convert[keys[i]].value);
                    break;
                  case 'list':
                    result.push(convert[keys[i]].value);
                    break;
                  case 'set':
                    result.push(convert[keys[i]].value);
                    break;
                  case 'zset':
                    val = [];
                    ref = convert[keys[i]].value;
                    for (n = 0, len3 = ref.length; n < len3; n++) {
                      entry = ref[n];
                      val.push(entry[1]);
                      val.push(entry[0]);
                    }
                    result.push(val);
                    break;
                  case 'hash':
                    result.push(convert[keys[i]].value);
                }
              }
              return next(null,
        result);
            } else {
              multi = this.db.multi();
              for (i = o = 0, len4 = types.length; o < len4; i = ++o) {
                type = types[i];
                switch (type) {
                  case 'string':
                    multi.get(keys[i]);
                    break;
                  case 'list':
                    multi.lrange(keys[i],
        0,
        -1);
                    break;
                  case 'set':
                    multi.smembers(keys[i]);
                    break;
                  case 'zset':
                    multi.zrange(keys[i],
        0,
        -1,
        'withscores');
                    break;
                  case 'hash':
                    multi.hgetall(keys[i]);
                }
              }
              return multi.exec(next);
            }
          } catch (error) {
            e = error;
            return next(e);
          }
        },
        // Get TTL of each key
        (replies,
        next) => {
          var key,
        l,
        len1,
        len2,
        len3,
        m,
        multi,
        n,
        result,
        value;
          try {
            if (keys.length === 0) {
              next(null,
        null);
              return;
            }
            for (l = 0, len1 = replies.length; l < len1; l++) {
              value = replies[l];
              values.push(value);
            }
            if (convert != null) {
              result = [];
              for (m = 0, len2 = keys.length; m < len2; m++) {
                key = keys[m];
                if (convert[key].ttl != null) {
                  result.push(`${convert[key].ttl}`);
                } else {
                  result.push("-1");
                }
              }
              return next(null,
        result);
            } else {
              multi = this.db.multi();
              for (n = 0, len3 = keys.length; n < len3; n++) {
                key = keys[n];
                multi.ttl(key);
              }
              return multi.exec(next);
            }
          } catch (error) {
            e = error;
            return next(e);
          }
        },
        // Render result as the requested format
        (replies,
        next) => {
          var commands,
        i,
        item,
        j,
        json,
        k,
        key,
        l,
        len,
        len1,
        len2,
        len3,
        m,
        n,
        ttl,
        type,
        v,
        value;
          try {
            if (keys.length === 0) {
              next(null,
        null);
              return;
            }
            for (l = 0, len1 = replies.length; l < len1; l++) {
              ttl = replies[l];
              ttls.push(ttl);
            }
            switch (format) {
              case 'json' || 'raw':
                // Create json from key's type and data (default)
                json = {};
                for (i = m = 0, len2 = types.length; m < len2; i = ++m) {
                  type = types[i];
                  key = keys[i];
                  value = values[i];
                  switch (type) {
                    case 'string':
                      json[key] = {
                        type: 'string',
                        value: value
                      };
                      break;
                    case 'list':
                      json[key] = {
                        type: 'list',
                        value: value
                      };
                      break;
                    case 'set':
                      json[key] = {
                        type: 'set',
                        value: value.sort() // Sort set for better versioning
                      };
                      break;
                    case 'zset':
                      json[key] = {
                        type: 'zset',
                        value: (function() {
                          var len3,
        n,
        results;
                          results = [];
                          for (j = n = 0, len3 = value.length; n < len3; j = n += 2) {
                            item = value[j];
                            results.push([parseInt(value[j + 1],
        10),
        value[j]]);
                          }
                          return results;
                        })()
                      };
                      break;
                    case 'hash':
                      json[key] = {
                        type: 'hash',
                        value: value
                      };
                  }
                  ttl = parseInt(ttls[i],
        10);
                  if (!isNaN(ttl) && ttl !== -1) {
                    json[key].ttl = ttl;
                  }
                }
                // Return result
                if (format === 'json') {
                  if (pretty) {
                    return callback(null,
        JSON.stringify(json,
        null,
        4));
                  } else {
                    return callback(null,
        JSON.stringify(json));
                  }
                } else {
                  return callback(null,
        json);
                }
                break;
              default:
                // Create redis-cli compliant commands from key's type and data (default)
                commands = [];
                for (i = n = 0, len3 = types.length; n < len3; i = ++n) {
                  type = types[i];
                  key = keys[i];
                  value = values[i];
                  switch (type) {
                    case 'string':
                      commands.push(`SET     ${this.escape(key)} ${this.escape(value)}`);
                      break;
                    case 'list':
                      commands.push(`DEL     ${this.escape(key)}`);
                      commands.push(`RPUSH   ${this.escape(key)} ${((function() {
                        var len4,
        o,
        results;
                        results = [];
                        for (o = 0, len4 = value.length; o < len4; o++) {
                          item = value[o];
                          results.push(this.escape(item));
                        }
                        return results;
                      }).call(this)).join(' ')}`);
                      break;
                    case 'set':
                      commands.push(`DEL     ${this.escape(key)}`);
                      if (value.length !== 0) {
                        commands.push(`SADD    ${this.escape(key)} ${((function() {
                          var len4,
        o,
        results;
                          results = [];
                          for (o = 0, len4 = value.length; o < len4; o++) {
                            item = value[o];
                            results.push(this.escape(item));
                          }
                          return results;
                        }).call(this)).join(' ')}`);
                      }
                      break;
                    case 'zset':
                      commands.push(`DEL     ${this.escape(key)}`);
                      if (value.length !== 0) {
                        commands.push(`ZADD    ${this.escape(key)} ${((function() {
                          var len4,
        o,
        results;
                          results = [];
                          for (j = o = 0, len4 = value.length; o < len4; j = o += 2) {
                            item = value[j];
                            results.push(this.escape(value[j + 1]) + ' ' + this.escape(value[j]));
                          }
                          return results;
                        }).call(this)).join(' ')}`);
                      }
                      break;
                    case 'hash':
                      commands.push(`DEL     ${this.escape(key)}`);
                      len = 0;
                      for (k in value) {
                        len++;
                      }
                      if (len !== 0) {
                        commands.push(`HMSET   ${this.escape(key)} ${((function() {
                          var results;
                          results = [];
                          for (k in value) {
                            v = value[k];
                            results.push(this.escape(k) + ' ' + this.escape(v));
                          }
                          return results;
                        }).call(this)).join(' ')}`);
                      }
                  }
                  ttl = parseInt(ttls[i],
        10);
                  if (!isNaN(ttl) && ttl !== -1) {
                    commands.push(`EXPIRE  ${this.escape(key)} ${ttl}`);
                  }
                }
                // Return result
                return callback(null,
        commands.join("\n"));
            }
          } catch (error) {
            e = error;
            return next(e);
          }
        }
      ], function(err) {
        return callback(err);
      });
    }

  };

}).call(this);
