var Dockerode = require('dockerode');
var DockerodeCompose = require('../lib/compose');

var docker = new Dockerode();
var compose = new DockerodeCompose(docker);

(async () => {
  var state = await compose.up('./test/wordpress.yml', 'wordpress');
  console.log(state);
})();
