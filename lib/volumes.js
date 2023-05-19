async function down(docker, projectName, recipe, output) {
  var volumes = [];
  var volumeNames = Object.keys(recipe.volumes || []);
  for (var volumeName of volumeNames) {
    try {
      var volume = await docker.getVolume(projectName + '_' + volumeName);
    } catch (e) {}

    try {
      await volume.remove();
    } catch (e) {}
  }
  return volumes;
}

async function up(docker, projectName, recipe, output) {
  var volumes = [];
  var volumeNames = Object.keys(recipe.volumes || []);
  for (var volumeName of volumeNames) {
    var volume = recipe.volumes[volumeName];
    if (volume === null) volume = {};
    if (volume.external === true) continue;
    var opts = {
      Name: projectName + '_' + volumeName,
      Driver: volume.driver,
      DriverOpts: volume.driver_opts,
      Labels: {
        ...volume.labels,
        ...{
          'com.docker.compose.project': projectName,
          'com.docker.compose.volume': volumeName,
        },
      },
    };
    if (volume.name !== undefined) {
      opts.Name = volume.name;
    }
    volumes.push(await docker.createVolume(opts));
  }
  return volumes;
}

module.exports = {
  down,
  up,
};
