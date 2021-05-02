const tools = require('./tools');

module.exports = async function (docker, projectName, recipe, output) {
  var services = [];
  var serviceNames = tools.sortServices(recipe);
  for (var serviceName of serviceNames) {
    var networksToAttach = [];
    var service = recipe.services[serviceName];

    var opts = {
      'name': projectName + '_' + serviceName,
      'Image': service.image,
      'HostConfig': buildHostConfig(service),
      'Env': buildEnvVars(service),
      'NetworkingConfig': {
        'EndpointsConfig': {
        }
      }
    };

    if (service.networks !== undefined) {
      if (Array.isArray(service.networks)) {
        for (let index = 0; index < service.networks.length; index++) {
          let networkName = projectName + '_' + service.networks[index]
          let networkTemplate = {
            'NetworkingConfig': {
              'EndpointsConfig': {
              }
            }
          }
          networkTemplate.NetworkingConfig.EndpointsConfig[networkName] = {};
          networkTemplate.NetworkingConfig.EndpointsConfig[networkName]['Aliases'] = [serviceName]
          if (index === 0)
            opts.NetworkingConfig.EndpointsConfig = networkTemplate.NetworkingConfig.EndpointsConfig

          networksToAttach.push(networkTemplate.NetworkingConfig.EndpointsConfig)
        }
      } else {
        let networkNames = Object.keys(service.networks);
        for (let index = 0; index < networkNames.length; index++) {
          let network = service.networks[networkNames[index]] || {};
          let networkName = projectName + '_' + networkNames[index]
          let networkTemplate = {
            'NetworkingConfig': {
              'EndpointsConfig': {
              }
            }
          }
          networkTemplate.NetworkingConfig.EndpointsConfig[networkName] = {}
          networkTemplate.NetworkingConfig.EndpointsConfig[networkName]['IPAMConfig'] = {}
          if (network.aliases !== undefined) {
            networkTemplate.NetworkingConfig.EndpointsConfig[networkName]['Aliases'] = network.aliases
          }
          if (network.ipv4_address !== undefined) {
            networkTemplate.NetworkingConfig.EndpointsConfig[networkName].IPAMConfig['IPv4Address'] = network.ipv4_address
          }
          if (network.ipv6_address !== undefined) {
            networkTemplate.NetworkingConfig.EndpointsConfig[networkName].IPAMConfig['IPv6Address'] = network.ipv6_address
          }
          if (network.link_local_ips !== undefined) {
            networkTemplate.NetworkingConfig.EndpointsConfig[networkName].IPAMConfig['LinkLocalIPs'] = network.link_local_ips
          }
          if (network.priority !== undefined) {
            networkTemplate.NetworkingConfig.EndpointsConfig[networkName].priority = network.priority
          } else {
            networkTemplate.NetworkingConfig.EndpointsConfig[networkName].priority = 0
          }
          if (index === 0)
            opts.NetworkingConfig.EndpointsConfig = networkTemplate.NetworkingConfig.EndpointsConfig
          networksToAttach.push(networkTemplate.NetworkingConfig.EndpointsConfig)
        }
      }
    } else {
      opts.NetworkingConfig.EndpointsConfig[projectName + '_default'] = {
        'IPAMConfig': {},
        'Links': [],
        'Aliases': [
          serviceName,
        ]
      };
    }

    if (service.volumes) {
      opts['Volumes'] = {};
      for (var volume of service.volumes) {
        if (typeof volume === 'string' || volume instanceof String) {
          var v = volume.split(':');
          opts['Volumes'][v[1]] = {};
        } else {
          if (volume.target) {
            opts['Volumes'][volume.target] = {};
          }
        }
      }
    }

    if (service.name !== undefined) {
      opts.Name = serviceName;
    }
    try {
      var container = await docker.createContainer(opts);

      if (networksToAttach.length > 1) {
        let networkNames = Object.keys(networksToAttach[0]);
        let network = findNetwork(output, networkNames[0])
        await network.disconnect({ 'Container': container.id })
        let networksToAttachSorted = tools.sortNetworksToAttach(networksToAttach)
        for (var networkToAttach of networksToAttachSorted) {
          let networkName = Object.keys(networkToAttach);
          let network = findNetwork(output, networkName)
          await network.connect({ 'Container': container.id, 'EndpointConfig': networkToAttach[networkName] })
        }

      }
      await container.start();
      services.push(container);
    } catch (err) {
      throw err;
    }
  }
  return services;
}

//ToDo: complete the compose specification
var buildHostConfig = function (service) {
  var output = {
    'RestartPolicy': { 'Name': service.restart }
  };

  if (service.volumes) {
    output['Binds'] = [];

    for (var volume of service.volumes) {
      if (typeof volume === 'string' || volume instanceof String) {
        output['Binds'].push(volume);
      } else {
        var volumestr = '';
        if (volume.source && volume.target) {
          volumestr += volume.source + ':' + volume.target + ':';
        }
        if (volume.read_only) {
          volumestr += 'ro,';
        }
        if (volume.volume && volume.volume.nocopy) {
          volumestr += 'nocopy,';
        }
        if (volume.bind && volume.bind.propagation) {
          volumestr += volume.bind.propagation + ',';
        }
        volumestr = volumestr.slice(0, -1);
        output['Binds'].push(volumestr);
      }
    }
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

var buildEnvVars = function (service) {
  var output = [];

  var envsNames = Object.keys(service.environment || []);
  for (var envName of envsNames) {
    output.push(envName + '=' + service.environment[envName])
  }
  return output;
}


var findNetwork = function (output, name) {
  for (var network of output.networks) {
    if (network.name == name)
      return network.network
  }
}