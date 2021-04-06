const yaml = require('js-yaml');
const fs = require('fs');

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
      output.secrets = await self.loadSecrets();
      output.volumes = await self.loadVolumes();
      output.configs = await self.loadConfigs();
      output.networks = await self.loadNetworks();
      output.services = await self.loadServices();
      return output;
    } catch (e) {
      throw e;
    }
  }

  async loadSecrets() {
    var secrets = [];
    var secretNames = Object.keys(this.recipe.secrets || []);
    for (var secretName of secretNames) {
      var secret = this.recipe.secrets[secretName];
      if (secret.external === true) continue;
      var opts = {
        'Name': this.projectName + '_' + secretName,
        'Data': fs.readFileSync(secret.file, 'utf8')
      };
      if (secret.name !== undefined) {
        opts.Name = secretName;
      }
      try {
        secrets.push(await this.docker.createSecret(opts));
      } catch (err) {
        throw err;
      }
    }
    return secrets;
  }

  async loadConfigs() {
    var configs = [];
    var configNames = Object.keys(this.recipe.configs || []);
    for (var configName of configNames) {
      var config = this.recipe.configs[configName];
      if (config.external === true) continue;
      var opts = {
        'Name': this.projectName + '_' + configName,
        'Data': fs.readFileSync(config.file, 'utf8')
      };
      if (config.name !== undefined) {
        opts.Name = configName;
      }
      try {
        configs.push(await this.docker.createConfig(opts));
      } catch (err) {
        throw err;
      }
    }
    return configs;
  }

  async loadVolumes() {
    var volumes = [];
    var volumeNames = Object.keys(this.recipe.volumes || []);
    for (var volumeName of volumeNames) {
      var volume = this.recipe.volumes[volumeName];
      if (volume.external === true) continue;
      var opts = {
        'Name': this.projectName + '_' + volumeName,
        'Driver': volume.driver,
        'DriverOpts': volume.driver_opts,
        'Labels': volume.labels
      };
      if (volume.name !== undefined) {
        opts.Name = volumeName;
      }
      try {
        volumes.push(await this.docker.createVolume(opts));
      } catch (err) {
        throw err;
      }
    }
    return volumes;
  }

  async loadNetworks() {
    var networks = [];
    var networkNames = Object.keys(this.recipe.networks || []);
    for (var networkName of networkNames) {
      var network = this.recipe.networks[networkName];
      if (network.external === true) continue;
      var opts = {
        'Name': this.projectName + '_' + networkName,
        'Driver': network.driver,
        'DriverOpts': network.driver_opts,
        'Labels': network.labels,
        'Attachable': network.attachable,
        'EnableIPv6': network.enable_ipv6,
        'Internal': network.internal,
        'CheckDuplicate': true
      };
      if (network.name !== undefined) {
        opts.Name = networkName;
      }
      if (network.ipam !== undefined) {
        opts.IPAM = {
          'Driver': network.ipam.driver,
          'Options': network.ipam.options
        }
        if (network.ipam.config !== undefined) {
          opts.IPAM['Config'] = {
            'Subnet': network.ipam.config.subnet,
            'IPRange': network.ipam.config.ip_range,
            'Gateway': network.ipam.config.gateway,
            'AuxAddress': network.ipam.config.aux_addresses
          }
        }
      }
      try {
        networks.push(await this.docker.createNetwork(opts));
      } catch (err) {
        throw err;
      }
    }

    if (networks.length === 0) {
      try {
        await this.docker.createNetwork({ 'Name': this.projectName + '_default', 'CheckDuplicate': true });
      } catch (err) {
        throw err;
      }
    }

    return networks;
  }


  async loadServices() {
    var services = [];
    var serviceNames = Object.keys(this.recipe.services || []);
    for (var serviceName of serviceNames) {
      var service = this.recipe.services[serviceName];

      var opts = {
        'name': this.projectName + '_' + serviceName,
        'Image': service.image,
        'HostConfig': this.buildHostConfig(service),
        'Env': this.buildEnvVars(service),
        "NetworkingConfig": {
          "EndpointsConfig": {
          }
        }
      };

      opts.NetworkingConfig.EndpointsConfig[this.projectName + '_default'] = {
        "IPAMConfig": {},
        "Links": [],
        "Aliases": [
          serviceName,
        ]
      };

      if (service.volumes) {
        opts['Volumes'] = {};
        for (var volume of service.volumes) {
          var v = volume.split(':');
          opts['Volumes'][v[1]] = {};
        }
      }

      if (service.name !== undefined) {
        opts.Name = serviceName;
      }
      try {
        var container = await this.docker.createContainer(opts);
        await container.start();
        services.push(container);
      } catch (err) {
        throw err;
      }
    }
    return services;
  }

  buildHostConfig(service) {
    var output = {
      'RestartPolicy': { 'Name': service.restart }
    };

    if (service.volumes) {
      output['Binds'] = service.volumes;
    }

    if (service.ports && service.ports.length > 0) {
      var ports = {};
      for (var portb of service.ports) {
        var p = portb.split(':');
        ports[p[1] + '/tcp'] = [{ 'HostPort': p[0] }]
      }
      output['PortBindings'] = ports;
    }

    return output;
  }
  buildEnvVars(service) {
    var output = [];

    var envsNames = Object.keys(service.environment || []);
    for (var envName of envsNames) {
      output.push(envName + '=' + service.environment[envName])
    }
    return output;
  }
}

module.exports = Compose;