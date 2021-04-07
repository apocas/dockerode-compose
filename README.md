# dockerode-compose

`docker-compose` in Node.js using [dockerode](https://github.com/apocas/dockerode).

Everything is executed programmatically using `dockerode`, consequently Docker's API.

Work in progress...

Wordpress example builds successfully.

### ToDo:
* HostConfig (and other spec) needs to be finished.
* User friendly functions (partial deploys, etc) needs to be implemented.

## Installation

`npm install dockerode-compose`


### Getting started

To use `dockerode-compose` first you need to instantiate it:

``` js
var Dockerode = require('dockerode');
var DockerodeCompose = require('dockerode-compose');

var docker = new Dockerode();
var compose = new DockerodeCompose(docker);

(async () => {
  var state = await compose.up('./test/wordpress.yml', 'wordpress');
  console.log(state);
})();
```

## Documentation

- compose.up(file, project_name)
- compose.pull(service) 

## Tests

 * Tests are implemented using `mocha` and `chai`. Run them with `npm test`.

## Examples

Check the examples folder for more specific use cases examples.

## License

Pedro Dias - [@pedromdias](https://twitter.com/pedromdias)

Licensed under the Apache license, version 2.0 (the "license"); You may not use this file except in compliance with the license. You may obtain a copy of the license at:

    http://www.apache.org/licenses/LICENSE-2.0.html

Unless required by applicable law or agreed to in writing, software distributed under the license is distributed on an "as is" basis, without warranties or conditions of any kind, either express or implied. See the license for the specific language governing permissions and limitations under the license.
