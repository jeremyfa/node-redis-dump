(function() {
  var argv, dump, fs, package, params, path, _ref, _ref2, _ref3;

  fs = require('fs');

  path = require('path');

  argv = require('optimist').argv;

  dump = require('./dump');

  package = JSON.parse(fs.readFileSync(path.normalize(__dirname + '/../package.json'), 'utf8'));

  if (argv.help) {
    console.log("" + package.name + " " + package.version + "\n\nUsage: redis-dump [OPTIONS]\n  -h <hostname>    Server hostname (default: 127.0.0.1)\n  -p <port>        Server port (default: 6379)\n  -f <filter>      Query filter (default: *)\n  --help           Output this help and exit\n\nExamples:\n  redis-dump\n  redis-dump -p 6500\n  redis-dump -f 'mydb:*' > mydb.dump.txt\n\nThe output is a valid list of redis commands.\nThat means the following will work:\n  redis-dump > dump.txt      # Dump redis database\n  cat dump.txt | redis-cli   # Import redis database from generated file\n");
  } else {
    params = {
      filter: (_ref = argv.f) != null ? _ref : '*',
      port: (_ref2 = argv.p) != null ? _ref2 : 6379,
      host: (_ref3 = argv.h) != null ? _ref3 : '127.0.0.1'
    };
    dump(params, function(err, result) {
      if (err != null) return process.stderr.write("" + err + "\n");
      if ((result != null) && ("" + result).replace(/^\s+/, '').replace(/\s+$/, '') !== '') {
        return console.log(result);
      }
    });
  }

}).call(this);
