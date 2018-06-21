const Git = require('simple-git/promise');
const { confirm } = require('enquire-simple');
const utils = require('../utils');

module.exports = async (config) => {
  if (!config.gitCheck) return;
  try {
    const git = Git(config.projectDir);
    const status = await git.status();
    if (status.files.length) {
      if (!(config.confirm && await confirm(`projectDir has uncommitted changes. Proceed anyway`, false))) {
        throw new utils.Error(`Aborted due to uncommitted local changes in the projectDir; commit/stash them or use --no-git-check`);
      }
    }
  } catch (error) {
    if (error instanceof utils.Error) throw error;
    if (!(config.confirm && await confirm(`Git check failed. Proceed anyway`, false))) {
      throw new utils.Error(`${error.message}\nGit command failed, use --no-git-check to avoid git check`);
    }
  }
}