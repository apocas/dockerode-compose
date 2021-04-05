var Dockerode = require('dockerode');
var DockerodeCompose = require('../lib/compose');

var docker = new Dockerode();
var compose = new DockerodeCompose(docker);

compose.compose('./test/wordpress.yml');