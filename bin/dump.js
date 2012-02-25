(function() {
  var RedisDumper, redis, run,
    __slice = Array.prototype.slice;

  run = require('async').waterfall;

  redis = require('redis');

  module.exports = function(params, callback) {
    var dumper;
    if (params.port == null) params.port = 6379;
    if (params.host == null) params.host = '127.0.0.1';
    if (params.filter == null) params.filter = '*';
    if (params.format == null) params.format = 'redis';
    if (params.convert == null) params.convert = null;
    dumper = new RedisDumper(params);
    return dumper.dump(params, function() {
      var params;
      params = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      dumper.close();
      return callback.apply(null, params);
    });
  };

  RedisDumper = (function() {

    function RedisDumper(_arg) {
      var host, port;
      port = _arg.port, host = _arg.host;
      this.db = redis.createClient(port, host);
    }

    RedisDumper.prototype.close = function() {
      return this.db.end();
    };

    RedisDumper.prototype.escape = function(value) {
      if (/^([a-zA-Z0-9_\:\-]+)$/.test("" + value)) {
        return "" + value;
      } else {
        return "'" + ("" + value).split('\\').join('\\\\').split('\'').join('\\\'') + "'";
      }
    };

    RedisDumper.prototype.dump = function(_arg, callback) {
      var convert, filter, format, keys, pretty, ttls, types, values,
        _this = this;
      filter = _arg.filter, format = _arg.format, convert = _arg.convert, pretty = _arg.pretty;
      keys = [];
      types = [];
      values = [];
      ttls = [];
      if (typeof convert === 'string') {
        try {
          convert = JSON.parse(convert);
        } catch (e) {
          return callback(e);
        }
      }
      return run([
        function(next) {
          var k;
          try {
            if (convert != null) {
              return next(null, (function() {
                var _results;
                _results = [];
                for (k in convert) {
                  _results.push(k);
                }
                return _results;
              })());
            } else {
              return _this.db.keys(filter, next);
            }
          } catch (e) {
            return next(e);
          }
        }, function(reply, next) {
          var k, key, multi, v, _i, _j, _len, _len2;
          try {
            for (_i = 0, _len = reply.length; _i < _len; _i++) {
              key = reply[_i];
              keys.push(key);
            }
            keys = keys.sort();
            if (convert != null) {
              return next(null, (function() {
                var _results;
                _results = [];
                for (k in convert) {
                  v = convert[k];
                  _results.push(v.type);
                }
                return _results;
              })());
            } else {
              multi = _this.db.multi();
              for (_j = 0, _len2 = keys.length; _j < _len2; _j++) {
                key = keys[_j];
                multi.type(key);
              }
              return multi.exec(next);
            }
          } catch (e) {
            return next(e);
          }
        }, function(replies, next) {
          var entry, i, multi, result, type, val, _i, _j, _len, _len2, _len3, _len4, _ref;
          try {
            for (_i = 0, _len = replies.length; _i < _len; _i++) {
              type = replies[_i];
              types.push(type);
            }
            if (convert != null) {
              result = [];
              for (i = 0, _len2 = types.length; i < _len2; i++) {
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
                    _ref = convert[keys[i]].value;
                    for (_j = 0, _len3 = _ref.length; _j < _len3; _j++) {
                      entry = _ref[_j];
                      val.push(entry[1]);
                      val.push(entry[0]);
                    }
                    result.push(val);
                    break;
                  case 'hash':
                    result.push(convert[keys[i]].value);
                }
              }
              return next(null, result);
            } else {
              multi = _this.db.multi();
              for (i = 0, _len4 = types.length; i < _len4; i++) {
                type = types[i];
                switch (type) {
                  case 'string':
                    multi.get(keys[i]);
                    break;
                  case 'list':
                    multi.lrange(keys[i], 0, -1);
                    break;
                  case 'set':
                    multi.smembers(keys[i]);
                    break;
                  case 'zset':
                    multi.zrange(keys[i], 0, -1, 'withscores');
                    break;
                  case 'hash':
                    multi.hgetall(keys[i]);
                }
              }
              return multi.exec(next);
            }
          } catch (e) {
            return next(e);
          }
        }, function(replies, next) {
          var key, multi, result, value, _i, _j, _k, _len, _len2, _len3;
          try {
            for (_i = 0, _len = replies.length; _i < _len; _i++) {
              value = replies[_i];
              values.push(value);
            }
            if (convert != null) {
              result = [];
              for (_j = 0, _len2 = keys.length; _j < _len2; _j++) {
                key = keys[_j];
                if (convert[key].ttl != null) {
                  result.push("" + convert[key].ttl);
                } else {
                  result.push("-1");
                }
              }
              return next(null, result);
            } else {
              multi = _this.db.multi();
              for (_k = 0, _len3 = keys.length; _k < _len3; _k++) {
                key = keys[_k];
                multi.ttl(key);
              }
              return multi.exec(next);
            }
          } catch (e) {
            return next(e);
          }
        }, function(replies, next) {
          var commands, i, item, j, json, k, key, len, ttl, type, v, value, _i, _len, _len2, _len3;
          try {
            for (_i = 0, _len = replies.length; _i < _len; _i++) {
              ttl = replies[_i];
              ttls.push(ttl);
            }
            switch (format) {
              case 'json' || 'raw':
                json = {};
                for (i = 0, _len2 = types.length; i < _len2; i++) {
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
                        value: value.sort()
                      };
                      break;
                    case 'zset':
                      json[key] = {
                        type: 'zset',
                        value: (function() {
                          var _len3, _results, _step;
                          _results = [];
                          for (j = 0, _len3 = value.length, _step = 2; j < _len3; j += _step) {
                            item = value[j];
                            _results.push([parseInt(value[j + 1], 10), value[j]]);
                          }
                          return _results;
                        })()
                      };
                      break;
                    case 'hash':
                      json[key] = {
                        type: 'hash',
                        value: value
                      };
                  }
                  ttl = parseInt(ttls[i], 10);
                  if (!isNaN(ttl) && ttl !== -1) json[key].ttl = ttl;
                }
                if (format === 'json') {
                  if (pretty) {
                    return callback(null, JSON.stringify(json, null, 4));
                  } else {
                    return callback(null, JSON.stringify(json));
                  }
                } else {
                  return callback(null, json);
                }
                break;
              default:
                commands = [];
                for (i = 0, _len3 = types.length; i < _len3; i++) {
                  type = types[i];
                  key = keys[i];
                  value = values[i];
                  switch (type) {
                    case 'string':
                      commands.push("SET     " + (_this.escape(key)) + " " + (_this.escape(value)));
                      break;
                    case 'list':
                      commands.push("DEL     " + (_this.escape(key)));
                      commands.push("RPUSH   " + (_this.escape(key)) + " " + (((function() {
                        var _j, _len4, _results;
                        _results = [];
                        for (_j = 0, _len4 = value.length; _j < _len4; _j++) {
                          item = value[_j];
                          _results.push(this.escape(item));
                        }
                        return _results;
                      }).call(_this)).join(' ')));
                      break;
                    case 'set':
                      commands.push("DEL     " + (_this.escape(key)));
                      if (value.length !== 0) {
                        commands.push("SADD    " + (_this.escape(key)) + " " + (((function() {
                          var _j, _len4, _results;
                          _results = [];
                          for (_j = 0, _len4 = value.length; _j < _len4; _j++) {
                            item = value[_j];
                            _results.push(this.escape(item));
                          }
                          return _results;
                        }).call(_this)).join(' ')));
                      }
                      break;
                    case 'zset':
                      commands.push("DEL     " + (_this.escape(key)));
                      if (value.length !== 0) {
                        commands.push("ZADD    " + (_this.escape(key)) + " " + (((function() {
                          var _len4, _results, _step;
                          _results = [];
                          for (j = 0, _len4 = value.length, _step = 2; j < _len4; j += _step) {
                            item = value[j];
                            _results.push(this.escape(value[j + 1]) + ' ' + this.escape(value[j]));
                          }
                          return _results;
                        }).call(_this)).join(' ')));
                      }
                      break;
                    case 'hash':
                      commands.push("DEL     " + (_this.escape(key)));
                      len = 0;
                      for (k in value) {
                        len++;
                      }
                      if (len !== 0) {
                        commands.push("HMSET   " + (_this.escape(key)) + " " + (((function() {
                          var _results;
                          _results = [];
                          for (k in value) {
                            v = value[k];
                            _results.push(this.escape(k) + ' ' + this.escape(v));
                          }
                          return _results;
                        }).call(_this)).join(' ')));
                      }
                  }
                  ttl = parseInt(ttls[i], 10);
                  if (!isNaN(ttl) && ttl !== -1) {
                    commands.push("EXPIRE  " + (_this.escape(key)) + " " + ttl);
                  }
                }
                return callback(null, commands.join("\n"));
            }
          } catch (e) {
            return next(e);
          }
        }
      ], function(err) {
        return callback(err);
      });
    };

    return RedisDumper;

  })();

}).call(this);
