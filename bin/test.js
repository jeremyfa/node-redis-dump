(function() {
  var dump;

  dump = require('./dump');

  dump({
    filter: '*'
  }, function(err, result) {
    if (err != null) return process.stderr.write("" + err + "\n");
    return console.log(result);
  });

}).call(this);
