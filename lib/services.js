const tools = require('./tools');
const fs = require('fs');

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

    // Can be used VolumesFrom from API DIRECTLY inside HostConfig :(
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
    if (service.stdin_open !== undefined) {
      opts.OpenStdin = service.stdin_open;
    }
    if (service.stop_grace_period !== undefined) {
      let period = parseInt(service.stop_grace_period)
      if (service.stop_grace_period == period) {
        opts.StopTimeout = service.stop_grace_period;
      } else if (service.stop_grace_period.includes('m') && service.stop_grace_period.includes('s')) {
        let minutes = parseInt(service.stop_grace_period.substring(0, service.stop_grace_period.indexOf('m')))
        let seconds = parseInt(service.stop_grace_period.substring(service.stop_grace_period.indexOf('m') + 1, service.stop_grace_period.indexOf('s')))
        opts.StopTimeout = (minutes * 60) + seconds
      } else {
        opts.StopTimeout = service.stop_grace_period.substring(0, service.stop_grace_period.length - 2)
      }
    }
    if (service.stop_signal !== undefined) {
      opts.StopSignal = service.stop_signal;
    }
    if (service.expose !== undefined) {
      var ports = {};
      for (var port of service.expose) {
        ports[port + '/tcp'] = {}
      }
      opts.ExposedPorts = ports;
    }
    if (service.tty !== undefined) {
      opts.Tty = service.tty;
    }
    if (service.user !== undefined) {
      opts.User = service.user;
    }
    if (service.working_dir !== undefined) {
      opts.WorkingDir = service.working_dir;
    }
    if (service.labels !== undefined) {
      if (service.labels.length > 0) {
        var labels = {};
        for (var labelsb of service.labels) {
          var p = labelsb.split('=');
          if (p[1] === undefined)
            p[1] = ''
          labels[p[0]] = p[1]
        }
        opts.Labels = labels
      } else {
        opts.Labels = service.labels
      }
    }
    if (service.healthcheck !== undefined) {
      let healthcheck = {};
      healthcheck.Test = service.healthcheck.test;
      healthcheck.Interval = convertFancyDurationToMs(service.healthcheck.interval);
      healthcheck.Timeout = convertFancyDurationToMs(service.healthcheck.timeout);
      healthcheck.Retries = service.healthcheck.retries;
      healthcheck.StartPeriod = convertFancyDurationToMs(service.healthcheck.start_period);
      opts.Healthcheck = healthcheck;
      console.log(opts.Healthcheck)
    }
    if (service.command !== undefined) {
      opts.Cmd = service.command;
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

  if (service.ports !== undefined) {
    if (typeof service.ports[0] === 'object') {
      // LONG SYNTAX
      // !!! INCOMPLETE - NOT USING DIFFERENT MODES - `mode`: `host` for publishing a host port on each node, or `ingress` for a port to be load balanced.
      var ports = {};
      for (var port of service.ports) {
        ports[port.target + '/' + port.protocol] = [{ 'HostPort': port.published.toString() }]
      }
      output['PortBindings'] = ports;
    } else {
      // SHORT SYNTAX
      // TODO: SIMPLIFY THIS BLOCK OF CODE! MAYBE!
      var ports = {};
      for (var port of service.ports) {

        var port_split = port.split(':');

        if (port_split.length == 2) {
          // "xxxx:xxxx"
          if (port_split[1].includes('-')) {
            // "9090-9091:8080-8081"
            let split_port_split0 = port_split[0].split('-');
            let split_port_split0_array = [];
            split_port_split0_array = fillPortArray(parseInt(split_port_split0[0]), parseInt(split_port_split0[1]))

            let split_port_split1 = port_split[1].split('-');
            let split_port_split1_array = [];
            split_port_split1_array = fillPortArray(parseInt(split_port_split1[0]), parseInt(split_port_split1[1]))

            for (index in split_port_split0_array) {
              ports[split_port_split1_array[index] + '/tcp'] = [{ 'HostPort': split_port_split0_array[index].toString() }];
            }

          } else if (port_split[0].includes('-')) {
            // "3000-3005"
            let split_port_split = port_split[0].split('-');
            ports[port_split[1] + '/tcp'] = [];
            for (let i = split_port_split[0]; i <= split_port_split[1]; i++) {
              ports[port_split[1] + '/tcp'].push({ 'HostPort': i.toString() });
            }

          } else if (port_split[1].includes('/')) {
            // "6060:6060/udp"
            ports[port_split[1]] = [{ 'HostPort': port_split[0] }];

          } else {
            // "8000:8000"
            ports[port_split[1] + '/tcp'] = [{ 'HostPort': port_split[0] }];

          }

        } else if (port_split.length == 3) {
          // "x.x.x.x:xxxx:xxxx"
          if (port_split[2].includes('-')) {
            // "127.0.0.1:5000-5010:5000-5010"
            let split_port_split1 = port_split[1].split('-');
            let split_port_split1_array = [];
            split_port_split1_array = fillPortArray(parseInt(split_port_split1[0]), parseInt(split_port_split1[1]))

            let split_port_split2 = port_split[2].split('-');
            let split_port_split2_array = [];
            split_port_split2_array = fillPortArray(parseInt(split_port_split2[0]), parseInt(split_port_split2[1]))

            for (index in split_port_split1_array) {
              ports[split_port_split2_array[index] + '/tcp'] = [{ 'HostPort': split_port_split1_array[index].toString(), 'HostIp': port_split[0] }];
            }

          } else if (port_split[1] == '') {
            // "127.0.0.1::5000
            ports[port_split[2] + '/tcp'] = [{ 'HostPort': port_split[2], 'HostIp': port_split[0] }];

          } else {
            // "127.0.0.1:8001:8001"
            ports[port_split[2] + '/tcp'] = [{ 'HostPort': port_split[1], 'HostIp': port_split[0] }];

          }

        } else {
          // "xxxx"
          if (port_split[0].includes('-')) {
            // "3000-3005"
            let split_port_split = port_split[0].split('-');
            for (let i = split_port_split[0]; i <= split_port_split[1]; i++) {
              ports[i + '/tcp'] = [{ 'HostPort': i.toString() }];
            }

          } else {
            // "3000"
            ports[port + '/tcp'] = [{ 'HostPort': port }];

          }

        }
      }
      output['PortBindings'] = ports;
      console.log(ports)
    }
  }

  if (service.cpu_count !== undefined) {
    output.CpuCount = service.cpu_count;
  }
  if (service.cpu_percent !== undefined) {
    output.CpuPercent = service.cpu_percent;
  }
  if (service.cpu_shares !== undefined) {
    output.CpuShares = service.cpu_shares;
  }
  if (service.cpu_period !== undefined) {
    output.CpuPeriod = service.cpu_period;
  }
  if (service.cpu_quota !== undefined) {
    output.CpuQuota = service.cpu_quota;
  }
  if (service.cpu_rt_runtime !== undefined) {
    output.CpuRealtimeRuntime = service.cpu_rt_runtime;
  }
  if (service.cpu_rt_period !== undefined) {
    output.CpuRealtimePeriod = service.cpu_rt_period;
  }
  if (service.cpuset !== undefined) {
    output.CpusetCpus = service.cpuset;
  }
  if (service.cap_add !== undefined) {
    output.CapAdd = service.cap_add;
  }
  if (service.cap_drop !== undefined) {
    output.CapDrop = service.cap_drop;
  }
  if (service.cgroup_parent !== undefined) {
    output.CgroupParent = service.cgroup_parent;
  }
  if (service.device_cgroup_rules !== undefined) {
    output.DeviceCgroupRules = service.device_cgroup_rules;
  }
  if (service.dns !== undefined) {
    output.Dns = service.dns;
  }
  if (service.dns_opt !== undefined) {
    output.DnsOptions = service.dns_opt;
  }
  if (service.dns_search !== undefined) {
    output.DnsSearch = service.dns_search;
  }
  if (service.extra_hosts !== undefined) {
    output.ExtraHosts = service.extra_hosts;
  }
  if (service.group_add !== undefined) {
    output.GroupAdd = service.group_add;
  }
  if (service.init !== undefined) {
    output.Init = service.init;
  }
  if (service.ipc !== undefined) {
    output.IpcMode = service.ipc;
  }
  if (service.isolation !== undefined) {
    output.Isolation = service.isolation;
  }
  if (service.mem_swappiness !== undefined) {
    output.MemorySwappiness = service.mem_swappiness;
  }
  if (service.oom_kill_disable !== undefined) {
    output.OomKillDisable = service.oom_kill_disable;
  }
  if (service.oom_score_adj !== undefined) {
    output.OomScoreAdj = service.oom_score_adj;
  }
  if (service.pid !== undefined) {
    output.PidMode = service.pid;
  }
  if (service.pids_limit !== undefined) {
    output.PidsLimit = service.pids_limit;
  }
  if (service.privileged !== undefined) {
    output.Privileged = service.privileged;
  }
  if (service.read_only !== undefined) {
    output.ReadonlyRootfs = service.read_only;
  }
  if (service.runtime !== undefined) {
    output.Runtime = service.runtime;
  }
  if (service.security_opt !== undefined) {
    output.SecurityOpt = service.security_opt;
  }
  if (service.shm_size !== undefined) {
    output.ShmSize = service.shm_size;
  }
  if (service.storage_opt !== undefined) {
    output.StorageOpt = service.storage_opt;
  }
  if (service.sysctls !== undefined) {
    if (service.sysctls.length > 0) {
      var sysctls = {};
      for (var sysctlsb of service.sysctls) {
        var p = sysctlsb.split('=');
        sysctls[p[0]] = p[1]
      }
      output.Sysctls = sysctls
    } else {
      let sysctlKeys = Object.keys(service.sysctls)
      let newSysctls = {}
      for (var key of sysctlKeys) {
        newSysctls[key] = service.sysctls[key].toString();
      }
      output.Sysctls = newSysctls
    }
  }
  if (service.userns_mode !== undefined) {
    output.UsernsMode = service.userns_mode;
  }
  if (service.tmpfs !== undefined) {
    if (Array.isArray(service.tmpfs)) {
      var tmpfs = {};
      for (var tmpfsb of service.tmpfs) {
        var p = tmpfsb.split(':');
        if (p[1] === undefined)
          p[1] = '';
        tmpfs[p[0]] = p[1];
      }
      output.Tmpfs = tmpfs;
    } else {
      var tmpfs = {};
      var p = service.tmpfs.split(':');
      if (p[1] === undefined)
        p[1] = '';
      tmpfs[p[0]] = p[1];
      output.Tmpfs = tmpfs;
    }
  }
  if (service.ulimits !== undefined) {
    let ulimitsKeys = Object.keys(service.ulimits);
    let ulimitsArray = []
    for (var key of ulimitsKeys) {
      let ulimitsObject = {}
      if (typeof service.ulimits[key] === 'object') {
        ulimitsObject.Name = key;
        ulimitsObject.Soft = service.ulimits[key].soft;
        ulimitsObject.Hard = service.ulimits[key].hard;
        ulimitsArray.push(ulimitsObject);
      } else {
        ulimitsObject.Name = key;
        ulimitsObject.Soft = service.ulimits[key];
        ulimitsObject.Hard = service.ulimits[key];
        ulimitsArray.push(ulimitsObject);
      }
    }
    output.Ulimits = ulimitsArray;
  }
  if (service.blkio_config !== undefined) {
    if (service.blkio_config.weight !== undefined) {
      output.BlkioWeight = service.blkio_config.weight;
    }
    if (service.blkio_config.weight_device !== undefined) {
      let weight_device = [{}];
      weight_device[0]['Path'] = service.blkio_config.weight_device[0].path;
      weight_device[0]['Weight'] = service.blkio_config.weight_device[0].weight;
      output.BlkioWeightDevice = weight_device;
    }
    if (service.blkio_config.device_read_bps !== undefined) {
      output.BlkioDeviceReadBps = convertSizeStringToByteValue(service.blkio_config.device_read_bps);
    }
    if (service.blkio_config.device_read_iops !== undefined) {
      let device_read_iops = [{}];
      device_read_iops[0]['Path'] = service.blkio_config.device_read_iops[0].path;
      device_read_iops[0]['Rate'] = service.blkio_config.device_read_iops[0].rate;
      output.BlkioDeviceReadIOps = device_read_iops;
    }
    if (service.blkio_config.device_write_bps !== undefined) {
      output.BlkioDeviceWriteBps = convertSizeStringToByteValue(service.blkio_config.device_write_bps);
    }
    if (service.blkio_config.device_write_iops !== undefined) {
      let device_write_iops = [{}];
      device_write_iops[0]['Path'] = service.blkio_config.device_write_iops[0].path;
      device_write_iops[0]['Rate'] = service.blkio_config.device_write_iops[0].rate;
      output.BlkioDeviceWriteIOps = device_write_iops;
    }
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

  if (service.env_file !== undefined) {
    if (Array.isArray(service.env_file)) {
      for (let env_file_path of service.env_file) {
        buildEnvVarsFromFile(env_file_path, output);
      }
    } else {
      buildEnvVarsFromFile(service.env_file, output);
    }
  }

  if (service.environment !== undefined) {
    var envsNames = Object.keys(service.environment);
    for (var envName of envsNames) {
      output.push(envName + '=' + service.environment[envName])
    }
  }
  return output;
}


var findNetwork = function (output, name) {
  for (var network of output.networks) {
    if (network.name == name)
      return network.network
  }
}

// TODO: OPTIMIZE!
var convertSizeStringToByteValue = function (obj) {
  let rate = obj[0].rate.toLowerCase();
  let new_obj = [{}];
  if (rate.includes('k')) {
    if (rate.indexOf('k') == rate.length - 1) {
      rate = rate.replace('k', '');
    } else if (rate.indexOf('k') == rate.length - 2) {
      rate = rate.replace('kb', '');
    }
    new_obj[0]['Path'] = obj[0].path;
    new_obj[0]['Rate'] = rate * 1024;
    return new_obj;
  } else if (rate.includes('m')) {
    if (rate.indexOf('m') == rate.length - 1) {
      rate = rate.replace('m', '');
    } else if (rate.indexOf('m') == rate.length - 2) {
      rate = rate.replace('mb', '');
    }
    new_obj[0]['Path'] = obj[0].path;
    new_obj[0]['Rate'] = rate * 1024 * 1024;
    return new_obj;
  } else if (rate.includes('g')) {
    if (rate.indexOf('g') == rate.length - 1) {
      rate = rate.replace('g', '');
    } else if (rate.indexOf('g') == rate.length - 2) {
      rate = rate.replace('gb', '');
    }
    new_obj[0]['Path'] = obj[0].path;
    new_obj[0]['Rate'] = rate * 1024 * 1024 * 1024;
    return new_obj;
  }
}

var buildEnvVarsFromFile = function (env_file_path, output) {
  // Each line in an env file MUST be in `VAR=VAL` format.
  try {
    let env_file = fs.readFileSync(env_file_path, 'utf8').toString().split('\n');
    for (let env_line of env_file) {
      // Lines beginning with `#` MUST be ignored. Blank lines MUST also be ignored.
      if (env_line != '' && env_line.indexOf('#') != 0) {
        let env_line_split = env_line.split('=');
        // `VAL` MAY be omitted, sin such cases the variable value is empty string. `=VAL` MAY be omitted, in such cases the variable is **unset**.
        if (env_line_split[0] != '' && env_line_split[1] != '') {
          output.push(env_line)
        }
      }
    }
  } catch (e) {
    throw e;
  }
}

var convertFancyDurationToMs = function (value) {
  let interval = parseInt(value)
  if (value == interval) {
    return value;
  } else if (value.includes('m') && value.includes('s')) {
    let minutes = parseInt(value.substring(0, value.indexOf('m')))
    let seconds = parseInt(value.substring(value.indexOf('m') + 1, value.indexOf('s')))
    return ((minutes * 60) + seconds) * 1000 * 1000000
  } else {
    return parseInt(value.substring(0, value.length - 2)) * 1000 * 1000000
  }
}

var fillPortArray = function (start, end) {
  return Array(end - start + 1).fill().map((_, idx) => start + idx)
}