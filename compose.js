const yaml = require('js-yaml');
const fs = require('fs');

const secrets = require('./lib/secrets');
const volumes = require('./lib/volumes');
const configs = require('./lib/configs');
const networks = require('./lib/networks');
const services = require('./lib/services');
const tools = require('./lib/tools');

class Compose {
  constructor(dockerode, file, projectName) {
    this.docker = dockerode;

    if (file === undefined || projectName === undefined) {
      throw new Error('please specify a file and a project name');
    }

    this.file = file;
    this.projectName = projectName;

    try {
      this.recipe = yaml.load(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      throw e;
    }
  }

  async up() {
    var output = {};
    try {
      output.secrets = await secrets(this.docker, this.projectName, this.recipe, output);
      output.volumes = await volumes(this.docker, this.projectName, this.recipe, output);
      output.configs = await configs(this.docker, this.projectName, this.recipe, output);
      output.networks = await networks(this.docker, this.projectName, this.recipe, output);
      output.services = await services(this.docker, this.projectName, this.recipe, output);
      return output;
    } catch (e) {
      throw e;
    }
  }

  //ToDo: create a version with followprogress with onFinished
  async pull(serviceN) {
    var streams = [];
    var serviceNames = (serviceN !== undefined) ? [serviceN] : tools.sortServices(this.recipe);
    for (var serviceName of serviceNames) {
      var service = this.recipe.services[serviceName];
      try {
        streams.push(await this.docker.pull(service.image));
      } catch (e) {
        throw e;
      }
    }
    return streams;
  }
}

module.exports = Compose;