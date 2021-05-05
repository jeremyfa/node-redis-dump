(function() {
  var argv, doDump, dump, fs, params, path, pkg, ref, ref1, ref2, ref3, ref4, ref5;

  fs = require('fs');

  path = require('path');

  argv = require('optimist').argv;

  dump = require('./dump');

  pkg = JSON.parse(fs.readFileSync(path.normalize(__dirname + '/../package.json'), 'utf8'));

  if (argv.help) {
    console.log(pkg.name + " " + pkg.version + "\n\nUsage: redis-dumpz [OPTIONS]\n  -h <hostname>    Server hostname (default: 127.0.0.1)\n  -p <port>        Server port (default: 6379)\n  -d <db>          Database number (default: 0)\n  -a <auth>        Password\n  -f <filter>      Query filter (default: *)\n  --convert        Convert from json to redis commands\n  --help           Output this help and exit\n  --json           Output result as json\n  --pretty         Make pretty indented output (use with --json)\n\nExamples:\n  redis-dumpz\n  redis-dumpz -p 6500\n  redis-dumpz -f 'mydb:*' > mydb.dump.txt\n  redis-dumpz --json > mydb.json\n  cat mydb.json | redis-dumpz --convert\n\nThe output is a valid list of redis commands.\nThat means the following will work:\n  redis-dumpz > dump.txt      # Dump redis database\n  cat dump.txt | redis-cli   # Import redis database from generated file\n");
  } else {
    params = {
      filter: (ref = argv.f) != null ? ref : '*',
      db: (ref1 = argv.d) != null ? ref1 : 0,
      port: (ref2 = argv.p) != null ? ref2 : 6379,
      auth: (ref3 = argv.a) != null ? ref3 : null,
      host: (ref4 = argv.h) != null ? ref4 : '127.0.0.1',
      format: argv.json ? 'json' : 'redis',
      pretty: (ref5 = argv.pretty) != null ? ref5 : false
    };
    doDump = function() {
      return dump(params, function(err, result) {
        var ref6;
        if (err != null) {
          return process.stderr.write(((ref6 = err.message) != null ? ref6 : err) + "\n");
        }
        if ((result != null) && ("" + result).replace(/^\s+/, '').replace(/\s+$/, '') !== '') {
          console.log(result);
        }
        return process.exit(0);
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
