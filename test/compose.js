const expect = require('chai').expect,
  assert = require('assert');

var compose = require('./spec_helper').compose;
var compose_complex = require('./spec_helper').compose_complex;
var compose_build = require('./spec_helper').compose_build;
var docker = require('./spec_helper').docker;

describe('compose', function () {

  describe('#pull', function () {
    it("should pull all needed images", function (done) {
      this.timeout(240000);
      (async () => {
        await compose.pull(null, { 'verbose': true });
        done();
      })();
    });
  });

  describe('#up', function () {
    it("should do compose up", function (done) {
      this.timeout(60000);
      (async () => {
        var report = await compose.up();
        expect(report.services).to.be.ok;
        done();
      })();
    });
  });

  describe('#up_complex', function () {
    it("should do compose up complex example with extends and build", function (done) {
      this.timeout(60000);
      (async () => {
        var report = await compose_complex.up();
        expect(report.services).to.be.ok;
        done();
      })();
    });
  });

  describe('#up_build', function () {
    it("should do compose up example with build", function (done) {
      this.timeout(60000);
      (async () => {
        var report = await compose_build.up();
        expect(report.services).to.be.ok;
        done();
      })();
    });
  });

});
