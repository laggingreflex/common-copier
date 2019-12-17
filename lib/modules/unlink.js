const Path = require('path');
const fs = require('fs-extra');
const untildify = require('untildify');
const arrify = require('arrify');
const _ = require('lodash')
const { confirm } = require('enquire-simple');
const utils = require('../utils');
const fn = require('../functions');

module.exports = async config => {

  const dir = config.projectDir;
  await fn.gitCheck(dir, config);

  const ignored = await fn.processIgnores(config);

  const files = await fn.getFiles(dir, { ignored }, config);

  const links = await fn.filterLinks({ files, dir: dir });

  if (!links.length) {
    throw new utils.Error('No links found');
  }

  console.log(`${links.length} links will be broken`);
  utils.sampleLog(links, { prefix: '[link]' })

  if (config.dry || (config.confirm && !await confirm('Proceed', true))) {
    console.log('No changes were made.');
    return;
  }

  await Promise.all(links.map(file => unlink({ file, dir })));
  console.log('Done!');

}

async function unlink({ file, dir }) {
  const path = Path.resolve(dir, file);
  const contents = await fs.readFile(path);
  await fs.remove(path);
  await fs.writeFile(path, contents);
}