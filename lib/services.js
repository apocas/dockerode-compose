
const util = require('util')

module.exports = async function (docker, projectName, recipe) {
  var services = [];
  var serviceNames = Object.keys(recipe.services || []);
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
      console.log(service.networks)
      if (Array.isArray(service.networks)) {
        if (service.networks.length > 1) {
          //if netowrks > 1 (It doesnt seem possible to start a container by connecting to multiple networks at once.)
          // To connect multiple networks "docker network connect" is used to connect additional networks.
          // have to attach the network after container creation
          // https://github.com/moby/moby/issues/29265 
          for (let index = 0; index < service.networks.length; index++) {
            let networkName = projectName + '_' + service.networks[index]
            if (index === 0) {
              opts.NetworkingConfig.EndpointsConfig[networkName] = {};
              opts.NetworkingConfig.EndpointsConfig[networkName]['Aliases'] = [serviceName]
            } else {
              let networkTemplate = {
                'NetworkingConfig': {
                  'EndpointsConfig': {
                  }
                }
              }
              networkTemplate.NetworkingConfig.EndpointsConfig[networkName] = {};
              networkTemplate.NetworkingConfig.EndpointsConfig[networkName]['Aliases'] = [serviceName]
              networksToAttach.push(networkTemplate)
            }
          }
        } else {
          let networkName = projectName + '_' + service.networks[0]
          opts.NetworkingConfig.EndpointsConfig[networkName] = {};
          opts.NetworkingConfig.EndpointsConfig[networkName]['Aliases'] = [serviceName]
        }
      } else {
        let networkNames = Object.keys(service.networks);
        if (networkNames.length > 1) {
          //if netowrks > 1 (It doesnt seem possible to start a container by connecting to multiple networks at once.)
          // To connect multiple networks "docker network connect" is used to connect additional networks.
          // have to attach the network after container creations
          // https://github.com/moby/moby/issues/29265
          for (let index = 0; index < networkNames.length; index++) {
            let network = service.networks[networkNames[index]];
            let networkName = projectName + '_' + networkNames[index]
            console.log(network)
            console.log(networkName)
            if (index === 0) {
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
            } else {
              let networkTemplate = {
                'NetworkingConfig': {
                  'EndpointsConfig': {
                  }
                }
              }
              networkTemplate.NetworkingConfig.EndpointsConfig[networkName] = {}
              if (network.aliases !== undefined) {
                networkTemplate.NetworkingConfig.EndpointsConfig[networkName]['Aliases'] = network.aliases
              }

              if (network.ipv4_address !== undefined) {
                networkTemplate.NetworkingConfig.EndpointsConfig[networkName]['IPv4Address'] = network.ipv4_address
              }

              if (network.ipv6_address !== undefined) {
                networkTemplate.NetworkingConfig.EndpointsConfig[networkName]['IPv6Address'] = network.ipv6_address
              }

              if (network.link_local_ips !== undefined) {
                networkTemplate.NetworkingConfig.EndpointsConfig[networkName]['LinkLocalIPs'] = network.link_local_ips
              }

              if (network.priority !== undefined) {
                //priority ??? - priority indicates in which order Compose implementation SHOULD connect the service’s containers to its networks. If unspecified, the default value is 0.
              }
              networksToAttach.push(networkTemplate)
            }
          }
        } else {
          for (var networkName of networkNames) {
            let network = service.networks[networkName];
            networkName = projectName + '_' + networkName
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
      // maybe its a good idea create a task queue to perform container creations and related stuff by order/priority.
      console.log(util.inspect(networksToAttach, { showHidden: false, depth: null }))
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