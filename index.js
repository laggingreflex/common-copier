#!/usr/bin/env node

const Path = require('path');
const fs = require('fs-promise');
const _ = require('lodash');
const enquirer = require('enquire-simple');
const chokidar = require('chokidar');
const arrify = require('arrify');
const untildify = require('untildify');
const parseGitignore = require('parse-gitignore');
const minimatch = require('minimatch');
const wildstring = require('wildstring');
const streamEqual = require('stream-equal');
const copy = require('copy-concurrently');

const defaultIgnored = ['.git', '*node_modules*', 'dist'];
const defaultGitignore = ['.gitignore', '~/.gitignore'];

const Diff = require('diff');
const yargs = require('yargs')
  .option('common', {
    alias: 'c',
  })
  .option('project', {
    alias: 'p',
  })
  .option('ignored', {
    alias: 'i',
    type: 'array',
    default: defaultIgnored,
  })
  .option('gitignore', {
    alias: 'gi',
    type: 'array',
    default: defaultGitignore,
  })
  .option('confirm', {
    type: 'boolean',
    default: true,
  })
  .option('no-confirm', {
    alias: 'y',
    type: 'boolean',
  })
  .option('dry-run', {
    alias: 'd',
    type: 'boolean',
  })
  .option('help', {
    alias: ['h', '?'],
    type: 'boolean',
  })
  .argv

function usage() {
  console.log(`
    common-copier <from-common-folder> <to-project-folder> [options]

      -c, --common, 1st arg             From common folder
      -p, --project, 2nd arg            To project folder
      -i, --ignored                     dir(s)/file(s) to ignore (glob/wildcard)
                                        Default: ${defaultIgnored}
      -g, --gitignore                   choose/append --ignored files from .gitignore(-like) files
                                        Default: ${defaultGitignore}
      -y, --no-confirm                  Don't prompt for confirmation
      -d, --dry-run                     Do not make any changes
      -h, /?, --help                    Show this help message
  `);
}

if (yargs.help) {
  usage();
  process.exit(0);
}

const commonDir = yargs.common || yargs._[0];
const projectDir = yargs.project || yargs._[1];

if (!(commonDir && projectDir)) {
  usage();
  if (!commonDir) {
    console.error('Required argument missing: --common="xxx", -c "xxx", or 1st argument');
  }
  if (!projectDir) {
    console.error('Required argument missing: --project="xxx", -p "xxx", or 2nd argument');
  }
  process.exit(1);
}


let ignored = _.uniq(arrify(yargs.ignored.concat(defaultIgnored)));
const gitignore = _.uniq(arrify(yargs.gitignore.concat(defaultGitignore)))
  .map(untildify)
  .reduce((p, c) => {
    if (Path.isAbsolute(c)) {
      p.push(c)
    } else {
      p.push(
        Path.join(commonDir, c),
        Path.join(projectDir, c)
      )
    }
    return p;
  }, []);

ignored.push.apply(ignored, _.flatten(gitignore.map(parseGitignore)));
const antiIgnored = ignored.filter(i => i.charAt(0) === '!').map(i => i.substr(1));
ignored = ignored.filter(i => i.charAt(0) !== '!');

if (yargs.noConfirm) {
  yargs.confirm = false
}

const common = file => Path.join(commonDir, file);
const project = file => Path.join(projectDir, file);

function sampleLog(sample, { size = 10, prefix = ' ' } = {}) {
  _.sampleSize(sample, 10).forEach(f => console.log(prefix, f));
  if (sample.length > 10) {
    console.log(`  + ${sample.length-10} more`);
  }
}

function getFiles(dir) {
  const files = [];
  // const excludes = arrify(opts.excludes)
  // console.log(`excludes:`, { ignored });

  return new Promise((resolve, reject) => {
    const watcher = chokidar.watch(dir, { ignored, persistent: false, cwd: dir })
      .on('add', (path) => {
        if (ignored.some(e => path.includes(e) || minimatch(path, e) || wildstring.match(e, path))) {
          // console.log('Excluded', path);
          return;
        }
        // console.log('Added', path);
        files.push(path);
      })
      .on('ready', () => {
        watcher.close()
        resolve(files)
      })
  })

  return new Promise((resolve, reject) => klaw(dir)
    .on('data', ({ path, stats }) => {
      if (excludes.some(e => path.includes(e) || minimatch(path, e) || wildstring.match(e, path))) {
        if (!opts.verbose) {
          // console.log('Excluded', path);
        }
        return;
      }
      if (!opts.verbose) {
        console.log('Added', path);
      }
      files.push(path);
    })
    .on('end', () => resolve(files))
    .on('error', reject));
}

async function classify(files) {
  const different = [];
  const same = [];
  const noExist = [];

  await Promise.all(files.map(async(file) => {
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
}


async function create(files) {
  await Promise.all(files.map(async(file) => {
    const commonFile = common(file);
    const projectFile = project(file);
    const projectFileBaseDir = Path.dirname(projectFile);
    await fs.ensureDir(projectFileBaseDir);
    // console.log(file);
    await fs.remove(projectFile);
    await fs.link(commonFile, projectFile);
  }));
}

async function main() {
  console.log('Getting files...');
  const commonFiles = await getFiles(commonDir);
  console.log(`${commonFiles.length} files found`);
  console.log('Classifying...');
  const { different, same, noExist } = await classify(commonFiles);
  // console.log({ different: different.length, same: same.length, noExist: noExist.length, });

  const linkableFiles = same.concat(noExist);

  if (!linkableFiles.length) {
    console.log('Error: No linkable files found.');
    return;
  }

  if (different.length) {
    console.log(`${different.length} different files will be left untouched:`);
    sampleLog(different, { prefix: '  [diff]' })
  }
  if (same.length) {
    console.log(`${same.length} identical files will be linked:`);
    sampleLog(same, { prefix: '  [same]' })
  }
  if (noExist.length) {
    console.log(`${noExist.length} non-existing files will be linked:`);
    sampleLog(noExist, { prefix: '  [new] ' })
  }
  console.log('From:', Path.resolve('.', commonDir));
  console.log('To->:', Path.resolve('.', projectDir));

  if (yargs.dryRun || (yargs.confirm && !await enquirer.confirm('Proceed', true))) {
    console.log('No changes were made.');
    return;
  }

  await create(linkableFiles);
  console.log('Done!');
}

main().catch(console.error)
