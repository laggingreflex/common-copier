const Path = require('path');
const Yargs = require('yargs');
const utils = require('./utils');

const defaults = {
  ignored: ['.git', '*node_modules*', 'dist'],
  gitignore: ['.gitignore', '~/.gitignore'],
};

const options = {
  commonDir: {
    description: '(From) common folder [required]',
    alias: 'c',
  },
  projectDir: {
    description: '(To) project folder',
    alias: 'p',
    default: '.',
  },
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

module.exports = async (argv = process.argv.slice(2)) => {
  const yargs = Yargs(argv).options(options).help();
  const { argv: config } = yargs;
  config.confirm = !(config.y || config.yes);
  if (!config.commonDir) {
    if (config._[0]) {
      config.commonDir = config._[0];
    } else {
      HelpError('Required argument missing: --common-dir="xxx", -c "xxx", or 1st argument');
    }
  }

  if (Path.resolve(config.commonDir) === Path.resolve(config.projectDir)) {
    throw new utils.Error(`commonDir and projectDir must be different ('${config.commonDir}' == '${config.projectDir}')`);
  }

  config.defaults = defaults;
  return config;

  function HelpError(msg) {
    yargs.showHelp();
    throw new utils.Error(msg);
  }

};