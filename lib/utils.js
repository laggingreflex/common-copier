const Path = require('path');
const OS = require('os');
const _ = require('lodash');

const utils = exports;

utils.cwd = (...path) => Path.join(process.cwd(), ...path);

utils.Error = class extends Error {};
utils.handleError = error => {
  if (error instanceof utils.Error) {
    // Don't need the stack
    console.error(error.message);
  } else {
    console.error(error);
  }
  // console.log('!!!!!!!!!?');
  process.exit(error.code || 1);
}

utils.sampleLog = (sample, { size = 10, prefix = ' ' } = {}) => {
  _.sampleSize(sample, 10).forEach(f => console.log(prefix, f));
  if (sample.length > 10) {
    console.log(`  + ${sample.length-10} more`);
  }
}

utils.delay = (delay = 1000, shouldReject = false) => new Promise((resolve, reject) => setTimeout(shouldReject ? reject.bind(null, shouldReject !== true ? shouldReject : new utils.Error(`Timed out (${delay/1000}s)`)) : resolve, delay));
utils.raceDelay = (promise, delay = 1000, reject = true) => Promise.race([promise, utils.delay(delay, reject)]);
