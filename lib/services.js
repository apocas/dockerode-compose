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
      'HostConfig': buildHostConfig(service, recipe),
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

    if (service.volumes_from) {
      for (var volume_from of service.volumes_from) {
        var vf = volume_from.split(':');
        var svf = recipe.services[vf[0]];
        buildVolumes(svf.volumes, opts);
      }
    }

    if (service.volumes) {
      buildVolumes(service.volumes, opts);
    }

    if (service.name !== undefined) {
      opts.Name = service.container_name || serviceName;
    }
    if (service.domainname !== undefined) {
      opts.Domainname = service.domainname;
    }
    if (service.hostname !== undefined) {
      opts.Hostname = service.hostname;
    }
    if (service.mac_address !== undefined) {
      opts.MacAddress = service.mac_address;
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
var buildHostConfig = function (service, recipe) {
  var output = {
    'RestartPolicy': { 'Name': service.restart }
  };

  if (service.volumes_from) {
    for (var volume_from of service.volumes_from) {
      var vf = volume_from.split(':');
      var svf = recipe.services[vf[0]];
      buildVolumesHostconfig(svf.volumes, output, vf[1]);
    }
  }

  if (service.volumes) {
    buildVolumesHostconfig(service.volumes, output);
  }

  if (service.ports && service.ports.length > 0) {
    var ports = {};
    for (var portb of service.ports) {
      var p = portb.split(':');
      ports[p[1] + '/tcp'] = [{ 'HostPort': p[0] }]
    }
    output['PortBindings'] = ports;
  }

  if (service.cpu_count !== undefined) {
    opts.CpuCount = service.cpu_count;
  }
  if (service.cpu_percent !== undefined) {
    opts.CpuPercent = service.cpu_percent;
  }
  if (service.cpu_shares !== undefined) {
    opts.CpuShares = service.cpu_shares;
  }
  if (service.cpu_period !== undefined) {
    opts.CpuPeriod = service.cpu_period;
  }
  if (service.cpu_quota !== undefined) {
    opts.CpuQuota = service.cpu_quota;
  }
  if (service.cpu_rt_runtime !== undefined) {
    opts.CpuRealtimeRuntime = service.cpu_rt_runtime;
  }
  if (service.cpu_rt_period !== undefined) {
    opts.CpuRealtimePeriod = service.cpu_rt_period;
  }
  if (service.cpuset !== undefined) {
    opts.CpusetCpus = service.cpuset;
  }
  if (service.cap_add !== undefined) {
    opts.CapAdd = service.cap_add;
  }
  if (service.cap_drop !== undefined) {
    opts.CapDrop = service.cap_drop;
  }
  if (service.cgroup_parent !== undefined) {
    opts.CgroupParent = service.cgroup_parent;
  }
  if (service.device_cgroup_rules !== undefined) {
    opts.DeviceCgroupRules = service.device_cgroup_rules;
  }
  if (service.dns !== undefined) {
    opts.Dns = service.dns;
  }
  if (service.dns_opt !== undefined) {
    opts.DnsOptions = service.dns_opt;
  }
  if (service.dns_search !== undefined) {
    opts.DnsSearch = service.dns_search;
  }
  if (service.extra_hosts !== undefined) {
    opts.ExtraHosts = service.extra_hosts;
  }
  if (service.group_add !== undefined) {
    opts.GroupAdd = service.group_add;
  }
  if (service.init !== undefined) {
    opts.Init = service.init;
  }
  if (service.ipc !== undefined) {
    opts.IpcMode = service.ipc;
  }
  if (service.isolation !== undefined) {
    opts.Isolation = service.isolation;
  }
  if (service.mem_swappiness !== undefined) {
    opts.MemorySwappiness = service.mem_swappiness;
  }
  if (service.oom_kill_disable !== undefined) {
    opts.OomKillDisable = service.oom_kill_disable;
  }
  if (service.oom_score_adj !== undefined) {
    opts.OomScoreAdj = service.oom_score_adj;
  }
  if (service.pid !== undefined) {
    opts.PidMode = service.pid;
  }
  if (service.pids_limit !== undefined) {
    opts.PidsLimit = service.pids_limit;
  }

  return output;
}

var buildVolumesHostconfig = function (volumes, output, type) {
  if (output['Binds'] === undefined) {
    output['Binds'] = [];
  }
  for (var volume of volumes) {
    if (typeof volume === 'string' || volume instanceof String) {
      var aux = volume;
      if (type == 'ro') {
        aux += ':ro'
      }
      output['Binds'].push(aux);
    } else {
      var volumestr = '';
      if (volume.source && volume.target) {
        volumestr += volume.source + ':' + volume.target + ':';
      }
      if (volume.read_only || type == 'ro') {
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

var buildVolumes = function (volumes, opts) {
  if (opts['Volumes'] === undefined) {
    opts['Volumes'] = {};
  }
  for (var volume of volumes) {
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