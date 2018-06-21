const Path = require('path');
const fs = require('fs-extra');

module.exports = (files, dir) => Promise.all(files.map(async file => {
  const stats = await fs.lstat(Path.resolve(dir, file));
  return stats.isSymbolicLink() && file;
})).then(files => files.filter(Boolean));
