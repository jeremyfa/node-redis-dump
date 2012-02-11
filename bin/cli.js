(function() {
  var argv, doDump, dump, fs, package, params, path, _ref, _ref2, _ref3, _ref4;

  fs = require('fs');

  path = require('path');

  argv = require('optimist').argv;

  dump = require('./dump');

  package = JSON.parse(fs.readFileSync(path.normalize(__dirname + '/../package.json'), 'utf8'));

  if (argv.help) {
    console.log("" + package.name + " " + package.version + "\n\nUsage: redis-dump [OPTIONS]\n  -h <hostname>    Server hostname (default: 127.0.0.1)\n  -p <port>        Server port (default: 6379)\n  -f <filter>      Query filter (default: *)\n  --convert        Convert from json to redis commands\n  --help           Output this help and exit\n  --json           Output result as json\n  --pretty         Make pretty indented output (use with --json)\n\nExamples:\n  redis-dump\n  redis-dump -p 6500\n  redis-dump -f 'mydb:*' > mydb.dump.txt\n  redis-dump --json > mydb.json\n  cat mydb.json | redis-dump --convert\n\nThe output is a valid list of redis commands.\nThat means the following will work:\n  redis-dump > dump.txt      # Dump redis database\n  cat dump.txt | redis-cli   # Import redis database from generated file\n");
  } else {
    params = {
      filter: (_ref = argv.f) != null ? _ref : '*',
      port: (_ref2 = argv.p) != null ? _ref2 : 6379,
      host: (_ref3 = argv.h) != null ? _ref3 : '127.0.0.1',
      format: argv.json ? 'json' : 'redis',
      pretty: (_ref4 = argv.pretty) != null ? _ref4 : false
    };
    doDump = function() {
      return dump(params, function(err, result) {
        var _ref5;
        if (err != null) {
          return process.stderr.write("" + ((_ref5 = err.message) != null ? _ref5 : err) + "\n");
        }
        if ((result != null) && ("" + result).replace(/^\s+/, '').replace(/\s+$/, '') !== '') {
          console.log(result);
          return process.exit(0);
        }
      });
    };
    if (argv.convert) {
      params.convert = '';
      process.stdin.resume();
      process.stdin.on('data', function(chunk) {
        return params.convert += "" + chunk;
      });
      process.stdin.on('end', function() {
        return doDump();
      });
    } else {
      doDump();
    }
  }

}).call(this);
