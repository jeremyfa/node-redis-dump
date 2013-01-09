# redis-dump

Dump redis database into redis commands or json with command line or node.js

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
The usage options are simple:

```
$ redis-dump --help
Usage: redis-dump [OPTIONS]
  -h <hostname>    Server hostname (default: 127.0.0.1)
  -p <port>        Server port (default: 6379)
  -d <database>    Database to be selected (default: 0)
  -f <filter>      Query filter (default: *)
  --convert        Convert from json to redis commands
  --help           Output this help and exit
  --json           Output result as json
  --pretty         Make pretty indented output (use with --json)

Examples:
  redis-dump
  redis-dump -p 6500
  redis-dump -f 'mydb:*' > mydb.dump.txt
  redis-dump --json > mydb.json

The output is a valid list of redis commands.
That means the following will work:
  redis-dump > dump.txt      # Dump redis database
  cat dump.txt | redis-cli   # Import redis database from generated file
```

### Example
Let's say we have created a brand new redis database and have got the data generated from these commands:

```
RPUSH   mydb:numberlist one two three
SADD    mydb:numberset one two three
ZADD    mydb:sortednumberset 1000 one 2000 two 3000 three
HMSET   mydb:article:4 title 'Hello World' id 4
SET     mydb:numvisits 34
SET     mydb:volatile 'nothing important'
EXPIRE  mydb:volatile 3600
```

If we call redis-dump, the output will look like this:

``` bash
$ redis-dump -f 'mydb:*'
DEL     mydb:numberlist
RPUSH   mydb:numberlist one two three
DEL     mydb:numberset
SADD    mydb:numberset three two one
DEL     mydb:sortednumberset
ZADD    mydb:sortednumberset 1000 one 2000 two 3000 three
DEL     mydb:article:4
HMSET   mydb:article:4 title 'Hello World' id 4
SET     mydb:numvisits 34
DEL     mydb:volatile
SET     mydb:volatile 'nothing important'
EXPIRE  mydb:volatile 3600
```

And with json output:

``` bash
$ redis-dump -f 'mydb:*' --json
{"mydb:numberlist":{"type":"list","value":["one","two","three"]},"mydb:numberset":{"type":"set","value":["three","two","one"]},"mydb:sortednumberset":{"type":"zset","value":[[1000,"one"],[2000,"two"],[3000,"three"]]},"mydb:volatile":{"type":"string","value":"nothing important","ttl":3466},"mydb:article:4":{"type":"hash","value":{"title":"Hello World","id":"4"}},"mydb:numvisits":{"type":"string","value":"34"}}
  
$ redis-dump -f 'mydb:*' --json --pretty > mydb.json
```

The json maps all the informations from redis database in a handy way for other programming languages.

``` js
{
    "mydb:numberlist": {
        "type": "list",
        "value": [
            "one",
            "two",
            "three"
        ]
    },
    "mydb:numberset": {
        "type": "set",
        "value": [
            "three",
            "two",
            "one"
        ]
    },
    "mydb:sortednumberset": {
        "type": "zset",
        "value": [
            [
                1000,
                "one"
            ],
            [
                2000,
                "two"
            ],
            [
                3000,
                "three"
            ]
        ]
    },
    "mydb:volatile": {
        "type": "string",
        "value": "nothing important",
        "ttl": 3466
    },
    "mydb:article:4": {
        "type": "hash",
        "value": {
            "title": "Hello World",
            "id": "4"
        }
    },
    "mydb:numvisits": {
        "type": "string",
        "value": "34"
    }
}
```

You can also convert json back to redis commands.

``` bash
$ cat mydb.json | redis-dump --convert
DEL     mydb:numberlist
RPUSH   mydb:numberlist one two three
DEL     mydb:numberset
SADD    mydb:numberset three two one
DEL     mydb:sortednumberset
ZADD    mydb:sortednumberset 1000 one 2000 two 3000 three
DEL     mydb:article:4
HMSET   mydb:article:4 title 'Hello World' id 4
SET     mydb:numvisits 34
DEL     mydb:volatile
SET     mydb:volatile 'nothing important'
EXPIRE  mydb:volatile 3466
```

Then, import your data back to redis can be done in one line from either format:

``` bash
$ cat mydb.json | redis-dump --convert | redis-cli # from json
  
$ cat dump.txt | redis-cli # from redis commands
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

## License 

(The MIT License)

Copyright (c) 2011-2012 Jérémy Faivre &lt;contact@jeremyfa.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.