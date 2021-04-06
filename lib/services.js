
const util = require('util')

module.exports = async function (docker, projectName, recipe) {
  var services = [];
  var serviceNames = Object.keys(recipe.services || []);
  for (var serviceName of serviceNames) {
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
      console.log(service.networks)
      if (Array.isArray(service.networks)) {
        if (service.networks.length > 1) {
          //if netowrks > 1 (It doesnt seem possible to start a container by connecting to multiple networks at once.)
          // To connect multiple networks "docker network connect" is used to connect additional networks.
          // have to attach the network after container creation
          // https://github.com/moby/moby/issues/29265 
        } else {
          for (var network of service.networks) {
            opts.NetworkingConfig.EndpointsConfig[network] = {};
            opts.NetworkingConfig.EndpointsConfig[network]['Aliases'] = [serviceName]
          }
        }
      } else {
        let networkNames = Object.keys(service.networks);
        if (networkNames.length > 1) {
          //if netowrks > 1 (It doesnt seem possible to start a container by connecting to multiple networks at once.)
          // To connect multiple networks "docker network connect" is used to connect additional networks.
          // have to attach the network after container creations
          // https://github.com/moby/moby/issues/29265
        } else {
          for (var networkName of networkNames) {
            let network = service.networks[networkName];
            opts.NetworkingConfig.EndpointsConfig[networkName] = {}
            if (network.aliases !== undefined) {
              opts.NetworkingConfig.EndpointsConfig[networkName]['Aliases'] = network.aliases
            }

            if (network.ipv4_address !== undefined) {
              opts.NetworkingConfig.EndpointsConfig[networkName]['IPv4Address'] = network.ipv4_address
            }

            if (network.ipv6_address !== undefined) {
              opts.NetworkingConfig.EndpointsConfig[networkName]['IPv6Address'] = network.ipv6_address
            }

            if (network.link_local_ips !== undefined) {
              opts.NetworkingConfig.EndpointsConfig[networkName]['LinkLocalIPs'] = network.link_local_ips
            }

            if (network.priority !== undefined) {
              //priority ??? - priority indicates in which order Compose implementation SHOULD connect the service’s containers to its networks. If unspecified, the default value is 0.
            }
          }
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
        var v = volume.split(':');
        opts['Volumes'][v[1]] = {};
      }
    }

    if (service.name !== undefined) {
      opts.Name = serviceName;
    }
    try {
      console.log(util.inspect(opts, { showHidden: false, depth: null }))
      var container = await docker.createContainer(opts);
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

var buildEnvVars = function (service) {
  var output = [];

  var envsNames = Object.keys(service.environment || []);
  for (var envName of envsNames) {
    output.push(envName + '=' + service.environment[envName])
  }
  return output;
}