var Dockerode = require('dockerode');
var DockerodeCompose = require('../compose');

var docker = new Dockerode();
var compose = new DockerodeCompose(docker, './test/assets/wordpress_original.yml', 'wordpress');

module.exports = {
  'docker': docker,
  'compose': compose
}