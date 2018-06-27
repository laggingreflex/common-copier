const Path = require('path');
const untildify = require('untildify');
const arrify = require('arrify');
const _ = require('lodash')
const { confirm } = require('enquire-simple');
const utils = require('../utils');
const fn = require('../functions');

module.exports = async config => {

  await fn.gitCheck(config.projectDir, config);

  const ignored = await fn.processIgnores(config);

  const commonFiles = await fn.getFiles(config.commonDir, { ignored }, config);

  console.log(`${commonFiles.length} files found`);
  console.log('Classifying...');
  const { different, same, noExist, linked } = await fn.classify(commonFiles, config);
  // console.log({ different: different.length, same: same.length, noExist: noExist.length });

  if (different.length) {
    console.log(`${different.length} different files will be left untouched:`);
    utils.sampleLog(different, { prefix: '  [diff]' })
  }
  if (linked.length) {
    console.log(`${linked.length} files are already linked:`);
    utils.sampleLog(linked, { prefix: '  [link]' })
  }
  if (same.length) {
    console.log(`${same.length} identical files will be linked:`);
    utils.sampleLog(same, { prefix: '  [same]' })
  }
  if (noExist.length) {
    console.log(`${noExist.length} non-existing files will be linked:`);
    utils.sampleLog(noExist, { prefix: '  [new] ' })
  }

  const linkableFiles = same.concat(noExist);
  if (!linkableFiles.length) {
    throw new utils.Error('No linkable files found');
  }

  console.log('From:', Path.resolve('.', config.commonDir));
  console.log('To->:', Path.resolve('.', config.projectDir));

  if (config.dry || (config.confirm && !await confirm('Proceed', true))) {
    console.log('No changes were made.');
    return;
  }

  await fn.create(linkableFiles, config);
  console.log('Done!');

}