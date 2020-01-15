const OS = require('os');
const Path = require('path');

const homedir = OS.homedir();
const cwd = process.cwd();

const _ = exports;

_.noop = (...args) => {};

_.arrify = array => Array.isArray(array) ? array : array === undefined ? [] : [array];
_.unique = array => Array.from(new Set(array));
_.sample = function*(array, length = 1) {
  length = Math.min(length, array.length);
  const factor = array.length / length;
  for (let i = 0; i < length; i++) {
    yield array[Math.floor(i * factor)];
  }
};

_.try = (fn, onError = _.noop) => {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.catch(onError)
    } else return result;
  } catch (error) {
    return onError(error);
  }
};

_.UserError = class UserError extends Error {};
_.logError = error => {
  if (error.constructor.name === 'UserError') return console.error(error.message);
  console.error(error);
};

_.adjustPath = (path, { cwd: cwd_ = cwd, absolute = true, homedir: homedir_ = homedir, ...rest } = {}) => {
  if (typeof path !== 'string') throw new TypeError(`Expected a 'string', got '${typeof path}'`);
  path = homedir_ ? path.replace(/^~(?=$|\/|\\)/, homedir_) : path;
  if (cwd_ && !Path.isAbsolute(path) && absolute) path = Path.join(cwd_, path);
  for (const key in rest) {
    const replace = rest[key];
    const regex = new RegExp(`<${key}>`, 'ig');
    path = path.replace(regex, replace);
  }
  path = Path.join(path);
  return path;
};
