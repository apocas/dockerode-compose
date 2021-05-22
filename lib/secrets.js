const fs = require('fs');

module.exports = async function (docker, projectName, recipe, output) {
  var secrets = [];
  var secretNames = Object.keys(recipe.secrets || []);
  for (var secretName of secretNames) {
    var secret = recipe.secrets[secretName];
    if (secret.external === true) continue;
    var opts = {
      'Name': projectName + '_' + secretName,
      'Data': fs.readFileSync(secret.file, 'utf8')
    };
    if (secret.name !== undefined) {
      opts.Name = secretName;
    }
    secrets.push(await docker.createSecret(opts));
  }
  return secrets;
}