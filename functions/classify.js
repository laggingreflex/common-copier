const Path = require('path');
const fs = require('fs-extra');
const streamEqual = require('stream-equal');

module.exports = async (files, { commonDir, projectDir }) => {

  const common = file => Path.join(commonDir, file);
  const project = file => Path.join(projectDir, file);

  const different = [];
  const same = [];
  const noExist = [];

  await Promise.all(files.map(async (file) => {
    const commonFile = common(file);
    const projectFile = project(file);

    try {
      await fs.access(projectFile, fs.constants.F_OK)
    } catch (noop) {
      noExist.push(file);
      return;
    }

    if (await streamEqual(
        fs.createReadStream(commonFile),
        fs.createReadStream(projectFile)
      )) {
      same.push(file);
    } else {
      different.push(file);
    }
  }));

  return { different, same, noExist };
};