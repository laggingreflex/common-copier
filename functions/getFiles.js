const chokidar = require('chokidar');
const minimatch = require('minimatch');
const wildstring = require('wildstring');
const utils = require('../utils');

module.exports = (dir, { ignored }, config) => new Promise(async (resolve, reject) => {
  const files = [];
  const watcher = chokidar.watch(dir, { ignored, persistent: false, cwd: dir });

  watcher.on('error', reject);

  watcher.on('add', path => {

    if (files.length > config.fileLimit) {
      reject(new utils.Error(`Exceeded --file-limit=${config.fileLimit}`));
      watcher.close();
      return;
    }
    if (ignored.some(e => path.includes(e) || minimatch(path, e) || wildstring.match(e, path))) {
      // console.log('Excluded', path);
      return;
    }
    // console.log('Added', path);
    files.push(path);
  });

  try {
    await utils.raceDelay(new Promise(_ => watcher.on('ready', _)), config.timeLimit * 1000, new utils.Error(`Exceeded --time-limit=${config.timeLimit}`));
  } catch (error) {
    reject(error);
  }
  resolve(files);
  watcher.close();
});
