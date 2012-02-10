# redis-dump

Dump redis database into redis cli commands

## Installation

### Installing npm (node package manager)
``` bash
  $ curl http://npmjs.org/install.sh | sh
```

### Installing redis-dump
``` bash
  $ [sudo] npm install redis-dump -g
```

**Note:** If you are using redis-dump _programatically_ you should not install it globally. 

``` bash
  $ cd /path/to/your/project
  $ [sudo] npm install redis-dump
```

## Usage
There are two distinct ways to use redis-dump: through the command line interface, or by requiring the redis-dump module in your own code.

### Using redis-dump from the command line
You can use forever to run any kind of script continuously (whether it is written in node.js or not). The usage options are simple:

```
  $ redis-dump --help
  Usage: redis-dump [OPTIONS]
    -h <hostname>  Server hostname (default: 127.0.0.1)
    -p <port>    Server port (default: 6379)
    -f <filter>    Query filter (default: *)
    --help       Output this help and exit

  Examples:
    redis-dump
    redis-dump -p 6500
    redis-dump -f 'mydb:*' > mydb.dump.txt

  The output is a valid list of redis commands.
  That means the following will work:
    redis-dump > dump.txt      # Dump redis database
    cat dump.txt | redis-cli   # Import redis database from generated file
```

### Using redis-dump from node.js
You can also use redis-dump from inside your own node.js code.

``` js
  var dump = require('redis-dump');

  dump({
    // These are default values, you can omit them
    filter: '*',
    port: 6379,
    host: '127.0.0.1'
  },
  function(err, result){
    // Do something with result
  });

```