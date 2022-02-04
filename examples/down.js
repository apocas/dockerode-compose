var Dockerode = require('dockerode');
var DockerodeCompose = require('../compose');

var docker = new Dockerode();

var yamlFile = './test/assets/wordpress_original.yml'
var projectName = 'wordpress'

if (process.argv.length > 2) {
  if (process.argv[2] !== undefined) {
    yamlFile = process.argv[2]
  }
  if (process.argv[3] !== undefined) {
    projectName = process.argv[3]
  }
}

var compose = new DockerodeCompose(docker, yamlFile, projectName);

(async () => {
  var state = await compose.down({ volumes: true });
  console.log(state);
})();
