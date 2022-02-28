const expect = require('chai').expect,
  assert = require('assert');

var compose = require('./spec_helper').compose;
var compose_complex = require('./spec_helper').compose_complex;
var compose_build = require('./spec_helper').compose_build;
var docker = require('./spec_helper').docker;

describe('compose', function () {

  describe('#pull', function () {
    it("should pull all needed images with verbose", function (done) {
      this.timeout(600000);
      (async () => {
        await compose.pull(null, { 'verbose': true });
        done();
      })();
    });

    it("should pull all needed images silently", function (done) {
      this.timeout(600000);
      (async () => {
        await compose.pull();
        done();
      })();
    });

    it("should pull all needed images returning streams", function (done) {
      this.timeout(600000);
      (async () => {
        var streams = await compose.pull(null, { 'streams': true });
        expect(streams).to.be.ok;
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
    afterEach('clean up', function (done) {
      this.timeout(60000);
      (async () => {
        await compose.down({ volumes: true });
        done();
      })();
    });
  });

  describe('#down', function () {
    beforeEach('bring up', function (done) {
      this.timeout(20000);
      (async () => {
        await compose.up();
        done();
      })();
    });
    it("should do compose down", function (done) {
      this.timeout(60000);
      (async () => {
        await compose.down({volumes: true});
        let listContainers = await docker.listContainers({ 'all': true, 'filters': {"label":[`com.docker.compose.project=${compose.projectName}`]}});
        expect(listContainers).to.be.empty
        let listVolumes  = await docker.listVolumes({ 'filters': {"label":[`com.docker.compose.project=${compose.projectName}`]}})
        expect(listVolumes.Volumes).to.be.empty
        expect(listVolumes.Warnings).to.be.null
        let listNetworks = await docker.listNetworks({ 'filters': {"label":[`com.docker.compose.project=${compose.projectName}`]}})
        expect(listNetworks).to.be.empty
        done();
      })();
    });
  });

  describe('#up_complex', function () {
    it("should do compose up complex example with extends and build", function (done) {
      this.timeout(300000);
      (async () => {
        var report = await compose_complex.up();
        expect(report.services).to.be.ok;
        done();
      })();
    });
    afterEach('clean up', function (done) {
      this.timeout(60000);
      (async () => {
        await compose_complex.down({ volumes: true });
        done();
      })();
    });
  });

  describe('#down_complex', function () {
    beforeEach('bring up', function (done) {
      this.timeout(300000);
      (async () => {
        await compose_complex.up();
        done();
      })();
    });
    it("should do compose down complex example with extends and build", function (done) {
      this.timeout(60000);
      (async () => {
        await compose_complex.down({volumes: true});
        let listContainers = await docker.listContainers({ 'all': true, 'filters': {"label":[`com.docker.compose.project=${compose.projectName}`]}});
        expect(listContainers).to.be.empty
        let listVolumes  = await docker.listVolumes({ 'filters': {"label":[`com.docker.compose.project=${compose.projectName}`]}})
        expect(listVolumes.Volumes).to.be.empty
        expect(listVolumes.Warnings).to.be.null
        let listNetworks = await docker.listNetworks({ 'filters': {"label":[`com.docker.compose.project=${compose.projectName}`]}})
        expect(listNetworks).to.be.empty
        done();
      })();
    });
  });

  describe('#up_build', function () {
    it("should do compose up example with build", function (done) {
      this.timeout(300000);
      (async () => {
        var report = await compose_build.up();
        expect(report.services).to.be.ok;
        done();
      })();
    });
    it("should do compose up example with build(verbose)", function (done) {
      this.timeout(300000);
      (async () => {
        var report = await compose_build.up({ 'verbose': true });
        expect(report.services).to.be.ok;
        done();
      })();
    });
    afterEach('clean up', function (done) {
      this.timeout(60000);
      (async () => {
        await compose_build.down({ volumes: true });
        done();
      })();
    });
  });

  describe('#down_build', function () {
    beforeEach('bring up', function (done) {
      this.timeout(300000);
      (async () => {
        await compose_build.up();
        done();
      })();
    });
    it("should do compose down example with build", function (done) {
      this.timeout(60000);
      (async () => {
        await compose_build.down({volumes: true});
        let listContainers = await docker.listContainers({ 'all': true, 'filters': {"label":[`com.docker.compose.project=${compose.projectName}`]}});
        expect(listContainers).to.be.empty
        let listVolumes  = await docker.listVolumes({ 'filters': {"label":[`com.docker.compose.project=${compose.projectName}`]}})
        expect(listVolumes.Volumes).to.be.empty
        expect(listVolumes.Warnings).to.be.null
        let listNetworks = await docker.listNetworks({ 'filters': {"label":[`com.docker.compose.project=${compose.projectName}`]}})
        expect(listNetworks).to.be.empty
        done();
      })();
    });
  });

});
