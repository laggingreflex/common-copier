#!/usr/bin/env node

const Path = require('path');
const yargs = require('yargs');
const untildify = require('untildify');
const modules = require('.');
const utils = require('./utils');

const tryCommand = fn => async argv => {
  try {
    await fn(argv);
    process.exit(0)
  } catch (error) {
    utils.handleError(error);
    process.exit(error.code || 1);
  }
}

const defaults = {
  ignored: ['.git', '*node_modules*', 'dist'],
  gitignore: ['.gitignore', '~/.gitignore'],
};

const options = {
  fileLimit: {
    description: 'Limit on number of files',
    default: 500,
  },
  timeLimit: {
    description: 'Limit on seconds spent',
    default: 10,
  },
  ignored: {
    description: 'dir(s)/file(s) to ignore (glob/wildcard)',
    alias: 'i',
    type: 'array',
    default: defaults.ignored,
  },
  gitignore: {
    description: 'choose/append --ignored files from .gitignore(-like) files',
    alias: 'gi',
    type: 'array',
    default: defaults.gitignore,
  },
  yes: {
    alias: 'y',
    description: `Don't prompt for confirmation`,
    type: 'boolean',
  },
  // confirm: {
  //   // Inferred from -y
  //   description: `Prompt for confirmation`,
  //   type: 'boolean',
  //   default: true,
  // },
  gitCheck: {
    description: 'Check for uncommitted changes',
    type: 'boolean',
    default: true,
  },
  dry: {
    description: 'Do not make any changes (dry run)',
    alias: 'd',
    type: 'boolean',
  },
};

const commandOptions = {
  commonDir: {
    description: '(From) common folder [required]',
  },
  projectDir: {
    description: '(To) project folder',
    default: '.',
  },
}

const commands = {
  link: {
    command: [
      '$0 <commonDir> [projectDir]',
      'link <commonDir> [projectDir]',
    ],
    describe: 'Link files from commonDir to projectDir',
    builder: yargs => yargs
      .positional('commonDir', commandOptions.commonDir)
      .positional('projectDir', commandOptions.projectDir),
    handler: tryCommand(argv => {
      commonArgvOp(argv);
      argv.commonDir = Path.resolve(untildify(argv.commonDir));
      argv.projectDir = Path.resolve(untildify(argv.projectDir));
      if (argv.commonDir === argv.projectDir) {
        throw new utils.Error(`commonDir and projectDir must be different ('${argv.commonDir}')`);
      }
      return require('./modules/link')(argv);
    })
  },
  unlink: {
    command: [
      'unlink [projectDir]',
      'u [projectDir]',
    ],
    describe: 'Link files from commonDir to projectDir',
    builder: yargs => yargs
      .positional('projectDir', commandOptions.projectDir),
    handler: tryCommand(argv => {
      commonArgvOp(argv);
      argv.projectDir = Path.resolve(untildify(argv.projectDir));
      return require('./modules/unlink')(argv);
    })
  }
}

function commonArgvOp(argv) {
  argv.confirm = !(argv.y || argv.yes);
  argv.defaults = defaults;
  return argv;
}

function HelpError(msg) {
  yargs.showHelp();
  throw new utils.Error(msg);
}

yargs.scriptName(require('./package').name);
yargs.options(options);
yargs.command(commands.link);
yargs.command(commands.unlink);
yargs.wrap(null);
yargs.argv;
