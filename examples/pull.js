var Dockerode = require('dockerode');
var DockerodeCompose = require('../compose');

var docker = new Dockerode();
var compose = new DockerodeCompose(docker, './test/assets/wordpress.yml', 'wordpress');

(async () => {
  console.log(await compose.pull());
})();
