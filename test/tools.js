const expect = require('chai').expect;
const tools = require('../lib/tools');
const yaml = require('js-yaml');
const fs = require('fs');

describe('tools', function () {

  describe('#sortservices', function () {
    it("should sort services", function (done) {
      var recipe = yaml.load(fs.readFileSync('./test/assets/depends.yml', 'utf8'));

      expect(tools.sortServices(recipe)).to.eql([
        'wordpress3',
        'db',
        'wordpress1',
        'wordpress2',
        'wordpress6',
        'wordpress4',
        'wordpress5'
      ]);
      done();
    });
  });

});
