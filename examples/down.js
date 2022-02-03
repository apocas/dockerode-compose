var Dockerode = require('dockerode');
var DockerodeCompose = require('../compose');

var docker = new Dockerode();
var compose = new DockerodeCompose(
  docker,
  './test/assets/wordpress_original.yml',
  'wordpress'
);

(async () => {
  var state = await compose.down({ volumes: true });
  console.log(state);
})();
