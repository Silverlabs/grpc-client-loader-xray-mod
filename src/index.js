const AWSXRay = require('aws-xray-sdk');

module.exports = (args, metadata) => {
  let segment;
  try {
    segment = AWSXRay.getSegment();
  } catch (err) {
    // ignore if error occurs while getting segment
  }
  if (segment) {
    metadata.add('traceId', segment.trace_id);
    metadata.add('segmentId', segment.id);
  }
};
