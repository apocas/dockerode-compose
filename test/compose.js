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
        await new Promise(r => setTimeout(r, 2000));
        let listContainers = await docker.listContainers({ 'all': true });
        for (var containerInfo of listContainers) {
          if (containerInfo.Names[0].includes("dockerodec_wordpress")) {
            let container = docker.getContainer(containerInfo.Id);
            if (containerInfo.State == 'running')
              await container.stop();
            await container.remove();
          }
        }
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
        await new Promise(r => setTimeout(r, 5000));
        let listContainers = await docker.listContainers({ 'all': true });
        for (var containerInfo of listContainers) {
          if (containerInfo.Names[0].includes("dockerodec_complex")) {
            let container = docker.getContainer(containerInfo.Id);
            if (containerInfo.State == 'running')
              await container.stop();
            await container.remove();
          }
        }
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
        await new Promise(r => setTimeout(r, 5000));
        let listContainers = await docker.listContainers({ 'all': true });
        for (var containerInfo of listContainers) {
          if (containerInfo.Names[0].includes("dockerodec_build")) {
            let container = docker.getContainer(containerInfo.Id);
            if (containerInfo.State == 'running')
              await container.stop();
            await container.remove();
          }
        }
        done();
      })();
    });
    it("should do compose up example with build(verbose)", function (done) {
      this.timeout(300000);
      (async () => {
        var report = await compose_build.up({ 'verbose': true });
        expect(report.services).to.be.ok;
        await new Promise(r => setTimeout(r, 5000));
        let listContainers = await docker.listContainers({ 'all': true });
        for (var containerInfo of listContainers) {
          if (containerInfo.Names[0].includes("dockerodec_build")) {
            let container = docker.getContainer(containerInfo.Id);
            if (containerInfo.State == 'running')
              await container.stop();
            await container.remove();
          }
        }
        done();
      })();
    });
  });

});
