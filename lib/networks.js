module.exports = async function (docker, projectName, recipe) {
  var networks = [];
  var networkNames = Object.keys(recipe.networks || []);
  for (var networkName of networkNames) {
    var network = recipe.networks[networkName];
    if (network === null) {
      try {
        networks.push(await docker.createNetwork({ 'Name': projectName + '_' + networkName, 'CheckDuplicate': true }));
      } catch (err) {
        throw err;
      }
      continue
    }
    if (network.external === true) continue;
    var opts = {
      'Name': projectName + '_' + networkName,
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
      networks.push(await docker.createNetwork(opts));
    } catch (err) {
      throw err;
    }
  }

  if (networks.length === 0) {
    try {
      await docker.createNetwork({ 'Name': projectName + '_default', 'CheckDuplicate': true });
    } catch (err) {
      throw err;
    }
  }

  return networks;
}
