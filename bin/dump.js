(function() {
  var RedisDumper, redis, run,
    __slice = Array.prototype.slice;

  run = require('async').waterfall;

  redis = require('redis');

  module.exports = function(params, callback) {
    var dumper;
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
      var filter, keys, ttls, types, values,
        _this = this;
      filter = _arg.filter;
      keys = [];
      types = [];
      values = [];
      ttls = [];
      return run([
        function(next) {
          return _this.db.keys(filter, next);
        }, function(reply, next) {
          var key, multi, _i, _len;
          multi = _this.db.multi();
          for (_i = 0, _len = reply.length; _i < _len; _i++) {
            key = reply[_i];
            keys.push(key);
            multi.type(key);
          }
          return multi.exec(next);
        }, function(replies, next) {
          var i, multi, type, _len;
          multi = _this.db.multi();
          for (i = 0, _len = replies.length; i < _len; i++) {
            type = replies[i];
            types.push(type);
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
        }, function(replies, next) {
          var key, multi, value, _i, _j, _len, _len2;
          for (_i = 0, _len = replies.length; _i < _len; _i++) {
            value = replies[_i];
            values.push(value);
          }
          multi = _this.db.multi();
          for (_j = 0, _len2 = keys.length; _j < _len2; _j++) {
            key = keys[_j];
            multi.ttl(key);
          }
          return multi.exec(next);
        }, function(replies, next) {
          var commands, i, item, j, k, key, ttl, type, v, value, _i, _len, _len2;
          for (_i = 0, _len = replies.length; _i < _len; _i++) {
            ttl = replies[_i];
            ttls.push(ttl);
          }
          commands = [];
          for (i = 0, _len2 = types.length; i < _len2; i++) {
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
                  var _j, _len3, _results;
                  _results = [];
                  for (_j = 0, _len3 = value.length; _j < _len3; _j++) {
                    item = value[_j];
                    _results.push(this.escape(item));
                  }
                  return _results;
                }).call(_this)).join(' ')));
                break;
              case 'set':
                commands.push("DEL     " + (_this.escape(key)));
                commands.push("SADD    " + (_this.escape(key)) + " " + (((function() {
                  var _j, _len3, _results;
                  _results = [];
                  for (_j = 0, _len3 = value.length; _j < _len3; _j++) {
                    item = value[_j];
                    _results.push(this.escape(item));
                  }
                  return _results;
                }).call(_this)).join(' ')));
                break;
              case 'zset':
                commands.push("DEL     " + (_this.escape(key)));
                commands.push("ZADD    " + (_this.escape(key)) + " " + (((function() {
                  var _len3, _results, _step;
                  _results = [];
                  for (j = 0, _len3 = value.length, _step = 2; j < _len3; j += _step) {
                    item = value[j];
                    _results.push(this.escape(value[j + 1]) + ' ' + this.escape(value[j]));
                  }
                  return _results;
                }).call(_this)).join(' ')));
                break;
              case 'hash':
                commands.push("DEL     " + (_this.escape(key)));
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
            ttl = parseInt(ttls[i], 10);
            if (!isNaN(ttl) && ttl !== -1) {
              commands.push("EXPIRE  " + (_this.escape(key)) + " " + ttl);
            }
          }
          return callback(null, commands.join("\n"));
        }
      ], function(err) {
        return callback(err);
      });
    };

    return RedisDumper;

  })();

}).call(this);
