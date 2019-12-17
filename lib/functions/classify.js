const Path = require('path');
const fs = require('fs-extra');
const streamEqual = require('stream-equal');

module.exports = async (files, { commonDir, projectDir }) => {

  const common = file => Path.join(commonDir, file);
  const project = file => Path.join(projectDir, file);

  const different = [];
  const same = [];
  const noExist = [];
  const linked = [];

  await Promise.all(files.map(async (file) => {
    const projectFile = project(file);
    const commonFile = common(file);

    try {
      await fs.access(projectFile, fs.constants.F_OK)
    } catch (noop) {
      noExist.push(file);
      return;
    }

    const [projectFileStats, commonFileStats] = await Promise.all([
      fs.stat(projectFile),
      fs.stat(commonFile),
    ]);
    if (projectFileStats.ino === commonFileStats.ino) {
      linked.push(file);
      return;
    }

    const isStreamEqual = await streamEqual(
      fs.createReadStream(projectFile),
      fs.createReadStream(commonFile)
    );

    if (isStreamEqual) {
      same.push(file);
    } else {
      different.push(file);
    }
  }));

  return { different, same, noExist, linked };
};