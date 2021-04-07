const yaml = require('js-yaml');
const fs = require('fs');

const secrets = require('./secrets');
const volumes = require('./volumes');
const configs = require('./configs');
const networks = require('./networks');
const services = require('./services');

class Compose {
  constructor(dockerode) {
    this.docker = dockerode;
  }

  async compose(file, projectName) {
    var self = this;
    var output = {};
    if (projectName === undefined) {
      throw new Error('please specify a project name');
    }
    self.projectName = projectName;
    try {
      self.recipe = yaml.load(fs.readFileSync(file, 'utf8'));
      output.secrets = await secrets(self.docker, self.projectName, self.recipe);
      output.volumes = await volumes(self.docker, self.projectName, self.recipe);
      output.configs = await configs(self.docker, self.projectName, self.recipe);
      output.networks = await networks(self.docker, self.projectName, self.recipe);
      output.services = await services(self.docker, self.projectName, self.recipe);
      return output;
    } catch (e) {
      throw e;
    }
  }
}

module.exports = Compose;