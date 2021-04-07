const yaml = require('js-yaml');
const fs = require('fs');

const secrets = require('./lib/secrets');
const volumes = require('./lib/volumes');
const configs = require('./lib/configs');
const networks = require('./lib/networks');
const services = require('./lib/services');

class Compose {
  constructor(dockerode) {
    this.docker = dockerode;
  }

  async up(file, projectName) {
    var self = this;
    var output = {};
    if (projectName === undefined) {
      throw new Error('please specify a project name');
    }
    self.projectName = projectName;
    try {
      self.recipe = yaml.load(fs.readFileSync(file, 'utf8'));
      output.secrets = await secrets(self.docker, self.projectName, self.recipe, output);
      output.volumes = await volumes(self.docker, self.projectName, self.recipe, output);
      output.configs = await configs(self.docker, self.projectName, self.recipe, output);
      output.networks = await networks(self.docker, self.projectName, self.recipe, output);
      output.services = await services(self.docker, self.projectName, self.recipe, output);
      return output;
    } catch (e) {
      throw e;
    }
  }
}

module.exports = Compose;