const path = require('path');
const assert = require('assert');
const AWSXRay = require('aws-xray-sdk');
const Grpcx = require('@silverlabs/grpcx');
const grpcClientLoader = require('@silverlabs/grpc-client-loader');

const mod = require('../src');

describe('xray mod', () => {
  it('does not do anything if no segment is found', async () => {
    let server;
    afterEach(() => {
      server.forceShutdown();
    });

    const app = new Grpcx({
      protoFile: path.join(__dirname, 'example.proto'),
    });
    const obj = {};
    app.use((call, callback, next) => {
      obj.traceId = call.metadata.get('traceId').toString();
      obj.segmentId = call.metadata.get('segmentId').toString();
      return next();
    });
    app.use('hello', ({ name }) => ({ message: `Hello ${name}` }));
    server = await app.listen(3456);

    const clients = grpcClientLoader({
      connStr: 'localhost:3456',
      dirPath: __dirname,
      mods: [mod],
    });
    await clients.example.hello({ name: 'test' });
    assert.equal(obj.traceId, '');
    assert.equal(obj.segmentId, '');
  });

  it('sends segmentId and traceId as metadata when segment is found', async () => {
    let server;
    afterEach(() => {
      server.forceShutdown();
    });

    const app = new Grpcx({
      protoFile: path.join(__dirname, 'example.proto'),
    });
    const obj = {};
    app.use((call, callback, next) => {
      obj.traceId = call.metadata.get('traceId').toString();
      obj.segmentId = call.metadata.get('segmentId').toString();
      return next();
    });
    app.use('hello', ({ name }) => ({ message: `Hello ${name}` }));
    server = await app.listen(3456);

    const clients = grpcClientLoader({
      connStr: 'localhost:3456',
      dirPath: __dirname,
      mods: [mod],
    });
    const ns = AWSXRay.getNamespace();
    const segment = new AWSXRay.Segment('test');
    await ns.runAndReturn(() => {
      AWSXRay.setSegment(segment);
      return clients.example.hello({ name: 'test' });
    });
    assert.equal(obj.traceId, segment.trace_id);
    assert.equal(obj.segmentId, segment.id);
  });
});
