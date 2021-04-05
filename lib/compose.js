const yaml = require('js-yaml');
const fs = require('fs');
const { nextTick } = require('process');

class Compose {
  constructor(dockerode) {
    this.docker = dockerode;
  }

  async compose(file, projectName) {
    var self = this;
    var output = {};
    if (projectName === undefined) {
      throw new Error('please specify a project name');
    }
    self.projectName = projectName;
    try {
      self.recipe = yaml.load(fs.readFileSync(file, 'utf8'));
      console.log(self.recipe);
      output.secrets = await self.loadSecrets();
      return output;
    } catch (e) {
      throw e;
    }
  }

  async loadSecrets() {
    var secrets = [];
    var secretNames = Object.keys(this.recipe.secrets);
    for (var secretName of secretNames) {
      var secret = this.recipe.secrets[secretName];
      if (secret.external === true) continue;
      var opts = {
        "Name": this.projectName + '_' + secretName,
        "Data": fs.readFileSync(secret.file, 'utf8')
      };
      if (secret.name !== undefined) {
        opts.Name = secretName;
      }
      try {
        secrets.push(await this.docker.createSecret(opts));
      } catch (err) {
        throw err;
      }
    }
    return secrets;
  }
}

module.exports = Compose;