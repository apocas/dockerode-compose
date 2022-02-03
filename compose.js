const yaml = require('js-yaml');
const fs = require('fs');
const stream = require('stream');

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

  async down(options) {
    var output = {};
    try { 
      output.file = this.file;
      output.services = await services.down(this.docker, this.projectName, this.recipe, output, options);
      output.networks = await networks.down(this.docker, this.projectName, this.recipe, output);
      if (options !== undefined) {
        if (options.volumes) {
          output.volumes = await volumes.down(this.docker, this.projectName, this.recipe, output);
        }
      }
      return output;
    } catch (e) {
      throw e;
    }
  }

  async up(options) {
    var output = {};
    try {
      output.file = this.file;
      output.secrets = await secrets(this.docker, this.projectName, this.recipe, output);
      output.volumes = await volumes.up(this.docker, this.projectName, this.recipe, output);
      output.configs = await configs(this.docker, this.projectName, this.recipe, output);
      output.networks = await networks.up(this.docker, this.projectName, this.recipe, output);
      output.services = await services.up(this.docker, this.projectName, this.recipe, output, options);
      return output;
    } catch (e) {
      throw e;
    }
  }

  async pull(serviceN, options) {
    options = options || {};
    var streams = [];
    var serviceNames = (serviceN === undefined || serviceN === null) ? tools.sortServices(this.recipe) : [serviceN];
    for (var serviceName of serviceNames) {
      var service = this.recipe.services[serviceName];
      try {
        var streami = await this.docker.pull(service.image);
        streams.push(streami);

        if (options.verbose === true) {
          streami.pipe(process.stdout);
        }

        if (options.streams !== true) {
          if (options.verbose === true) {
            streami.pipe(process.stdout);
          } else {
            streami.pipe(stream.PassThrough());
          }
          await new Promise(fulfill => streami.once('end', fulfill));
        }
      } catch (e) {
        throw e;
      }
    }
    return streams;
  }
}

module.exports = Compose;