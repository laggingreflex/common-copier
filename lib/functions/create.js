const Path = require('path');
const fs = require('fs-extra');

module.exports = (files, { commonDir, projectDir }) => Promise.all(files.map(async (file) => {
  const commonFile = Path.join(commonDir, file);
  const projectFile = Path.join(projectDir, file);
  await fs.ensureDir(Path.dirname(projectFile));
  // console.log({file, projectDir});
  await fs.remove(projectFile);
  await fs.link(commonFile, projectFile);
}));