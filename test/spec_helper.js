var Dockerode = require('dockerode');
var DockerodeCompose = require('../compose');

var docker = new Dockerode();
var compose = new DockerodeCompose(docker, './test/assets/wordpress_original.yml', 'dockerodec_wordpress');
var compose_complex = new DockerodeCompose(docker, './test/assets/complex_example/docker-compose.yml', 'dockerodec_complex');
var compose_build = new DockerodeCompose(docker, './test/assets/test_build/docker-compose.yml', 'dockerodec_build');

module.exports = {
  'docker': docker,
  'compose': compose,
  'compose_complex': compose_complex,
  'compose_build': compose_build
}