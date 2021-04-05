const yaml = require('js-yaml');
const fs = require('fs');

class Compose {
  constructor(dockerode) {
    this.dockerode = dockerode;
  }

  compose(file) {
    try {
      const doc = yaml.load(fs.readFileSync(file, 'utf8'));
      console.log(doc);
    } catch (e) {
      console.log(e);
    }
  }
}

module.exports = Compose;