const fs = require('fs');
const tar = require('tar-fs');
const path = require('path');
const stream = require('stream');

/**
 * if host path in the volume string (e.g. `./mylocal/file:/container/file`) is not absolute path,
 * this function will convert it to an absolute path using `cwd` (current working directory) parameter.
 * Otherwise, it will return volume string as it is.
 *
 * @param {*} volumeStr
 * @param {*} cwd
 */
function standardizeVolumeStr(volumeStr, cwd) {
  if (typeof volumeStr !== 'string' || volumeStr.length < 1) {
    return volumeStr;
  }
  volumeStr = volumeStr.trim();
  if (
    volumeStr.substring(0, 2) !== './' &&
    volumeStr.substring(0, 3) !== '../'
  ) {
    return volumeStr;
  }
  const parts = volumeStr.split(':');
  if (parts.length !== 2) {
    return volumeStr;
  }
  if (!cwd) {
    throw new Error(
      'Current working dir path not available when local path is a relative path: ' +
        parts[0]
    );
  }
  const localPath = parts[0];
  return path.resolve(cwd, localPath) + ':' + parts[1];
}

module.exports = {
  buildPorts: function (servicePorts, output) {
    var ports = {};
    if (typeof servicePorts[0] === 'object') {
      // LONG SYNTAX
      // !!! INCOMPLETE - NOT USING DIFFERENT MODES - `mode`: `host` for publishing a host port on each node, or `ingress` for a port to be load balanced.
      for (let port of servicePorts) {
        ports[port.target + '/' + port.protocol] = [
          { HostPort: port.published.toString() },
        ];
      }
      output['PortBindings'] = ports;
    } else {
      // SHORT SYNTAX
      // TODO: SIMPLIFY THIS BLOCK OF CODE! MAYBE!
      for (let port of servicePorts) {
        var port_split = port.split(':');

        if (port_split.length == 2) {
          // "xxxx:xxxx"
          if (port_split[1].includes('-')) {
            // "9090-9091:8080-8081"
            let split_port_split0 = port_split[0].split('-');
            let split_port_split0_array = [];
            split_port_split0_array = fillPortArray(
              parseInt(split_port_split0[0]),
              parseInt(split_port_split0[1])
            );

            let split_port_split1 = port_split[1].split('-');
            let split_port_split1_array = [];
            split_port_split1_array = fillPortArray(
              parseInt(split_port_split1[0]),
              parseInt(split_port_split1[1])
            );

            for (let index in split_port_split0_array) {
              ports[split_port_split1_array[index] + '/tcp'] = [
                {
                  HostPort: split_port_split0_array[index].toString(),
                },
              ];
            }
          } else if (port_split[0].includes('-')) {
            // "3000-3005"
            let split_port_split = port_split[0].split('-');
            ports[port_split[1] + '/tcp'] = [];
            for (let i = split_port_split[0]; i <= split_port_split[1]; i++) {
              ports[port_split[1] + '/tcp'].push({
                HostPort: i.toString(),
              });
            }
          } else if (port_split[1].includes('/')) {
            // "6060:6060/udp"
            ports[port_split[1]] = [{ HostPort: port_split[0] }];
          } else {
            // "8000:8000"
            ports[port_split[1] + '/tcp'] = [{ HostPort: port_split[0] }];
          }
        } else if (port_split.length == 3) {
          // "x.x.x.x:xxxx:xxxx"
          if (port_split[2].includes('-')) {
            // "127.0.0.1:5000-5010:5000-5010"
            let split_port_split1 = port_split[1].split('-');
            let split_port_split1_array = [];
            split_port_split1_array = fillPortArray(
              parseInt(split_port_split1[0]),
              parseInt(split_port_split1[1])
            );

            let split_port_split2 = port_split[2].split('-');
            let split_port_split2_array = [];
            split_port_split2_array = fillPortArray(
              parseInt(split_port_split2[0]),
              parseInt(split_port_split2[1])
            );

            for (let index in split_port_split1_array) {
              ports[split_port_split2_array[index] + '/tcp'] = [
                {
                  HostPort: split_port_split1_array[index].toString(),
                  HostIp: port_split[0],
                },
              ];
            }
          } else if (port_split[1] == '') {
            // "127.0.0.1::5000
            ports[port_split[2] + '/tcp'] = [
              { HostPort: port_split[2], HostIp: port_split[0] },
            ];
          } else {
            // "127.0.0.1:8001:8001"
            ports[port_split[2] + '/tcp'] = [
              { HostPort: port_split[1], HostIp: port_split[0] },
            ];
          }
        } else {
          // "xxxx"
          if (port_split[0].includes('-')) {
            // "3000-3005"
            let split_port_split = port_split[0].split('-');
            for (let i = split_port_split[0]; i <= split_port_split[1]; i++) {
              ports[i + '/tcp'] = [{ HostPort: i.toString() }];
            }
          } else {
            // "3000"
            ports[port + '/tcp'] = [{ HostPort: port }];
          }
        }
      }
      output['PortBindings'] = ports;
    }
  },

  //ToDo: complete the compose specification
  buildHostConfig: function (projectName, service, recipe, cwd) {
    var output = {
      RestartPolicy: { Name: service.restart },
    };

    if (service.volumes_from !== undefined) {
      for (var volume_from of service.volumes_from) {
        var vf = volume_from.split(':');
        var svf = recipe.services[vf[0]];
        this.buildVolumesHostconfig(
          projectName,
          svf.volumes,
          output,
          vf[1],
          cwd
        );
      }
    }

    if (service.volumes !== undefined) {
      this.buildVolumesHostconfig(
        projectName,
        service.volumes,
        output,
        undefined,
        cwd
      );
    }

    if (service.ports !== undefined) {
      this.buildPorts(service.ports, output);
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
          let p = sysctlsb.split('=');
          sysctls[p[0]] = p[1];
        }
        output.Sysctls = sysctls;
      } else {
        let sysctlKeys = Object.keys(service.sysctls);
        let newSysctls = {};
        for (let key of sysctlKeys) {
          newSysctls[key] = service.sysctls[key].toString();
        }
        output.Sysctls = newSysctls;
      }
    }
    if (service.userns_mode !== undefined) {
      output.UsernsMode = service.userns_mode;
    }
    if (service.tmpfs !== undefined) {
      var tmpfs = {};
      if (Array.isArray(service.tmpfs)) {
        for (var tmpfsb of service.tmpfs) {
          let p = tmpfsb.split(':');
          if (p[1] === undefined) {
            p[1] = '';
          }
          tmpfs[p[0]] = p[1];
        }
        output.Tmpfs = tmpfs;
      } else {
        let p = service.tmpfs.split(':');
        if (p[1] === undefined) {
          p[1] = '';
        }
        tmpfs[p[0]] = p[1];
        output.Tmpfs = tmpfs;
      }
    }
    if (service.ulimits !== undefined) {
      let ulimitsKeys = Object.keys(service.ulimits);
      let ulimitsArray = [];
      for (let key of ulimitsKeys) {
        let ulimitsObject = {};
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
        weight_device[0]['Weight'] =
          service.blkio_config.weight_device[0].weight;
        output.BlkioWeightDevice = weight_device;
      }
      if (service.blkio_config.device_read_bps !== undefined) {
        output.BlkioDeviceReadBps = convertSizeStringToByteValue(
          service.blkio_config.device_read_bps
        );
      }
      if (service.blkio_config.device_read_iops !== undefined) {
        let device_read_iops = [{}];
        device_read_iops[0]['Path'] =
          service.blkio_config.device_read_iops[0].path;
        device_read_iops[0]['Rate'] =
          service.blkio_config.device_read_iops[0].rate;
        output.BlkioDeviceReadIOps = device_read_iops;
      }
      if (service.blkio_config.device_write_bps !== undefined) {
        output.BlkioDeviceWriteBps = convertSizeStringToByteValue(
          service.blkio_config.device_write_bps
        );
      }
      if (service.blkio_config.device_write_iops !== undefined) {
        let device_write_iops = [{}];
        device_write_iops[0]['Path'] =
          service.blkio_config.device_write_iops[0].path;
        device_write_iops[0]['Rate'] =
          service.blkio_config.device_write_iops[0].rate;
        output.BlkioDeviceWriteIOps = device_write_iops;
      }
    }
    if (service.logging !== undefined) {
      let logging = {};
      logging.Type = service.logging.driver;
      logging.Config = service.logging.options;
      output.LogConfig = logging;
    }
    return output;
  },

  buildVolumesHostconfig: function (projectName, volumes, output, type, cwd) {
    if (output['Binds'] === undefined) {
      output['Binds'] = [];
    }
    for (var volume of volumes) {
      if (typeof volume === 'string' || volume instanceof String) {
        if (
          volume.substring(0, 2) === './' ||
          volume.substring(0, 3) === '../' ||
          volume[0] === '/'
        ) {
          const stdVolume = standardizeVolumeStr(volume, cwd);
          const aux = stdVolume;
          if (type == 'ro') {
            aux += ':ro';
          }
          output['Binds'].push(aux);
        } else {
          var aux = projectName + '_' + volume;
          if (type == 'ro') {
            aux += ':ro';
          }
          output['Binds'].push(aux);
        }
      } else {
        var volumestr = '';
        if (volume.source && volume.target) {
          if (
            volume.source.substring(0, 2) === './' ||
            volume.source.substring(0, 3) === '../' ||
            volume.source[0] === '/'
          ) {
            volumestr += standardizeVolumeStr(
              volume.source + ':' + volume.target,
              cwd
            );
          } else {
            volumestr +=
              projectName + '_' + volume.source + ':' + volume.target + ':';
          }
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
  },

  buildVolumes: function (volumes, opts) {
    if (opts['Volumes'] === undefined) {
      opts['Volumes'] = {};
    }
    for (var volume of volumes) {
      if (volume.substring(0, 2) === './' || volume[0] === '/') {
        continue;
      }
      if (typeof volume === 'string' || volume instanceof String) {
        var v = volume.split(':');
        opts['Volumes'][v[1]] = {};
      } else {
        if (volume.target) {
          opts['Volumes'][volume.target] = {};
        }
      }
    }
  },

  buildEnvVars: function (service) {
    var output = [];

    if (service.env_file !== undefined) {
      if (Array.isArray(service.env_file)) {
        for (let env_file_path of service.env_file) {
          this.buildEnvVarsFromFile(env_file_path, output);
        }
      } else {
        this.buildEnvVarsFromFile(service.env_file, output);
      }
    }

    if (service.environment !== undefined) {
      if (Array.isArray(service.environment)) {
        for (let environment_line of service.environment) {
          output.push(environment_line);
        }
      } else {
        var envsNames = Object.keys(service.environment);
        for (var envName of envsNames) {
          output.push(envName + '=' + service.environment[envName]);
        }
      }
    }
    return output;
  },

  buildNetworks: function (projectName, serviceName, serviceNetworks, networksToAttach, opts) {
    if (Array.isArray(serviceNetworks)) {
      for (let index = 0; index < serviceNetworks.length; index++) {
        let networkName = projectName + '_' + serviceNetworks[index];
        let networkTemplate = {
          NetworkingConfig: {
            EndpointsConfig: {},
          },
        };
        networkTemplate.NetworkingConfig.EndpointsConfig[networkName] = {};
        networkTemplate.NetworkingConfig.EndpointsConfig[networkName][
          'Aliases'
        ] = [serviceName];
        if (index === 0)
          opts.NetworkingConfig.EndpointsConfig =
            networkTemplate.NetworkingConfig.EndpointsConfig;

        networksToAttach.push(networkTemplate.NetworkingConfig.EndpointsConfig);
      }
    } else {
      let networkNames = Object.keys(serviceNetworks);
      for (let index = 0; index < networkNames.length; index++) {
        let network = serviceNetworks[networkNames[index]] || {};
        let networkName = projectName + '_' + networkNames[index];
        let networkTemplate = {
          NetworkingConfig: {
            EndpointsConfig: {},
          },
        };
        networkTemplate.NetworkingConfig.EndpointsConfig[networkName] = {};
        networkTemplate.NetworkingConfig.EndpointsConfig[networkName][
          'IPAMConfig'
        ] = {};
        if (network.aliases !== undefined) {
          networkTemplate.NetworkingConfig.EndpointsConfig[networkName][
            'Aliases'
          ] = network.aliases;
        }
        if (network.ipv4_address !== undefined) {
          networkTemplate.NetworkingConfig.EndpointsConfig[
            networkName
          ].IPAMConfig['IPv4Address'] = network.ipv4_address;
        }
        if (network.ipv6_address !== undefined) {
          networkTemplate.NetworkingConfig.EndpointsConfig[
            networkName
          ].IPAMConfig['IPv6Address'] = network.ipv6_address;
        }
        if (network.link_local_ips !== undefined) {
          networkTemplate.NetworkingConfig.EndpointsConfig[
            networkName
          ].IPAMConfig['LinkLocalIPs'] = network.link_local_ips;
        }
        if (network.priority !== undefined) {
          networkTemplate.NetworkingConfig.EndpointsConfig[
            networkName
          ].priority = network.priority;
        } else {
          networkTemplate.NetworkingConfig.EndpointsConfig[
            networkName
          ].priority = 0;
        }
        if (index === 0) {
          opts.NetworkingConfig.EndpointsConfig =
            networkTemplate.NetworkingConfig.EndpointsConfig;
        }
        networksToAttach.push(networkTemplate.NetworkingConfig.EndpointsConfig);
      }
    }
  },

  // TODO: OPTIMIZE!
  convertSizeStringToByteValue: function (obj) {
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
  },

  buildEnvVarsFromFile: function (env_file_path, output) {
    // Each line in an env file MUST be in `VAR=VAL` format.
    let env_file = fs
      .readFileSync(env_file_path, 'utf8')
      .toString()
      .split('\n');
    for (let env_line of env_file) {
      // Lines beginning with `#` MUST be ignored. Blank lines MUST also be ignored.
      if (env_line != '' && env_line.indexOf('#') != 0) {
        let env_line_split = env_line.split('=');
        // `VAL` MAY be omitted, sin such cases the variable value is empty string. `=VAL` MAY be omitted, in such cases the variable is **unset**.
        if (env_line_split[0] != '' && env_line_split[1] != '') {
          output.push(env_line);
        }
      }
    }
  },

  fillPortArray: function (start, end) {
    return Array(end - start + 1)
      .fill()
      .map((_, idx) => start + idx);
  },

  buildDockerImage: async function (
    docker,
    buildPath,
    obj,
    dockerfile,
    options
  ) {
    options = options || {};
    if (dockerfile !== null) {
      obj['dockerfile'] = path.basename(dockerfile);
      let streami = await docker.buildImage(
        {
          context: buildPath,
          src: [dockerfile],
        },
        obj
      );
      if (options.verbose === true) {
        streami.pipe(process.stdout);
      } else {
        streami.pipe(stream.PassThrough());
      }
      await new Promise((fulfill) => streami.once('end', fulfill));
    } else {
      var tarStream = tar.pack(buildPath);
      let streami = await docker.buildImage(tarStream, obj);
      if (options.verbose === true) {
        streami.pipe(process.stdout);
      } else {
        streami.pipe(stream.PassThrough());
      }
      await new Promise((fulfill) => streami.once('end', fulfill));
    }
  },
};
