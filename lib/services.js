
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

    opts.NetworkingConfig.EndpointsConfig[projectName + '_default'] = {
      'IPAMConfig': {},
      'Links': [],
      'Aliases': [
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