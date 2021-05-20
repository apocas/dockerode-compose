var Dockerode = require('dockerode');
var DockerodeCompose = require('../compose');

var docker = new Dockerode();
var compose = new DockerodeCompose(docker, './test/assets/wordpress_original.yml', 'wordpress');
var compose_complex = new DockerodeCompose(docker, './test/assets/complex_example/docker-compose.yml', 'complex');
var compose_build = new DockerodeCompose(docker, './test/assets/test_build/docker-compose.yml', 'build');

module.exports = {
  'docker': docker,
  'compose': compose,
  'compose_complex': compose_complex,
  'compose_build': compose_build
}